import { parse } from "acorn";

export function parseCode(code, parseOptions = {}) {

	parseOptions.sourceType ??= "module";
	parseOptions.ecmaVersion ??= "latest";

	return parse(code, parseOptions);
}