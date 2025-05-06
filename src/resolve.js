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

function isPathRef(ref) {
	return ref.startsWith("/") || ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("file:///");
}

function getModuleReferenceMode(ref) {
	if(ref.startsWith("data:")) {
		return "data";
	}

	if(isPathRef(ref)) {
		return "fs";
	}

	if(isValidUrl(ref)) {
		return "url";
	}

	// unknown, probably a bare specifier
	return "bare";
}

function resolveLocalPaths(ref, root) {
	if(!root || !isPathRef(ref)) {
		return ref;
	}

	if(!root.startsWith("file:///")) {
		let rootUrl = new URL(root, `file:`);
		let {href, pathname} = new URL(ref, rootUrl);

		// `fs` mode
		if(href.startsWith("file:///")) {
			return "./" + href.slice(`file:///`.length);
		}

		// `url` mode
		return pathname;
	}

	let u = new URL(ref, root);
	return u.href;
}

export function getModuleInfo(name, root) {
	let info = { name };
	try {
		// resolve relative paths to the virtual or real file path of the script

		name = resolveLocalPaths(name, root);

		let u = resolveModule(name);
		info.path = u;
		info.mode = getModuleReferenceMode(u);
	} catch(e) {
		// unresolvable name
		info.path = name;
		info.mode = getModuleReferenceMode(name);
		// console.error( {e} );
	}

	return info;
}

