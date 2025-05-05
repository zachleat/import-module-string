import { fileURLToPath } from "./url.js";
import { resolveModule } from "../import-module-string.js";

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

export function getModuleInfo(name) {
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
		info.path = name;
		info.mode = getModuleReferenceMode(name);
	}

	return info;
}

