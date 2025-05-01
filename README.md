# `import-module-string`

Use `import('data:')` to execute arbitrary JavaScript strings. A simpler alternative to [`node-retrieve-globals`](https://github.com/zachleat/node-retrieve-globals/) that works in more runtimes.

## Features

- Multi-runtime: tested with Node (18+), Deno (limited), Chromium, Firefox, and WebKit.
- Defers to `export` when used, otherwise implicitly `export` all globals (via `var`, `let`, `const`, `function`, `Array` or `Object` destructuring assignment, `import` specifiers, etc)
- Emulates `import.meta.url` when `filePath` option is supplied
- `addRequire` option adds support for `require()` (in Node)
- Extremely limited dependency footprint (`acorn` for JS parsing only)
- Allows providing an external data object to pass in data (must be JSON.stringify friendly)

## Limitations

- import (in Browser) targets _must_ be mapped via an Import Map in HTML.
- import (in Node) targets are limited to _built-in modules only_.
- Context data passed to script must be JSON.stringify-friendly (more serialization options may be added later).
- Script content [size maximums](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data#length_limitations): Chrome `512MB`, Safari `2048MB`, Firefox `512MB`, Firefox prior to v137 `32MB`