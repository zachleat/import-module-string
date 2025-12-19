import { assert } from "vitest"

export async function expectError(fn) {
	let error;
	try {
		await fn();
	} catch(e) {
		error = e;
	}
	// console.log( error );
	assert.isOk(error);
	return error;
}

export function isMissingModuleErrorMessage(errorMessage) {
	let messages = [
		"Failed to fetch dynamically imported module:", // Chrome
		"error loading dynamically imported module:", // Firefox
		"Importing a module script failed.", // Safari
	]
	return messages.find(msg => errorMessage.startsWith(msg));
}

export function isMissingModuleNameErrorMessage(moduleName, errorMessage) {
	let messages = [
		`Failed to resolve module specifier "${moduleName}"`,
		`The specifier “${moduleName}” was a bare specifier, but was not remapped to anything.`,
		// "Invalid URL",
		`Module name, '${moduleName}' does not resolve to a valid URL.`
	]
	return messages.find(msg => errorMessage.startsWith(msg));
}