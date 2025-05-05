import { ImportTransformer } from "esm-import-transformer";

export function emulateImportMap(code, importMap) {
	let tf = new ImportTransformer(code);
	let transformedCode = tf.transformWithImportMap(importMap);
	return transformedCode;
}