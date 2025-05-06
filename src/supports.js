export function importFromBlob() {
	if(typeof Blob === "undefined") {
		return false;
	}

	let b = new Blob(['/* import-from-string Blob Feature Test */'], { type: "text/javascript" });
	let u = URL.createObjectURL(b);

	return import(/* @vite-ignore */u).then(mod => {
		URL.revokeObjectURL(u);
		return true;
	}, error => {
		URL.revokeObjectURL(u);
		return false;
	});
}