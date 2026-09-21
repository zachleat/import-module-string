import { parse } from "acorn";

/**
 * @param {string} code
 * @param {Partial<import("acorn").Options>} [parseOptions]
 * @returns {import("acorn").Program}
 */
export function parseCode(code, parseOptions = {}) {

	parseOptions.sourceType ??= "module";
	parseOptions.ecmaVersion ??= "latest";

	return parse(code, /** @type {import("acorn").Options} */(parseOptions));
}
