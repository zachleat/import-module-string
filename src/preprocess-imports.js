import { ImportTransformer } from "esm-import-transformer";

// in-browser `emulateImportMap` *could* be a dynamically inserted
// Import Map some day (though not yet supported in Firefox):
// https://github.com/mdn/mdn/issues/672

class TransformerManager {
	constructor(ast) {
		this.ast = ast;
	}

	getTransformer(code) {
		if(!this.transformer) {
			this.transformer = new ImportTransformer(code, this.ast);
		} else {
			// first one is free, subsequent calls create a new transformer (AST is dirty)
			this.transformer = new ImportTransformer(code);
		}

		return this.transformer;
	}
}

function getArgumentString(names) {
	let argString = "";
	if(!Array.isArray(names)) {
		names = Array.from(names)
	}
	names = names.filter(Boolean);

	if(names.length > 0) {
		argString = `{ ${names.join(", ")} }`;
	}
	return argString;
}

export async function preprocess(codeStr, { resolved, ast, used, compileAsFunction }) {
	let importMap = {
		imports: {}
	};

	for(let {path, name, target, isMetaResolved} of resolved) {
		if(target) { // from `resolveImportContent` when overriding how content is fetched (preferred to meta resolved targets)
			importMap.imports[name] = target;
		} else if(isMetaResolved) { // resolved path
			importMap.imports[name] = path;
		}
	}

	// Warning: if you use both of these features, it will re-parse between them
	// Could improve this in `esm-import-transformer` dep
	if(Object.keys(importMap?.imports || {}).length > 0 || compileAsFunction) {
		let code = codeStr;
		let transformerManager = new TransformerManager(ast);

		// Emulate Import Maps
		if(Object.keys(importMap?.imports || {}).length > 0) {
			let transformer = transformerManager.getTransformer(code);
			code = transformer.transformWithImportMap(importMap);
		}

		if(compileAsFunction) {
			let transformer = transformerManager.getTransformer(code);
			let stripped = transformer.transformRemoveImportExports();
			let { imports, namedExports } = transformer.getImportsAndExports();

			// TODO we could just use the unprocessed code here if we detect a default export?
			if(namedExports.has("default")) {
				throw new Error("`export default` is not (yet) supported by the `compileAsFunction` option.");
			}
		
			code = `// import-module-string modified JavaScript
// Boost top-level imports:
${Array.from(imports).join("\n") || "// No imports found"}

// Wrapper function:
export default function(${getArgumentString(used)}) {
${stripped}

	// Returns named exports:
	return ${getArgumentString(namedExports) || '{}'}
};`;
		}

		return code;
	}
}
