
import fs from "node:fs";
import { ImportTransformer } from "esm-import-transformer";

// Vite error (even though this file isn’t used in-browser)
// import { fileURLToPath } from "node:url";

function emulateImportMap(code, importMap) {
	// TODO re-use ast?
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}

export async function preprocess(codeStr, { resolved }) {
	let importMap = {
		imports: {}
	};

	for(let res of resolved) {
		if(res.target) {
			importMap.imports[res.name] = res.target;
		}
	}

	if(Object.keys(importMap?.imports || {}).length > 0) {
		return emulateImportMap(codeStr, importMap);
	}
}

export async function resolveImportContent(moduleInfo = {}) {
	let {mode, path} = moduleInfo;
	if(mode !== "fs") {
		return;
	}

	if(path.startsWith("file:///")) {
		// dynamic import to avoid Vite warning (see above)
		const { fileURLToPath } = await import("node:url");
		path = fileURLToPath(path);
	}

	return fs.readFileSync(path, "utf8");
}