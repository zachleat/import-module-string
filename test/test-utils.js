import { assert } from "vitest"

export async function expectError(fn) {
	let error;
	try {
		await fn();
	} catch(e) {
		error = e;
	}
	assert.isOk(error);
	return error;
}