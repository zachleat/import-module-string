import { parseCode } from "./src/parse-code.js";
import { walkCode } from "./src/walk-code.js";
import { stringifyData } from "./src/stringify-data.js";
import { getModuleInfo } from "./src/resolve.js";
import { getTarget, getTargetDataUri } from "./src/url.js";

export { parseCode, walkCode, getTarget, getTargetDataUri, getModuleInfo };

// Keep this function in root (not `src/resolve.js`) to maintain for-free root relative import.meta.url
export function resolveModule(ref) {
	// Supported in Node v20.6.0+, v18.19.0+, Chrome 105, Safari 16.4, Firefox 106
	if(!("resolve" in import.meta)) {
		// We *could* return Boolean when import.meta.resolve is not supported
		// return true would mean that a browser with an Import Map *may* still resolve the module correctly.
		// return false would mean that this module would be skipped

		// Supports `import.meta.resolve` vs Import Maps
		//   Chrome 105 vs 89
		//   Safari 16.4 vs 16.4
		//   Firefox 106 vs 108

		// Vitest issue with import.meta.resolve https://github.com/vitest-dev/vitest/issues/6953
		throw new Error(`\`import.meta.resolve\` is not available.`);
	}

	// Notes about Node:
	//   - `fs` resolves to `node:fs`
	//   - `resolves` with all Node rules about node_modules
	// Works with import maps when supported
	return import.meta.resolve(ref);
}

function getAdapter(ref) {
	if(ref === "fetch") {
		// dynamic import not necessary here but we use it for consistency
		return import("./src/adapter-fetch.js");
	} else if(ref === "fs") {
		// dynamic import here to avoid Vite bundler with `fs` on client errors
		return import("./src/adapter-fs.js");
	}

	// Supported adapter functions (async-friendly)
	// resolveImportContent: (specifier) { return code },
	// preprocess: (code) { return code }

	if(ref?.resolveImportContent || ref?.preprocess) {
		return ref;
	}
}

export async function getCode(codeStr, options = {}) {
	let { ast, acornOptions, data, filePath, implicitExports, adapter, addRequire } = Object.assign({
		data: {},
		filePath: undefined,
		implicitExports: true, // add `export` if no `export` is included in code

		adapter: undefined,
		addRequire: false, // add polyfill for `require()` (Node-only)

		// Internal
		ast: undefined,
		acornOptions: {}, // see defaults in walk-code.js
	}, options);

	ast ??= parseCode(codeStr, acornOptions);

	let { globals, features, imports } = walkCode(ast);

	let resolved = Array.from(imports).map(u => getModuleInfo(u, filePath));

	if(adapter) {
		let adapterImplementation = await getAdapter(adapter);
		if(adapterImplementation) {
			let { resolveImportContent, preprocess } = adapterImplementation;

			// Important: Node supports importing builtins here, this adds support for resolving non-builtins
			if(typeof resolveImportContent === "function") {
				for(let moduleInfo of resolved) {
					let content = await resolveImportContent(moduleInfo);
					if(content) {
						let code = await getCode(content, {
							filePath: moduleInfo.path,
							adapter,
						});

						if(code?.trim()) {
							// This needs to be `getTargetDataUri` in-browser (even though it supports Blob urls).
							moduleInfo.target = await getTargetDataUri(code);
						}
					}
				}
			}

			if(typeof preprocess === "function") {
				let result = await preprocess(codeStr, { globals, features, imports, resolved });
				if(typeof result === "string") {
					codeStr = result;
				}
			}
		}
	}

	let pre = [];
	let post = [];

	// When filePath is specified, we supply import.meta.url
	if(filePath && features.importMetaUrl) {
		codeStr = codeStr.replaceAll("import.meta.url", "__importmetaurl"); // same length as import.meta.url
		data.__importmetaurl = filePath;
	}

	pre.push(stringifyData(data));

	if(addRequire) {
		pre.push(`import { createRequire } from "node:module";\nconst require = createRequire("${filePath || "/"}");\n`);
	}

	// don’t add `export { ...globals }` if the code is *already* using `export`
	if(implicitExports && !features.export && globals.size > 0) {
		post.push(`export { ${Array.from(globals).join(", ")} }`);
	}

	let transformedCode = pre.join("\n") + codeStr + (post.length > 0 ? `\n${post.join("\n")}` : "");
	return transformedCode;
};

// Thanks https://stackoverflow.com/questions/57121467/import-a-module-from-string-variable
export async function importFromString(codeStr, options = {}) {
	let code = await getCode(codeStr, options);
	let target = await getTarget(code);

	// createObjectURL and revokeObjectURL are Node 16+
	// https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static

	// Needed for Vitest in browser :(
	if(Boolean(globalThis['__vitest_browser__'])) {
		return import(/* @vite-ignore */URL.createObjectURL(target));
	}

	if(target instanceof Blob) {
		let url = URL.createObjectURL(target);
		return import(/* @vite-ignore */url).then(mod => {
			URL.revokeObjectURL(url);
			return mod;
		});
	}

	// Promise
	return import(/* @vite-ignore */target);
}
