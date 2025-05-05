import test from "node:test";
import assert from "node:assert/strict";
import { importFromString } from "../import-module-string.js";

// This test only exists because of a Vitest issue with import.meta.resolve https://github.com/vitest-dev/vitest/issues/6953
test("import from npmpackage (inlined)", async (t) => {
	let res = await importFromString("import { noop } from '@zachleat/noop';", {
		inlineRelativeReferences: true
	});

  assert.equal(typeof res.noop, "function");
});
