import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const path of ["src/main.ts","src/graph.ts","package.json","tsconfig.json"]) {
  test(path + " is executable source, not Markdown", () => {
    const content = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.doesNotMatch(content, /^\s*```/);
    assert.doesNotMatch(content, /\n```\s*$/);
    if (path.endsWith(".json")) assert.doesNotThrow(() => JSON.parse(content));
  });
}

test("event messages are validated and raw customer content is not logged", () => {
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  const graph = readFileSync(new URL("../src/graph.ts", import.meta.url), "utf8");
  assert.match(main, /CustomerPayload\.safeParse\(value\)/);
  assert.match(graph, /customerId: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(128\)/);
  assert.match(graph, /message: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(10000\)/);
  assert.doesNotMatch(main, /invalid JSON", raw/);
  assert.doesNotMatch(main, /decision sent", decision/);
});
