import { assert, test } from "vitest"
import { isPlainObject } from "@11ty/eleventy-utils";
import serialize from "serialize-to-js";

import { expectError, isMissingModuleNameErrorMessage } from "./test-utils.js";
// import { emulateImportMap } from "../src/emulate-importmap.js";
import { importFromString } from "../import-module-string.js"

const isNodeMode = typeof process !== "undefined" && Boolean(process?.env?.NODE);
const isVitestBrowserMode = Boolean(globalThis['__vitest_browser__']);

test("Using export", async () => {
	let res = await importFromString(`export var a = 1;
export const c = 3;
export var b = 2;`);
  assert.containsSubset(res, {a: 1, b: 2, c: 3});
});

test("Without export", async () => {
	let res = await importFromString(`var a = 1;
var b = 2;`);
  assert.containsSubset(res, {a: 1, b: 2});
})

test("Using date", async () => {
	let res = await importFromString(`const mydate = new Date();`);
  assert.instanceOf(res.mydate, Date);
});

test("isPlainObject", async () => {
	let res = await importFromString(`const mydate = new Date();`);
  assert.isTrue(isPlainObject(res));
})

test("isPlainObject (deep)", async () => {
	let res = await importFromString(`var a = { b: 1, c: { d: {} } };`);
  assert.isTrue(isPlainObject(res.a));
  assert.isTrue(isPlainObject(res.a.c.d));
})

test("isPlainObject (circular)", async () => {
	let res = await importFromString(`
var a = { a: 1 };
var b = { b: a };
a.b = b;`);

  assert.isTrue(isPlainObject(res.a.b));
  assert.isTrue(isPlainObject(res.b.b));
})

test("var using passed-in data", async t => {
	let res = await importFromString("var a = b;", { data: { b: 2 } });
	assert.containsSubset(res, { a: 2 });
});

test("let using passed-in data", async t => {
	let res = await importFromString("let a = b;", { data: { b: 2 } });
	assert.containsSubset(res, { a: 2 });
});

test("const using passed-in data", async t => {
	let res = await importFromString("const a = b;", { data: { b: 2 } });
	assert.containsSubset(res, { a: 2 });
});

test("function", async t => {
	let res = await importFromString("function testFunction() {}");
	assert.instanceOf(res.testFunction, Function);
});

test("function expression", async t => {
	let res = await importFromString("const functionExpression = function() {};");
	assert.instanceOf(res.functionExpression, Function);
});

test("async let", async t => {
	let res = await importFromString("let b = await Promise.resolve(1);");
	assert.containsSubset(res, { b: 1 });
});

test("Destructured assignment via object", async t => {
	let res = await importFromString(`const { a, b } = { a: 1, b: 2 };`);
	assert.typeOf(res.a, "number");
	assert.typeOf(res.b, "number");
	assert.equal(res.a, 1);
	assert.equal(res.b, 2);
});

test("Destructured assignment via Array", async t => {
	let res = await importFromString(`const [a, b] = [1, 2];`);
	assert.typeOf(res.a, "number");
	assert.typeOf(res.b, "number");
	assert.equal(res.a, 1);
	assert.equal(res.b, 2);
});

test("Same console.log", async t => {
	let res = await importFromString(`const b = console.log`);
	assert.equal(res.b, console.log);
});

test("Same URL", async t => {
	let res = await importFromString(`const b = URL`);
	assert.equal(res.b, URL);
});

test("Return array", async t => {
	let res = await importFromString(`let b = [1,2,3];`);
	assert.deepEqual(res.b, [1,2,3]);
});

test("JSON unfriendly data throws error", async t => {
	let error = await expectError(() => importFromString(`const b = fn;`, {
		data: {
			fn: function() {}
		}
	}))

	assert.isOk(error.message.startsWith("Data passed to 'import-module-string' needs to be JSON.stringify friendly."), error.message);
});

test("Use custom serializeData callback function", async t => {
	let res = await importFromString("const ret = fn()", {
		data: {
			fn: function() { return 1 }
		},
		serializeData: function(data) {
			return Object.entries(data).map(([varName, varValue]) => {
				return `const ${varName} = ${serialize(varValue)};`;
			}).join("\n");
		}
	});
	assert.typeOf(res.ret, "number");
	assert.equal(res.ret, 1);
});

test("export anonymous function", async t => {
	let res = await importFromString("export default function() {}");
	assert.typeOf(res.default, "function");
});

test("import.meta.url (no filePath)", async t => {
	let res = await importFromString("const b = import.meta.url;");
	assert.isTrue(res.b.startsWith("data:text/javascript;") || res.b.startsWith("blob:"));
});

test("import.meta.url (filePath override)", async t => {
	let res = await importFromString("const b = import.meta.url;", {
		filePath: import.meta.url
	});

	assert.equal(res.b, import.meta.url);
});

/*
 * Node-only tests
 */

test.skipIf(!isNodeMode || process.version.startsWith("v18."))("import.meta.url used in createRequire (with filePath)", async t => {
	let res = await importFromString("const { default: dep } = require('../test/dependency.js');", {
		addRequire: true,
		filePath: import.meta.url,
	});

	assert.typeOf(res.dep, "number");
});

test.skipIf(!isNodeMode)("import from node:fs (builtin)", async t => {
	let res = await importFromString("import fs from 'node:fs'; export { fs };");
	assert.isOk(res.fs);
});

test.skipIf(!isNodeMode)("import from node:fs (builtin, no export)", async t => {
	let res = await importFromString("import fs from 'node:fs';");
	assert.isOk(res.fs);
});

