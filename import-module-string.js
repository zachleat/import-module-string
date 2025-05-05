import { parseCode } from "./src/parse-code.js";
import { walkCode } from "./src/walk-code.js";
import { stringifyData } from "./src/stringify-data.js";
import { importFromBlob } from "./src/supports.js";
import { getModuleInfo } from "./src/resolve.js";

// async but we await for it below (no top-level await for wider compat)
const SUPPORTS_BLOB_IMPORT = importFromBlob();

export { getModuleInfo };

export { parseCode, walkCode };

async function generateImportMap(importModuleInfo) {
	const { default: fs } = await import("node:fs");

	let importMap = {
		imports: {}
	};

	// TODO Promise.all
	for(let { name, path } of importModuleInfo) {
		let content = fs.readFileSync(path, "utf8");
		let code = await getCode(content, {
			filePath: path,
			inlineRelativeReferences: true,
			// implicitExports: true,
			// addRequire: false,
		});
		importMap.imports[name] = await getTarget(code)
	}

	return importMap;
}

// TODO memoize
async function transformImports(codeStr, importMap) {
	const { ImportTransformer } = await import("esm-import-transformer");
	let tf = new ImportTransformer(codeStr);
	return tf.transformWithImportMap(importMap);
}

function getExportsCode(globals) {
	// already makes use of `export` so we defer to this!
	if(!globals || globals.size === 0) {
		return "";
	}

	return `export { ${Array.from(globals).join(", ")} }`;
}

export async function getCode(codeStr, options = {}) {
	let { ast, acornOptions, data, filePath, implicitExports, addRequire, inlineRelativeReferences } = Object.assign({
		data: {},
		filePath: undefined,
		implicitExports: true, // add `export` if no `export` is included in code
		addRequire: false, // add polyfill for `require()` (Node-only)
		inlineRelativeReferences: false, // read relative referenced scripts and inline (this is a bundler now)

		ast: undefined,
		acornOptions: {}, // see defaults in walk-code.js
	}, options);

	ast ??= parseCode(codeStr, acornOptions);

	let { globals, features, imports } = walkCode(ast);

	// Important: Node supports importing builtins here, this adds support for resolving non-builtins
	if(inlineRelativeReferences) {
		let importModuleInfo = Array.from(imports).map(u => getModuleInfo(u));

		// Has imports that can be mapped to the file system
		if(importModuleInfo.filter(i => i.mode === "fs").length > 0) {
			let importMap = await generateImportMap(importModuleInfo);
			codeStr = await transformImports(codeStr, importMap);
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
	if(implicitExports && !features.export) {
		post.push(getExportsCode(globals));
	}

	let transformedCode = pre.join("\n") + codeStr + (post.length > 0 ? `\n${post.join("\n")}` : "");
	return transformedCode;

};

export async function getTarget(codeStr) {
	if(await SUPPORTS_BLOB_IMPORT) {
		// Node 15.7+
		return new Blob([codeStr], { type: "text/javascript" });
	}

	// Node can’t do import(Blob) yet https://github.com/nodejs/node/issues/47573
	return `data:text/javascript;charset=utf-8,${encodeURIComponent(codeStr)}`;
}

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

// TODO add import from file
// export async function importFromFile(filePath, options = {}) {}
