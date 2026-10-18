// Testes das funções puras do mockup de fichas (protótipo do chipSprite do plano, B3/P07).
// O glob do `npm test` não cobre app/: rode com
//   node --import tsx --test app/dev/v3/mesa/fichas.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  faixaBaralho,
  hashFicha,
  MAX_FICHAS,
  nivelErario,
  spriteBau,
  spriteFichas,
  spriteMonte,
  varianteFicha,
  varianteTroca,
  type Variante,
} from "./fichas";

test("varianteFicha é determinística para o mesmo (jogador, quantidade)", () => {
  assert.equal(varianteFicha("barao", 4), varianteFicha("barao", 4));
  assert.equal(hashFicha("caio", 7), hashFicha("caio", 7));
});

test("varianteFicha sempre devolve 0, 1 ou 2", () => {
  for (const id of ["a", "barao", "caio", "voce", "x".repeat(40)]) {
    for (let q = 0; q <= 30; q++) assert.ok([0, 1, 2].includes(varianteFicha(id, q)));
  }
});

test("as variantes se distribuem entre quantidades e entre jogadores", () => {
  const usadas = new Set<Variante>();
  for (let q = 1; q <= MAX_FICHAS; q++) usadas.add(varianteFicha("barao", q));
  assert.equal(usadas.size, 3, "um jogador vê as 3 variantes ao longo de 1..10");
  let diferentes = 0;
  for (let q = 1; q <= MAX_FICHAS; q++) if (varianteFicha("barao", q) !== varianteFicha("caio", q)) diferentes++;
  assert.ok(diferentes >= 4, `jogadores diferentes devem divergir na maioria das quantidades (divergiram ${diferentes})`);
});

test("varianteTroca anda A, B, C, A... a cada mudança", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(varianteTroca), [0, 1, 2, 0, 1]);
});

test("toda quantidade de 1 a 10 tem um sprite próprio por variante, todos diferentes entre si", () => {
  const vistos = new Set<string>();
  for (let q = 1; q <= MAX_FICHAS; q++) {
    for (const v of [0, 1, 2] as const) {
      const rows = spriteFichas(q, v);
      assert.ok(rows.length > 0 && rows.every((r) => r.length === rows[0].length), "grade retangular");
      vistos.add(rows.join("/"));
    }
  }
  // 30 combinações; só a ficha única deitada pode coincidir entre B e C
  assert.ok(vistos.size >= 29, `esperava 29+ sprites distintos, deu ${vistos.size}`);
});

test("faixas do Erário: 0-10, 11-15, 16-25 e 26+", () => {
  assert.deepEqual([0, 10, 11, 15, 16, 25, 26, 99].map(nivelErario), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test("faixas do baralho: cheio, médio, pouco, última e vazio", () => {
  assert.deepEqual(
    [0, 1, 2, 8, 9, 15, 16, 25].map(faixaBaralho),
    ["vazio", "ultima", "pouco", "pouco", "medio", "medio", "cheio", "cheio"],
  );
});

test("montes e baú existem para todas as faixas e variantes", () => {
  for (const n of [1, 2, 3] as const) {
    for (const v of [0, 1] as const) assert.ok(spriteMonte(n, v).length > 0);
  }
  for (const n of [0, 1, 2, 3] as const) assert.ok(spriteBau(n).length > 0);
});
