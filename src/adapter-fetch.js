import { ImportTransformer } from "esm-import-transformer";

// in-browser `emulateImportMap` *could* be a dynamically inserted
// Import Map some day (though not yet supported in Firefox):
// https://github.com/mdn/mdn/issues/672

function emulateImportMap(code, importMap) {
	// TODO re-use ast?
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}

export async function resolveImportContent(moduleInfo = {}) {
	let {mode, path} = moduleInfo;
	if(mode !== "url") {
		return;
	}

	let f = await fetch(path);
	let content = await f.text();
	return content;
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