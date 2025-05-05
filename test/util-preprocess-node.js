
import fs from "node:fs";
// import { fileURLToPath } from "node:url";
import { emulateImportMap } from "./util-emulate-importmap.js";

import { getCode, getTarget } from "../import-module-string.js"

async function generateImportMap(resolvedImports, preprocess) {
	// dynamic import to avoid Vite warning
	const { fileURLToPath } = await import("node:url");

	let importMap = {
		imports: {}
	};

	for(let { name, path } of resolvedImports.filter(i => i.mode === "fs")) {
		if(path.startsWith("file:///")) {
			path = fileURLToPath(path);
		}

		let content = fs.readFileSync(path, "utf8");
		let code = await getCode(content, {
			filePath: path,
			preprocess,
			// implicitExports: true,
			// addRequire: false,
		});

		importMap.imports[name] = await getTarget(code)
	}

	return importMap;
}

export async function preprocessNode(codeStr, { preprocess, imports, resolved }) {
	let importMap = await generateImportMap(resolved, preprocess);
	if(Object.keys(importMap?.imports || {}).length > 0) {
		return emulateImportMap(codeStr, importMap);
	}
}
