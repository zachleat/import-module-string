# `import-module-string`

Use `import('data:')` and `import(Blob)` to execute arbitrary JavaScript strings. A simpler alternative to [`node-retrieve-globals`](https://github.com/zachleat/node-retrieve-globals/) that works in more runtimes.

## Installation

Available on `npm` as [`import-module-string`](https://www.npmjs.com/package/import-module-string).

```
npm install import-module-string
```

## Features

- Multi-runtime: tested with Node (18+), Deno (limited), Chromium, Firefox, and WebKit.
- Defers to `export` when used, otherwise implicitly `export` all globals (via `var`, `let`, `const`, `function`, `Array` or `Object` destructuring assignment, `import` specifiers, etc)
- Supports top-level async/await (as expected for ES modules)
- Emulates `import.meta.url` when `filePath` option is supplied
- `addRequire` option adds support for `require()` (in Node)
- Extremely limited dependency footprint (`acorn` for JS parsing only)
- Supports data object to pass in data (must be JSON.stringify friendly, more serialization options may be added later)
- Subject to URL content [size maximums](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data#length_limitations): Chrome `512MB`, Safari `2048MB`, Firefox `512MB`, Firefox prior to v137 `32MB`

|Feature|Server|Browser|
|---|---|---|
|`import('./file.js')`|✅ with `adapter: "fs"`|✅ with Import Map or `adapter: "fetch"`|
|`import('bare')`|✅ with `adapter: "fs"`|✅ with Import Map or `adapter: "fetch"`|
|`import('built-in')`|✅|_N/A_|
|`require()`|✅ with `addRequire` option|❌|
|`import.meta.url`|✅ with `filePath` option|✅ with `filePath` option|

Notes:

- [built-in](https://nodejs.org/api/module.html#moduleisbuiltinmodulename) modules are provided by the JavaScript runtime. `node:fs` is one example.
- `bare` specifiers are packages referenced by their bare name. In Node this might be a package installed from npm.

## Usage

Import the script first!

```js
import { importFromString } from "import-module-string";
```

View the [test suite file](https://github.com/zachleat/import-module-string/blob/main/test/import-module-string.test.js) for more examples.

### Export

```js
await importFromString(`export var a = 1;
export const c = 3;
export let b = 2;`);

// Returns
{ a: 1, c: 3, b: 2 }
```

### No export

```js
import { importFromString } from "import-module-string";

await importFromString(`var a = 1;
const c = 3;
let b = 2;`);

// Returns
{ a: 1, c: 3, b: 2 }
```

### Pass in data

```js
await importFromString("const a = b;", { data: { b: 2 } });

// Returns
{ a: 2 }
```

### Pass in filePath

```js
await importFromString("const a = import.meta.url;", { filePath: import.meta.url });

// Returns value for import.meta.url, example shown
{ a: `file:///…` }
```

### Imports (experimental feature)

#### Relative references

```js
// `dependency.js` has the content `export default 2;`
await importFromString("import dep from './dependency.js';", {
	adapter: "fs", // use "fetch" in-browser
});

// Only when provided by runtime (`fs` is not available in browser, usually)
{ dep: 2 }
```

#### Bare references

Uses `import.meta.resolve` to resolve paths (Import Map friendly!)

```js
// `dependency.js` has the content `export default 2;`
await importFromString("import {noop} from '@zachleat/noop';", {
	adapter: "fs", // use "fetch" in-browser
});

// Only when provided by runtime (`fs` is not available in browser, usually)
{ noop: function() {} }
```

#### Builtins

```js
await importFromString("import fs from 'node:fs';");

// Only when provided by runtime (`fs` is not available in browser, usually)
{ fs: { /* … */ } }
```