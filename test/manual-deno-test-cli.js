import { importFromString } from "../import-module-string.js";

let result = await importFromString(`export var a = 1;
export const c = 3;
export let b = 2;`);

// We don’t want any Deno security request prompts:
// console.log( process.env.NODE );

console.log("Output", result, "should equal", { a: 1, c: 3, b: 2 });