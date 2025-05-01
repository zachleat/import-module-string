import { assert, test } from "vitest"
import { expectError } from "./test-utils.js";

import { importFromString, walkCode, parseCode } from "../import-module-string.js"

const isNodeMode = typeof process !== "undefined" && process?.env?.NODE;

test("Get import targets", t => {
	let code = `import { noop } from '@zachleat/noop';
import fs from "node:fs"`;
	let ast = parseCode(code);
	let { imports } = walkCode(ast);
	assert.deepEqual(imports, new Set(["@zachleat/noop", "node:fs"]));
});

test("Walk, then import", async t => {
	let code = `import fs from 'node:fs';`;
	let ast = parseCode(code);
	let { imports } = walkCode(ast);
	assert.deepEqual(imports, new Set(["node:fs"]));

	if(isNodeMode) {
		let res = await importFromString(code, { ast });
		assert.isOk(res.fs);
	} else {
		// Browsers throw an error
		try {
			await importFromString(code, { ast });
		} catch(e) {
			let messages = [
				"Failed to fetch dynamically imported module:", // Chrome
				"error loading dynamically imported module:", // Firefox
				"Importing a module script failed.", // Safari
			]
			assert.isOk(messages.find(msg => e.message.startsWith(msg)), e.message);
		}
	}
});

test.skipIf(!isNodeMode)("Walk, then import a non-built-in", async t => {
	const { isBuiltin } = await import("node:module");

	let code = `import { noop } from '@zachleat/noop';`;
	let ast = parseCode(code);
	let { imports } = walkCode(ast);

	let nonBuiltinImports = Array.from(imports).filter(name => !isBuiltin(name));
	if(nonBuiltinImports.length > 0) {
		// In Node this *could* throw an error but some day this may be supported?
		// In Browsers this may work if an Import Map is correctly configured.
		// Upstream scripts can escape to node-retreieve-globals in this case
		// throw new Error("Cannot import non-built-in modules via import-module-string: " + nonBuiltinImports.join(", "))
	}

	let error = await expectError(async () => {
		await importFromString(code, { ast });
	});

	assert.isOk(error.message.startsWith("Failed to resolve module specifier") || error.message === "Invalid URL", error.message);
});

