import { emulateImportMap } from "./util-emulate-importmap.js";

export async function resolveImportContentBrowser(moduleInfo = {}) {
	let {mode, path } = moduleInfo;
	if(mode !== "url") {
		return;
	}

	let f = await fetch(path);
	let content = await f.text();
	return content;
}

export async function preprocessBrowser(codeStr, { resolved }) {
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