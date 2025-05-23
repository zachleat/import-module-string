import * as walk from "acorn-walk";

export function walkCode(ast) {
	let globals = new Set();
	let imports = new Set();
	let features = {
		export: false,
		require: false,
		importMetaUrl: false
	};

	let types = {
		MetaProperty(node) {
			// This script uses `import.meta.url`
			features.importMetaUrl = true;
		},
		CallExpression(node) {
			if(node?.callee?.name === "require") {
				features.require = true;
			}
		},
		// e.g. var b = function() {}
		// FunctionExpression is already handled by VariableDeclarator
		// FunctionExpression(node) {},
		FunctionDeclaration(node) {
			if(node?.id?.name) {
				globals.add(node.id.name);
			}
		},
		VariableDeclarator(node) {
			// destructuring assignment Array
			if(node?.id?.type === "ArrayPattern") {
				for(let prop of node.id.elements) {
					if(prop?.type === "Identifier") {
						globals.add(prop.name);
					}
				}
			} else if(node?.id?.type === "ObjectPattern") {
				// destructuring assignment Object
				for(let prop of node.id.properties) {
					if(prop?.type === "Property") {
						globals.add(prop.value.name);
					}
				}
			} else if(node?.id?.name) {
				globals.add(node.id.name);
			}
		},
		// if imports aren’t being transformed to variables assignment, we need those too
		ImportSpecifier(node) {
			// `name` in `import { name } from 'package'`
			globals.add(node.imported.name);
		},
		ImportDeclaration(node) {
			imports.add(node.source.value);
		},
		ImportDefaultSpecifier(node) {
			// `name` in `import name from 'package'`
			globals.add(node.local.name);
		},
		ImportNamespaceSpecifier(node) {
			globals.add(node.local.name);
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

	return {
		ast,
		globals,
		imports,
		features,
	};
}