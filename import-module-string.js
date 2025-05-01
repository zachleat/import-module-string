import { parseCode } from "./src/parse-code.js";
import { walkCode } from "./src/walk-code.js";
import { stringifyData } from "./src/stringify-data.js";

function getExportsCode(globals) {
	// already makes use of `export` so we defer to this!
	if(!globals || globals.size === 0) {
		return "";
	}

	return `export { ${Array.from(globals).join(", ")} }`;
}

export { parseCode, walkCode };

// Thanks https://stackoverflow.com/questions/57121467/import-a-module-from-string-variable
export async function importFromString(content, options = {}) {
	let { data, addRequire, ast, acornOptions, filePath } = Object.assign({
		data: {},
		filePath: undefined,
		addRequire: false,
		ast: undefined,
		acornOptions: {}, // see defaults in walk-code.js
	}, options);

	ast ??= parseCode(content, acornOptions);

	let { globals, features, /* imports */ } = walkCode(ast);

	let pre = [];
	let post = [];

	// When filePath is specified, we supply import.meta.url
	if(filePath && features.importMetaUrl) {
		content = content.replaceAll("import.meta.url", "__importmetaurl"); // same length
		data.__importmetaurl = filePath;
	}

	pre.push(stringifyData(data));

	if(addRequire) {
		pre.push(`import { createRequire } from "node:module";\nconst require = createRequire("/");\n`);
	}


	// don’t add `export { ...globals }` if the code is *already* using `export`
	if(!features.export) {
		post.push(getExportsCode(globals));
	}

	let transformed = pre.join("\n") + content + (post.length > 0 ? `\n${post.join("\n")}` : "");
	let target;

	// Weak feature test for Node.js that isn’t tied to process.env (trying to avoid CLI access warnings in Deno)
	if(typeof __dirname !== "undefined" && typeof __filename !== "undefined") {
		// Node can’t do import(Blob) yet https://github.com/nodejs/node/issues/47573
		target = `data:text/javascript;charset=utf-8,${encodeURIComponent(transformed)}`;
	} else {
		// Node 15.7+
		target = new Blob([transformed], { type: "text/javascript" });
	}

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
