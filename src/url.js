import { importFromBlob } from "./supports.js";

// async but we await for it below (no top-level await for wider compat)
const SUPPORTS_BLOB_IMPORT = importFromBlob();

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