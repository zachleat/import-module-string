import test from "node:test";
import assert from "node:assert/strict";
import { preprocessNode, resolveImportContentNode } from "./util-fs-adapter.js";
import { importFromString } from "../import-module-string.js";

// This test only exists because of a Vitest issue with import.meta.resolve https://github.com/vitest-dev/vitest/issues/6953
test("import from npmpackage (inlined)", async (t) => {
	let res = await importFromString("import { noop } from '@zachleat/noop';", {
		preprocess: preprocessNode,
		resolveImportContent: resolveImportContentNode,
	});

  assert.equal(typeof res.noop, "function");
});

test("import from local script with import (inline), sanity check on importing data uris", async t => {
	let res = await importFromString(`import num from "data:text/javascript;charset=utf-8,export%20default%202%3B";`, {
	});
	assert.equal(res.num, 2);
});

test("import from local script with import local script", async t => {
	let res = await importFromString("import {num} from './test/dependency-with-import.js';", {
		preprocess: preprocessNode,
		resolveImportContent: resolveImportContentNode,
	});

	assert.equal(res.num, 2);
});

test("import from local script with import npm package", async t => {
	let res = await importFromString("import {noop} from './test/dependency-with-import-npm.js';", {
		preprocess: preprocessNode,
		resolveImportContent: resolveImportContentNode,
	});

	assert.equal(typeof res.noop, "function");
});

