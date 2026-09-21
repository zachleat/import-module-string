import * as walk from "acorn-walk";

/**
 * @typedef {object} CodeFeatures
 * @property {boolean} export Code declares its own `export`.
 * @property {boolean} require Code calls `require()`.
 * @property {boolean} importMetaUrl Code references `import.meta.url`.
 */

/**
 * @typedef {object} WalkResult
 * @property {import("acorn").Program} ast
 * @property {Set<string>} globals Top-level declarations, implicitly exported unless the code uses `export`.
 * @property {Set<string>} imports Import specifiers, as authored.
 * @property {CodeFeatures} features
 * @property {Set<string>} used Referenced identifiers that are neither declared locally nor on `globalThis`.
 */

/**
 * Adds binding names from a declaration pattern (including destructuring) to `names`.
 * @param {import("acorn").Pattern | null | undefined} node
 * @param {Set<string>} names
 */
function addPatternNames(node, names) {
	if(!node) {
		return;
	}

	if(node.type === "Identifier") {
		names.add(node.name);
	} else if(node.type === "AssignmentPattern") {
		addPatternNames(node.left, names);
	} else if(node.type === "RestElement") {
		addPatternNames(node.argument, names);
	} else if(node.type === "ObjectPattern") {
		for(let prop of node.properties) {
			addPatternNames(prop.type === "Property" ? prop.value : prop, names);
		}
	} else if(node.type === "ArrayPattern") {
		for(let element of node.elements) {
			addPatternNames(element, names);
		}
	}
}

/**
 * Module-scope bindings only; `var` hoisted out of nested top-level blocks (e.g. `if(x) { var y }`) is not included.
 * @param {import("acorn").Program} ast
 * @returns {Set<string>}
 */
function getTopLevelDeclarations(ast) {
	let names = new Set();
	for(let node of ast.body) {
		if(node.type === "VariableDeclaration") {
			for(let declarator of node.declarations) {
				addPatternNames(declarator.id, names);
			}
		} else if((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) {
			names.add(node.id.name);
		} else if(node.type === "ImportDeclaration") {
			for(let specifier of node.specifiers) {
				names.add(specifier.local.name);
			}
		}
	}
	return names;
}

/**
 * @param {import("acorn").Program} ast
 * @returns {WalkResult}
 */
export function walkCode(ast) {
	let globals = getTopLevelDeclarations(ast);
	// Declarations at any depth, excluded from `used`
	let declared = new Set();
	let imports = new Set();
	let references = new Set();

	let features = {
		export: false,
		require: false,
		importMetaUrl: false
	};

	let types = {
		Identifier(node) {
			// variables used, must not be an existing global or host object
			if(node?.name && !(node?.name in globalThis)) {
				references.add(node?.name)
			}
		},
		MetaProperty(node) {
			// This script uses `import.meta.url`
			features.importMetaUrl = true;
		},
		CallExpression(node) {
			if(node?.callee?.name === "require") {
				features.require = true;
			}
			// function used
			if(node?.callee?.name && !(node?.callee?.name in globalThis)) {
				references.add(node.callee.name);
			}
		},
		FunctionDeclaration(node) {
			if(node?.id?.name) {
				declared.add(node.id.name);
			}
		},
		ClassDeclaration(node) {
			if(node?.id?.name) {
				declared.add(node.id.name);
			}
		},
		VariableDeclarator(node) {
			addPatternNames(node.id, declared);
		},
		ImportDeclaration(node) {
			imports.add(node.source.value);
		},
		ExportSpecifier(node) {
			features.export = true;
		},
		ExportNamedDeclaration(node) {
			features.export = true;
		},
		ExportAllDeclaration(node) {
			features.export = true;
		}
	};

	walk.simple(ast, types);

	// remove declarations from used
	for(let name of [...globals, ...declared]) {
		references.delete(name);
	}

	return {
		ast,
		globals,
		imports,
		features,
		used: references,
	};
}