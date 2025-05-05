import { ImportTransformer } from "esm-import-transformer";

// in-browser `emulateImportMap` *could* be a dynamically inserted Import Map some day (though not yet supported in Firefox)
// let importMap = {
// 	imports: {
// 		"@zachleat/noop": "https://unpkg.com/@zachleat/noop@1.0.4/index.js"
// 	}
// };
// let s = document.createElement("script");
// s.type = "importmap";
// s.innerHTML = JSON.stringify(importMap);
// document.body.appendChild(s);

export function emulateImportMap(code, importMap) {
	// TODO re-use ast?
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}