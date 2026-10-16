// Testes do baralho e do embaralhamento (node:test).
// Rodar: npm test
//
// Origem: reclamação de "mal embaralhamento" no primeiro playtest. O código é
// Fisher-Yates; aqui provamos que (1) é uma permutação correta e (2) a distribuição
// é uniforme, e medimos com que frequência uma mão de 4 cartas sai com duas duplas
// (o caso do print: Capoeira, Regatão, Regatão, Capoeira), que é comum por natureza.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, shuffle, shuffleInPlace, type Rng } from "./deck";
import { ALL_CHARACTERS, type Character } from "../../types/game";

// RNG determinístico (mulberry32) — mesmo gerador usado em engine.test.ts.
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countBy(chars: readonly Character[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of chars) out[c] = (out[c] ?? 0) + 1;
  return out;
}

// Qui-quadrado de uma contagem contra a distribuição uniforme.
function chiSquareUniform(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = total / counts.length;
  return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
}

// Valor crítico do qui-quadrado com 4 graus de liberdade a 0,1% (p < 0,001).
const CHI2_DF4_P001 = 18.47;

const SHUFFLES = 20_000;

test("createDeck: 25 cartas, 5 de cada personagem", () => {
  const deck = createDeck();
  assert.equal(deck.length, 25);
  const counts = countBy(deck);
  for (const c of ALL_CHARACTERS) assert.equal(counts[c], 5, `cópias de ${c}`);
});

test("shuffle: devolve uma permutação e não muta a entrada", () => {
  const original = createDeck();
  const snapshot = [...original];
  const out = shuffle(original, seeded(1));
  assert.deepEqual(original, snapshot, "a entrada não pode mudar");
  assert.notEqual(out, original, "devolve outro array");
  assert.equal(out.length, original.length);
  assert.deepEqual(countBy(out), countBy(original), "mesmas cartas, mesma contagem");
});

test("shuffleInPlace: embaralha no próprio array preservando as cartas", () => {
  const deck = createDeck();
  const antes = countBy(deck);
  shuffleInPlace(deck, seeded(2));
  assert.deepEqual(countBy(deck), antes);
  assert.notDeepEqual(deck, createDeck(), "a ordem muda");
});

test("shuffle: mesma seed, mesmo resultado (determinismo do RNG injetável)", () => {
  assert.deepEqual(shuffle(createDeck(), seeded(99)), shuffle(createDeck(), seeded(99)));
  assert.notDeepEqual(shuffle(createDeck(), seeded(99)), shuffle(createDeck(), seeded(100)));
});

test("shuffle: a carta do topo e a do meio são uniformes (qui-quadrado)", () => {
  const rng = seeded(20261016);
  const topo = new Array(ALL_CHARACTERS.length).fill(0);
  const meio = new Array(ALL_CHARACTERS.length).fill(0);
  for (let i = 0; i < SHUFFLES; i++) {
    const deck = shuffle(createDeck(), rng);
    topo[ALL_CHARACTERS.indexOf(deck[deck.length - 1])]++; // topo = pop()
    meio[ALL_CHARACTERS.indexOf(deck[12])]++;
  }
  const chiTopo = chiSquareUniform(topo);
  const chiMeio = chiSquareUniform(meio);
  assert.ok(chiTopo < CHI2_DF4_P001, `topo fora do uniforme: χ²=${chiTopo.toFixed(2)} ${topo}`);
  assert.ok(chiMeio < CHI2_DF4_P001, `meio fora do uniforme: χ²=${chiMeio.toFixed(2)} ${meio}`);
});

test("shuffle: duas duplas em 4 cartas ocorrem ~7,9% das vezes (comum, não é bug)", (t) => {
  // 4 cartas de um baralho 5×5: duas duplas = C(5,2)·C(5,2)² / C(25,4) = 1000/12650.
  const esperado = 1000 / 12650;
  const rng = seeded(16102026);
  let duasDuplas = 0;
  for (let i = 0; i < SHUFFLES; i++) {
    const mao = shuffle(createDeck(), rng).slice(0, 4);
    const contagens = Object.values(countBy(mao)).sort();
    if (contagens.length === 2 && contagens[0] === 2 && contagens[1] === 2) duasDuplas++;
  }
  const medido = duasDuplas / SHUFFLES;
  t.diagnostic(
    `duas duplas em 4 cartas: medido ${(medido * 100).toFixed(2)}% (${duasDuplas}/${SHUFFLES}), esperado ${(esperado * 100).toFixed(2)}%`,
  );
  assert.ok(
    Math.abs(medido - esperado) < 0.008,
    `frequência de duas duplas fora do esperado: ${medido} vs ${esperado}`,
  );
});