test.skipIf(!isNodeMode)("import from node:module (builtin)", async t => {
	let res = await importFromString("import module from 'node:module'; export { module };");
	assert.isOk(res.module);
});

test.skipIf(!isNodeMode)("import from node:module (builtin, no export)", async t => {
	let res = await importFromString("import module from 'node:module';");
	assert.isOk(res.module);
});

test.skipIf(!isNodeMode)("import * from node:module (builtin)", async t => {
	let res = await importFromString("import * as module from 'node:module'; export { module }");
	assert.isOk(res.module);
});

test.skipIf(!isNodeMode)("import * from node:module (builtin, no export)", async t => {
	let res = await importFromString("import * as module from 'node:module';");
	assert.isOk(res.module);
});

test.skipIf(!isNodeMode)("import from npmpackage (inlined)", async t => {
	let res = await importFromString("import { noop } from '@zachleat/noop';");
	assert.typeOf(res.noop, "function");
});

test.skipIf(!isNodeMode)("require(builtin)", async t => {
	let res = await importFromString("const fs = require('node:fs'); export { fs };", {
		addRequire: true
	});
	assert.isOk(res.fs);
	assert.isNotOk(res.require);
});

test.skipIf(!isNodeMode)("require(builtin), no export", async t => {
	let res = await importFromString("const fs = require('node:fs');", {
		addRequire: true
	});
	assert.isOk(res.fs);
	assert.isNotOk(res.require);
});

test.skipIf(!isNodeMode)("error: require(npm package)", async t => {
	let error = await expectError(async () => {
		await importFromString("const { noop } = require('@zachleat/noop'); export { noop };", {
			addRequire: true
		});
	});
	assert.isOk(error.message.startsWith("Cannot find module '@zachleat/noop'"), error.message);
});

test.skipIf(!isNodeMode)("error: require(npm package), no export", async t => {
	let error = await expectError(async () => {
		await importFromString("const { noop } = require('@zachleat/noop');", {
			addRequire: true
		});
	});
	assert.isOk(error.message.startsWith("Cannot find module '@zachleat/noop'"), error.message);
});

test.skipIf(!isNodeMode)("dynamic import(builtin)", async t => {
	let res = await importFromString(`const { default: fs } = await import("node:fs");`);
	assert.isOk(res.fs);
});

test.skipIf(!isNodeMode)("error: dynamic import(npm package)", async t => {
	let error = await expectError(async () => {
		await importFromString(`const { noop } = await import("@zachleat/noop");`);
	});

	assert.isOk(error.message.startsWith("Failed to resolve module specifier") || error.message === "Invalid URL", error.message);
});

/*
 * Combo Node and Browser tests may not work in Vitest in Node (if the code path relies on import.meta.resolve)
 */

test("resolveImportContent", async t => {
	let res = await importFromString(`import dep from './test/dep1.js';
import dep2 from './test/dep2.js';`, {
		resolveImportContent: function(moduleInfo) {
			assert.isOk(moduleInfo.path === "./test/dep1.js" || moduleInfo.path === "./test/dep2.js")
			assert.isOk(moduleInfo.mode === "relative")
			// assert.isOk(moduleInfo.resolved) // Not in Vite

			// This allows us to write our own adapters based on module information
			// In this test we just simply always return `2`
			return `export default 2;`
		}
	});

	assert.equal(res.dep, 2);
	assert.equal(res.dep2, 2);
});

// Tests that import from relative references *WORK* but are not supported in Node + Vitest https://github.com/vitest-dev/vitest/issues/6953
// We run these tests separately using Node’s Test Runner: see test/manual-node-test.js
test.skipIf(isNodeMode)("import from local script (inline)", async t => {
	let res = await importFromString("import dep from './test/dependency.js';");

	assert.typeOf(res.dep, "number");
});

// Tests that import from relative references *WORK* but are not supported in Vitest https://github.com/vitest-dev/vitest/issues/6953
// We run these tests separately using Node’s Test Runner: see test/manual-node-test.js
test.skipIf(isNodeMode)("import from local script (inline) with import local script", async t => {
	let res = await importFromString("import {num} from './test/dependency-with-import.js';");

	assert.equal(res.num, 2);
});

test.skipIf(isNodeMode)("expect error in browser: import from npmpackage", async t => {
	let error = await expectError(async () => {
		let res = await importFromString("import { noop } from '@zachleat/noop';");
	});
	assert.isOk(isMissingModuleNameErrorMessage("@zachleat/noop", error.message), error.message);
});

test("Use compileAsFunction to return function wrapper", async t => {
	let mod = await importFromString(`export const ret = fn();`, {
		compileAsFunction: true,
	});

	// This avoids data serialization altogether and brings the code back into your current scope
	let res = await mod.default({
		fn: function() { return 1 }
	});

	assert.typeOf(res.ret, "number");
	assert.equal(res.ret, 1);
});

// Tests that import from npm packages *WORK* but are not supported in Vitest https://github.com/vitest-dev/vitest/issues/6953
// We run these tests separately using Node’s Test Runner: see test/manual-node-test.js
test.skipIf(isNodeMode)("Use compileAsFunction to return function wrapper (with an import)", async t => {
	let mod = await importFromString(`import {num} from './test/dependency-with-import.js';
export { num };
export const ret = fn();`, {
		compileAsFunction: true,
	});

	// This avoids data serialization altogether and brings the code back into your current scope
	let res = await mod.default({
		fn: function() { return 1 }
	});

	assert.typeOf(res.num, "number");
	assert.equal(res.num, 2);
	assert.typeOf(res.ret, "number");
	assert.equal(res.ret, 1);
});