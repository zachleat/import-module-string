import { ImportTransformer } from "esm-import-transformer";

// in-browser `emulateImportMap` *could* be a dynamically inserted
// Import Map some day (though not yet supported in Firefox):
// https://github.com/mdn/mdn/issues/672

export async function preprocess(codeStr, { resolved, ast }) {
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
		let transformer = new ImportTransformer(codeStr, ast);
		let code = transformer.transformWithImportMap(importMap);
		return code;
	}
}
