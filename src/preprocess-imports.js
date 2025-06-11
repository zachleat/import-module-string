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

export async function preprocess(codeStr, { resolved }) {
	let importMap = {
		imports: {}
	};

	for(let {path, name, target, isMetaResolved} of resolved) {
		if(target) { // from `resolveImportContent` when overriding how content is fetched (preferred to meta resolved targets)
			importMap.imports[name] = target;
		} else if(isMetaResolved) { // resolved path
			importMap.imports[name] = path;
		}
	}

	if(Object.keys(importMap?.imports || {}).length > 0) {
		return emulateImportMap(codeStr, importMap);
	}
}
