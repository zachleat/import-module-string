import { ImportTransformer } from "esm-import-transformer";
import { getCode, getTargetDataUri } from "../import-module-string.js"

// in-browser `emulateImportMap` could be a dynamically inserted Import Map (though not yet supported in Firefox)
// let importMap = {
// 	imports: {
// 		"@zachleat/noop": "https://unpkg.com/@zachleat/noop@1.0.4/index.js"
// 	}
// };
// let s = document.createElement("script");
// s.type = "importmap";
// s.innerHTML = JSON.stringify(importMap);
// document.body.appendChild(s);

async function generateImportMap(resolvedImports) {
	let importMap = {
		imports: {}
	};

	for(let { name, path } of resolvedImports.filter(i => i.mode === "url")) {
		let f = await fetch(path);
		let content = await f.text();
		let code = await getCode(content, {
			filePath: path,
			// preprocess, // TODO recursive
		});

		importMap.imports[name] = await getTargetDataUri(code)
	}

	return importMap;
}

export async function preprocessBrowser(codeStr, { preprocess, imports, resolved }) {
	let importMap = await generateImportMap(resolved, preprocess);
	if(Object.keys(importMap?.imports || {}).length > 0) {
		return emulateImportMap(codeStr, importMap);
	}
}

export function emulateImportMap(code, importMap) {
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}