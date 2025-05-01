// I’d rather run my Vitest suite from Deno but it doesn’t look like it’s supported yet
import { assertEquals } from "jsr:@std/assert";
import { importFromString } from "../import-module-string.js";

Deno.test("Sample test", async() => {
	let result = await importFromString(`export var a = 1;
	export const c = 3;
	export var b = 2;`);

	assertEquals(result, { a: 1, c: 3, b: 2 });
});