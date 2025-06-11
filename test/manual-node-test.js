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

