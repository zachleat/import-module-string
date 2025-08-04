export function stringifyData(data = {}) {
	return Object.entries(data).map(([varName, varValue]) => {
		// JSON
		return `const ${varName} = ${JSON.stringify(varValue, function replacer(key, value) {
			if(typeof value === "function") {
				throw new Error(`Data passed to 'import-module-string' needs to be JSON.stringify friendly. The '${key || varName}' property was a \`function\`.`);
			}
			return value;
		})};`;
	}).join("\n");
}