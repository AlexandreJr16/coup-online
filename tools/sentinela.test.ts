// Sentinela do glob do npm test (P02.S1). Se estes nomes não aparecem na saída do
// `npm test`, o glob deixou de cobrir tools/**/*.test.ts. Não apagar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

test("P02.S1 sentinela: tools/**/*.test.ts roda no npm test", () => {
  assert.ok(true);
});

test("P02.S1 nenhum arquivo .test.tsx em src, tools ou tests (sem jsdom)", () => {
  const files = ["src", "tools", "tests"].flatMap((r) => walk(join(process.cwd(), r)));
  assert.ok(files.some((f) => f.endsWith("helpers.test.ts")), "controle positivo: a varredura enxerga testes");
  assert.deepEqual(files.filter((f) => f.endsWith(".test.tsx")), []);
});
