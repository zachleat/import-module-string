import { assert, test } from "vitest"

import { importFromString, walkCode, parseCode } from "../import-module-string.js"
import { isMissingModuleErrorMessage } from "./test-utils.js";

const isNodeMode = typeof process !== "undefined" && process?.env?.NODE;

test("Get import targets", t => {
	let code = `import { noop } from '@zachleat/noop';
import fs from "node:fs"`;
	let ast = parseCode(code);
	let { imports } = walkCode(ast);
	assert.deepEqual(imports, new Set(["@zachleat/noop", "node:fs"]));
});

test("export anonymous function", async t => {
	let code = "export default function() {}";
	let ast = parseCode(code);
	let { imports } = walkCode(ast);
	// imports ie empty
	assert.deepEqual(imports, new Set());
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
			assert.isOk(isMissingModuleErrorMessage(e.message), e.message);
		}
	}
});

test.skipIf(!isNodeMode)("(Node only) Walk, then import a non-built-in", async t => {
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

	let res = await importFromString("import { noop } from '@zachleat/noop';", { ast });
	assert.typeOf(res.noop, "function");
});


test("Implicit exports skip function-scoped declarations", async t => {
	let code = `const title = "x"; const eleventyComputed = { desc: (d) => { const cat = d.title; return cat; } };`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["title", "eleventyComputed"]));

	let res = await importFromString(code);
	assert.deepEqual(Object.keys(res).sort(), ["eleventyComputed", "title"]);
	assert.equal(res.eleventyComputed.desc({ title: "y" }), "y");
});

test("Implicit exports skip block-scoped declarations", async t => {
	let code = `let a = 1; if (true) { let b = 2; }`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["a"]));

	let res = await importFromString(code);
	assert.deepEqual(Object.keys(res), ["a"]);
});

test("Implicit exports skip nested function declarations and var", async t => {
	let code = `function outer() { function inner() {} var v = 1; }`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["outer"]));

	let res = await importFromString(code);
	assert.deepEqual(Object.keys(res), ["outer"]);
});

test("Implicit exports use local import names", async t => {
	let code = `import { basename as bn } from "node:path";`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["bn"]));
});

test.skipIf(!isNodeMode)("(Node only) Implicit exports use local import names", async t => {
	let res = await importFromString(`import { basename as bn } from "node:path";`);
	assert.deepEqual(Object.keys(res), ["bn"]);
	assert.equal(res.bn("/a/b.txt"), "b.txt");
});

test("Implicit exports include destructuring defaults, nested patterns, and rest", async t => {
	let code = `const { a = 1, b: { c }, ...rest } = { b: { c: 3 }, x: 4 }; const [d = 2, , ...e] = [undefined, 0, 5];`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["a", "c", "rest", "d", "e"]));

	let res = await importFromString(code);
	assert.deepEqual(Object.keys(res).sort(), ["a", "c", "d", "e", "rest"]);
	assert.equal(res.a, 1);
	assert.equal(res.c, 3);
	assert.deepEqual(res.rest, { x: 4 });
	assert.equal(res.d, 2);
	assert.deepEqual(res.e, [5]);
});

test("Implicit exports include top-level classes", async t => {
	let code = `class Foo {}`;
	assert.deepEqual(walkCode(parseCode(code)).globals, new Set(["Foo"]));

	let res = await importFromString(code);
	assert.deepEqual(Object.keys(res), ["Foo"]);
	assert.typeOf(res.Foo, "function");
});
