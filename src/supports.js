export function importFromBlob() {
	if(typeof Blob === "undefined") {
		return false;
	}

	let b = new Blob(['/* */'], { type: "text/javascript" });
	let u = URL.createObjectURL(b);

	return import(/* @vite-ignore */u).then(mod => {
		URL.revokeObjectURL(u);
		return true;
	}, error => {
		URL.revokeObjectURL(u);
		return false;
	});
}