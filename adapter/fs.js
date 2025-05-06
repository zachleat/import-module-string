
import fs from "node:fs";
import { ImportTransformer } from "esm-import-transformer";

// Vite error (even though this file isn’t used in-browser)
// import { fileURLToPath } from "node:url";

// The `adapters` pattern helps avoid a Vite error (and is also used to polyfill fileURLToPath in bundler)
import { fileURLToPath } from "../src/adapters/url.js";

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

	for(let res of resolved) {
		if(res.target) {
			importMap.imports[res.name] = res.target;
		}
	}

	if(Object.keys(importMap?.imports || {}).length > 0) {
		return emulateImportMap(codeStr, importMap);
	}
}

function isRelativePath(ref) {
	return ref.startsWith("/") || ref.startsWith("./") || ref.startsWith("../");
}

export async function resolveImportContent(moduleInfo = {}) {
	let {name, mode, path} = moduleInfo;
	let isRelative = isRelativePath(name);
	if(mode !== "fs" && !isRelative) {
		return;
	}

	if(path.startsWith("file:///")) {
		path = fileURLToPath(path);
	}

	if(fs.existsSync(path)) {
		return fs.readFileSync(path, "utf8");
	}
	if(isRelative) {
		return fs.readFileSync(name, "utf8");
	}

	throw new Error("Could not find content for module: " + JSON.stringify(moduleInfo));
}