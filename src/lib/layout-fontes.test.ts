import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// BUG (build do Next): `subsets: [...CONSTANTE]` em next/font dá "Unexpected spread". O `tsc`
// e o `eslint` não pegam; só o Next na compilação. As opções de fonte têm que ser literais.
const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");

test("BUG layout: as opções do next/font são literais (sem spread)", () => {
  const chamadas = [...layout.matchAll(/=\s*(?:[A-Z][A-Za-z0-9_]*)\(\{([\s\S]*?)\}\);/g)].map((m) => m[1]);
  assert.ok(chamadas.length >= 4, "esperava achar as chamadas das fontes");
  for (const corpo of chamadas) {
    assert.doesNotMatch(corpo, /\.\.\./, "spread dentro das opções de uma fonte do next/font");
  }
});

test("BUG layout: subsets, weight e variable de cada fonte pixel estão escritos por extenso", () => {
  for (const nome of ["Pixelify_Sans", "Silkscreen", "VT323", "Press_Start_2P"]) {
    const m = new RegExp(`${nome}\\(\\{([\\s\\S]*?)\\}\\);`).exec(layout);
    assert.ok(m, `fonte ${nome} não encontrada`);
    assert.match(m[1], /subsets:\s*\["latin",\s*"latin-ext"\]/, `${nome}: subsets literais`);
    assert.match(m[1], /variable:\s*"--font-/, `${nome}: variable literal`);
  }
});
