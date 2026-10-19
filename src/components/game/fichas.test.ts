// Testes de chipSprite e companhia (P07.S3): escolha determinística do sprite de fichas.
// Rodar: npm test
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { baseSprite, bauLevel, bauSprite, chipHash, chipSprite, chipVariant, monteBand, MAX_CHIP_SPRITE } from "./fichas";

const MAX_TESTADO = 50;
const noDisco = (url: string): boolean => existsSync(join(process.cwd(), "public", url));
const IDS = Array.from({ length: 300 }, (_, i) => `jogador-${i}-${(i * 2654435761) % 9973}`);

test("chipSprite é determinística: mesmo (jogador, quantidade), mesmo arquivo, sempre", () => {
  for (const id of ["barao", "caio", "voce", ""]) {
    for (let q = 0; q <= MAX_TESTADO; q++) assert.equal(chipSprite(q, id), chipSprite(q, id));
  }
  assert.equal(chipHash("caio", 7), chipHash("caio", 7));
});

test("a escolha é estável entre versões: valores fixos (se isto quebrar, a pilha de todo mundo mudou)", () => {
  const esperado: Array<[string, number, string]> = [
    ["barao", 4, "/art/imperio/fichas/4/b.png"],
    ["caio", 7, "/art/imperio/fichas/7/b.png"],
    ["voce", 1, "/art/imperio/fichas/1/b.png"],
    ["x", 10, "/art/imperio/fichas/10/c.png"],
    ["barao", 12, "/art/imperio/fichas/monte/11-15/b.png"],
    ["ana", 30, "/art/imperio/fichas/monte/26+/a.png"],
  ];
  for (const [id, q, url] of esperado) assert.equal(chipSprite(q, id), url, `${id} com ${q}`);
});

test("0 fichas não tem sprite (null); negativo, NaN e infinito também", () => {
  assert.equal(chipSprite(0, "barao"), null);
  assert.equal(chipSprite(-0, "barao"), null);
  assert.equal(chipSprite(-3, "barao"), null);
  assert.equal(chipSprite(Number.NaN, "barao"), null);
  assert.equal(chipSprite(Number.POSITIVE_INFINITY, "barao"), null);
  assert.equal(baseSprite(0), null);
});

test("quantidade fracionária é truncada (3.9 = 3 fichas) e 0.5 vira sem sprite", () => {
  assert.equal(chipSprite(3.9, "barao"), chipSprite(3, "barao"));
  assert.equal(chipSprite(0.5, "barao"), null);
});

test("TODA quantidade de 1 a 50 (e além) cai num arquivo que EXISTE em disco, para vários jogadores", () => {
  for (const id of ["barao", "caio", "voce", ...IDS.slice(0, 40)]) {
    for (let q = 1; q <= MAX_TESTADO; q++) {
      const url = chipSprite(q, id);
      assert.ok(url !== null && url.endsWith(".png"), `${id}/${q}: ${url}`);
      assert.ok(noDisco(url), `${id} com ${q} fichas aponta para ${url}, que não existe`);
    }
  }
  for (const q of [51, 99, 100, 1000, 100000]) assert.ok(noDisco(chipSprite(q, "barao") as string), `${q}`);
});

test("cada combinação possível de arquivo existe: 30 sprites, 6 montes, 4 baús, e o Erário", () => {
  const vistos = new Set<string>();
  for (const id of IDS) for (let q = 1; q <= 30; q++) vistos.add(chipSprite(q, id) as string);
  // 10 quantidades x 3 variantes + 3 faixas x 2 variantes: nenhuma ficou sem ser sorteada
  assert.equal(vistos.size, 10 * 3 + 3 * 2);
  for (const url of vistos) assert.ok(noDisco(url), url);
  for (let q = 0; q <= MAX_TESTADO; q++) {
    assert.ok(noDisco(bauSprite(q)), `baú de ${q}`);
    const b = baseSprite(q);
    if (q >= 1) assert.ok(b !== null && noDisco(b), `monte do Erário com ${q}`);
  }
});

