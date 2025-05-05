import { fileURLToPath } from "./url.js";

function isValidUrl(ref) {
	// Use URL.canParse some day
	try {
		new URL(ref);
		return true;
	} catch(e) {
		return false;
	}
}

function getModuleReferenceMode(ref) {
	if(ref.startsWith("/") || ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("file:///")) {
		return "fs";
	}

	if(isValidUrl(ref)) {
		return "url";
	}

	// unknown, probably a bare specifier
	return "bare";
}

function resolveModule(ref) {
	// Supported in Node v20.6.0+, v18.19.0+, Chrome 105, Safari 16.4, Firefox 106
	if(!("resolve" in import.meta)) {
		// We *could* return Boolean when import.meta.resolve is not supported
		// return true would mean that a browser with an Import Map *may* still resolve the module correctly.
		// return false would mean that this module would be skipped

		// Supports `import.meta.resolve` vs Import Maps
		//   Chrome 105 vs 89
		//   Safari 16.4 vs 16.4
		//   Firefox 106 vs 108

		// Vitest issue with import.meta.resolve https://github.com/vitest-dev/vitest/issues/6953
		throw new Error(`\`import.meta.resolve\` not supported: ${import.meta.resolve}`);
	}

	// Notes about Node:
	//   - `fs` resolves to `node:fs`
	//   - `resolves` with all Node rules about node_modules
	// Works with import maps when supported
	return import.meta.resolve(ref);
}

export function getModuleInfo(name) {
	let mode = getModuleReferenceMode(name);
	if(mode && mode !== "bare") {
		return {
			name,
			path: name,
			mode,
		};
	}

	let info = { name };
	try {
		let u = resolveModule(name);
		if(u.startsWith("file:///")) {
			info.path = fileURLToPath(u);
		} else {
			info.path = u;
		}
		info.mode = getModuleReferenceMode(u);
	} catch(e) {
		// unresolvable name
	}

	return info;
}

