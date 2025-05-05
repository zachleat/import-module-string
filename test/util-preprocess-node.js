
import fs from "node:fs";
import { ImportTransformer } from "esm-import-transformer";

import { getCode, getTarget } from "../import-module-string.js"

async function generateImportMap(resolvedImports, preprocess) {
	let importMap = {
		imports: {}
	};

	for(let { name, path } of resolvedImports.filter(i => i.mode === "fs")) {
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

function emulateImportMap(code, importMap) {
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}