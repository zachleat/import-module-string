import { importFromBlob } from "./supports.js";

// async but we await for it below (no top-level await for wider compat)
const SUPPORTS_BLOB_IMPORT = importFromBlob();

// Thank you bare-url!
// Apache-2.0 LICENSE https://github.com/holepunchto/bare-url/blob/main/LICENSE
export function fileURLToPath(url) {
	if (typeof url === "string") {
		url = new URL(url);
	}

	if (url.protocol !== "file:") {
		throw new Error("The URL must use the file: protocol");
	}

	if (url.hostname) {
		throw new Error("The file: URL host must be 'localhost' or empty");
	}

	if (/%2f/i.test(url.pathname)) {
		throw new Error("The file: URL path must not include encoded / characters");
	}

	// Removed a path.normalize call here
	return decodeURIComponent(url.pathname);
}

export async function getTarget(codeStr) {
	if(await SUPPORTS_BLOB_IMPORT) {
		// Node 15.7+
		return new Blob([codeStr], { type: "text/javascript" });
	}

	return getTargetDataUri(codeStr);
}

// Node can’t do import(Blob) yet https://github.com/nodejs/node/issues/47573
// This is also used in-browser to inline via `fetch`
export function getTargetDataUri(codeStr) {
	return `data:text/javascript;charset=utf-8,${encodeURIComponent(codeStr)}`;
}