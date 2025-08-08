import test from "node:test";
import assert from "node:assert/strict";
import { importFromString } from "../import-module-string.js";

// This test only exists because of a Vitest issue with import.meta.resolve https://github.com/vitest-dev/vitest/issues/6953
test("import from npmpackage (inlined)", async (t) => {
	let res = await importFromString("import { noop } from '@zachleat/noop';");

  assert.equal(typeof res.noop, "function");
});

test("import from local script with import (inline), sanity check on importing data uris", async t => {
	let res = await importFromString(`import num from "data:text/javascript;charset=utf-8,export%20default%202%3B";`, {
	});
	assert.equal(res.num, 2);
});

test("import from local script", async t => {
	let res = await importFromString("import num from './test/dependency.js';");

	assert.equal(res.num, 2);
});

test("import from local script (with file path)", async t => {
	let res = await importFromString("import num from './dependency.js';", {
		filePath: "./test/DOES_NOT_EXIST.js",
	});

	assert.equal(res.num, 2);
});

test("import from local script with import local script", async t => {
	let res = await importFromString("import {num} from './test/dependency-with-import.js';");

	assert.equal(res.num, 2);
});

test("import from local script with import local script (with file path)", async t => {
	let res = await importFromString("import {num} from './dependency-with-import.js';", {
		filePath: "./test/DOES_NOT_EXIST.js",
	});

	assert.equal(res.num, 2);
});

test("import from local script with import npm package", async t => {
	let res = await importFromString("import {noop} from './test/dependency-with-import-npm.js';");

	assert.equal(typeof res.noop, "function");
});

test("import from local script with import npm package", async t => {
	let res = await importFromString("import {noop} from './dependency-with-import-npm.js';", {
		filePath: "./test/DOES_NOT_EXIST.js",
	});

	assert.equal(typeof res.noop, "function");
});

test("Use compileAsFunction to return function wrapper (with an import)", async t => {
	let mod = await importFromString(`import {num} from './test/dependency-with-import.js';
export { num };
export const ret = fn();`, {
		compileAsFunction: true,
	});

	// This avoids data serialization altogether and brings the code back into your current scope
	let res = await mod.default({
		fn: function() { return 1 }
	});

	assert.equal(res.num, 2);
	assert.equal(res.ret, 1);
});

test("Use compileAsFunction to return function wrapper (with a package import)", async t => {
	let mod = await importFromString(`import { noopSync } from '@zachleat/noop';

export function getNoop() {
	// important to use the import here
	return noopSync() + "1";
};`, {
		compileAsFunction: true,
	});

	// This avoids data serialization altogether and brings the code back into your current scope
	let res = await mod.default();

	assert.equal(typeof res.getNoop, "function");
	assert.equal(res.getNoop(), "undefined1");
});