test("1 a 10 usa o sprite da própria quantidade; 11+ usa o monte da faixa", () => {
  for (let q = 1; q <= MAX_CHIP_SPRITE; q++) assert.match(chipSprite(q, "barao") as string, new RegExp(`/fichas/${q}/[abc]\\.png$`));
  assert.match(chipSprite(11, "barao") as string, /\/fichas\/monte\/11-15\/[ab]\.png$/);
  assert.match(chipSprite(15, "barao") as string, /\/fichas\/monte\/11-15\/[ab]\.png$/);
  assert.match(chipSprite(16, "barao") as string, /\/fichas\/monte\/16-25\/[ab]\.png$/);
  assert.match(chipSprite(25, "barao") as string, /\/fichas\/monte\/16-25\/[ab]\.png$/);
  assert.match(chipSprite(26, "barao") as string, /\/fichas\/monte\/26\+\/[ab]\.png$/);
  assert.match(chipSprite(40, "barao") as string, /\/fichas\/monte\/26\+\/[ab]\.png$/);
});

test("faixas do monte e níveis do baú nas bordas (10/11, 15/16, 25/26)", () => {
  assert.deepEqual([0, 1, 10, 11, 15, 16, 25, 26, 99].map(monteBand), [null, null, null, "11-15", "11-15", "16-25", "16-25", "26+", "26+"]);
  assert.deepEqual([0, 10, 11, 15, 16, 25, 26, 99].map(bauLevel), ["vazio", "vazio", "11-15", "11-15", "16-25", "16-25", "26+", "26+"]);
  assert.equal(bauSprite(0), "/art/imperio/fichas/bau/vazio.png");
  assert.equal(bauSprite(26), "/art/imperio/fichas/bau/26+.png");
});

test("as 3 variantes se distribuem entre jogadores diferentes (nenhuma sai de menos de 25% nem de mais de 42%)", () => {
  for (let q = 1; q <= MAX_CHIP_SPRITE; q++) {
    const cont = [0, 0, 0];
    for (const id of IDS) cont[chipVariant(id, q)]++;
    cont.forEach((c, v) => {
      const f = c / IDS.length;
      assert.ok(f > 0.25 && f < 0.42, `quantidade ${q}, variante ${v}: ${(f * 100).toFixed(1)}%`);
    });
  }
});

test("os 2 montes também se distribuem (40% a 60% cada um) para 11+", () => {
  for (const q of [11, 14, 16, 22, 26, 40]) {
    const a = IDS.filter((id) => (chipSprite(q, id) as string).endsWith("/a.png")).length / IDS.length;
    assert.ok(a > 0.4 && a < 0.6, `quantidade ${q}: variante a em ${(a * 100).toFixed(1)}%`);
  }
});

test("um jogador vê variedade ao longo de 1..10: sempre 2+ variantes e, na maioria, as 3", () => {
  let comTres = 0;
  const ids = ["barao", "caio", "voce", ...IDS.slice(0, 97)];
  for (const id of ids) {
    const usadas = new Set<number>();
    for (let q = 1; q <= MAX_CHIP_SPRITE; q++) usadas.add(chipVariant(id, q));
    assert.ok(usadas.size >= 2, `${id}: só viu a variante ${[...usadas].join(",")}`);
    if (usadas.size === 3) comTres++;
  }
  assert.ok(comTres / ids.length > 0.85, `só ${comTres}/${ids.length} jogadores viram as 3 variantes`);
});

test("jogadores diferentes com a mesma quantidade NÃO mostram pilhas idênticas na maioria das vezes", () => {
  for (let q = 1; q <= MAX_CHIP_SPRITE; q++) {
    let iguais = 0;
    let pares = 0;
    for (let i = 0; i + 1 < IDS.length; i += 1) {
      pares++;
      if (chipSprite(q, IDS[i]) === chipSprite(q, IDS[i + 1])) iguais++;
    }
    assert.ok(iguais / pares < 0.45, `quantidade ${q}: ${iguais}/${pares} pares com a mesma pilha`);
  }
  // mesa típica: 6 jogadores com a mesma quantidade quase nunca mostram só uma pilha repetida
  let mesasRepetidas = 0;
  for (let q = 1; q <= MAX_CHIP_SPRITE; q++) {
    for (let m = 0; m + 6 <= 60; m += 6) {
      const pilhas = new Set(IDS.slice(m, m + 6).map((id) => chipSprite(q, id)));
      if (pilhas.size === 1) mesasRepetidas++;
    }
  }
  assert.equal(mesasRepetidas, 0);
});

test("o id do jogador entra no hash: ordem e separador não confundem (a:12 != a1:2)", () => {
  assert.notEqual(chipHash("a", 12), chipHash("a1", 2));
  assert.notEqual(chipHash("ab", 1), chipHash("ba", 1));
});

test("o Erário (sem dono) escolhe pelo id fixo e não muda entre chamadas", () => {
  for (let q = 1; q <= MAX_TESTADO; q++) assert.equal(baseSprite(q), chipSprite(q, "erario"));
});
