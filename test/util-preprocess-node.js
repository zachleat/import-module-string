
import fs from "node:fs";
// Vite error (even though this file isn’t used in-browser)
// import { fileURLToPath } from "node:url";
import { emulateImportMap } from "./util-emulate-importmap.js";

export async function preprocessNode(codeStr, { resolved }) {
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

export async function resolveImportContentNode(moduleInfo = {}) {
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