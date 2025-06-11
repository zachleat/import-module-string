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

function isRelativeRef(ref) {
	return ref.startsWith("/") || ref.startsWith("./") || ref.startsWith("../");
}

function isAbsolute(ref) {
	return ref.startsWith("file:///") || isValidUrl(ref);
}

function getModuleReferenceMode(ref) {
	if(ref.startsWith("data:")) {
		return "data";
	}

	if(isAbsolute(ref)) {
		return "absolute";
	}

	if(isRelativeRef(ref)) {
		return "relative";
	}

	// unknown, probably a bare specifier
	return "bare";
}

function resolveLocalPaths(ref, root) {
	if(!root) {
		throw new Error("Missing `root` to resolve import reference");
	}

	// Unresolved relative urls
	if(root.startsWith("file:///")) {
		let u = new URL(ref, root);
		return u.href;
	}

	let rootUrl = new URL(root, `file:`);
	let {href, pathname} = new URL(ref, rootUrl);

	// `fs` mode
	if(href.startsWith("file:///")) {
		return "./" + href.slice(`file:///`.length);
	}

	// `url` mode
	return pathname;
}

export function getModuleInfo(name, root) {
	let mode = getModuleReferenceMode(name);
	let info = {
		name,
		mode,
		original: {
			path: name,
			mode,
		}
	};

	if(mode === "relative" && root) {
		// resolve relative paths to the virtual or real file path of the script
		try {
			root = resolveModule(root);
		} catch(e) {
			// Unresolvable `filePath`, recover gracefully
		}

		name = resolveLocalPaths(name, root);
	}

	try {
		let u = resolveModule(name);
		info.path = u;
		info.mode = getModuleReferenceMode(u);
		info.isMetaResolved = true;
	} catch(e) {
		// unresolvable name, recover gracefully
		info.path = name;
		info.isMetaResolved = false;
		// console.error( e );
	}

	return info;
}

