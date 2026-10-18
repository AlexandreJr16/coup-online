import { test } from "node:test";
import assert from "node:assert/strict";
import { duracaoDaCena, saltoDePular, validarCena } from "./cena";
import { beat, cena } from "./test-cena";


test("validarCena: cena correta não tem erro", () => {
  assert.deepEqual(validarCena(cena()), []);
});

test("validarCena: beat que passa de duracaoMax, negativo ou sem duração", () => {
  assert.equal(validarCena(cena({ beats: [beat(900, 200)] })).length, 1);
  assert.equal(validarCena(cena({ beats: [beat(-1, 100)] })).length, 1);
  assert.equal(validarCena(cena({ beats: [beat(0, 0)] })).length, 1);
});

test("validarCena: sem beats, teto absoluto e prioridade 3 sem beat final", () => {
  assert.ok(validarCena(cena({ beats: [] })).some((e) => /sem beats/.test(e)));
  assert.ok(validarCena(cena({ duracaoMax: 3001 })).some((e) => /duracaoMax/.test(e)));
  assert.ok(validarCena(cena({ prioridade: 3, beats: [beat(0, 500)] })).some((e) => /beat final/.test(e)));
});

test("validarCena: beat pulável exige um beat final", () => {
  assert.ok(validarCena(cena({ beats: [beat(0, 500, { pulavel: true })] })).some((e) => /pulável/.test(e)));
});

test("validarCena: segurarDesfechoAte precisa caber na cena", () => {
  assert.equal(validarCena(cena({ segurarDesfechoAte: 800 })).length, 0);
  assert.ok(validarCena(cena({ segurarDesfechoAte: 1200 })).some((e) => /fora da cena/.test(e)));
});

test("saltoDePular e duracaoDaCena", () => {
  assert.equal(saltoDePular(cena()), 900);
  assert.equal(saltoDePular(cena({ beats: [beat(0, 300)] })), 1000); // sem final: vai ao fim
  assert.equal(duracaoDaCena(cena()), 900);
  assert.equal(duracaoDaCena(cena({ duracaoMax: 600 })), 600); // teto
});

test("validarCena (Q2): tempos não finitos (NaN/Infinity) são recusados", () => {
  assert.ok(validarCena(cena({ duracaoMax: NaN })).some((e) => /não finito/.test(e)));
  assert.ok(validarCena(cena({ beats: [beat(NaN, 100)] })).some((e) => /não finito/.test(e)));
  assert.ok(validarCena(cena({ beats: [beat(0, Infinity)] })).some((e) => /não finito/.test(e)));
  assert.ok(validarCena(cena({ segurarDesfechoAte: NaN })).some((e) => /não finito/.test(e)));
});

test("validarCena: teto por prioridade (frequente é curta)", () => {
  assert.ok(validarCena(cena({ prioridade: 0, duracaoMax: 700, beats: [beat(0, 300)] })).some((e) => /prioridade 0/.test(e)));
  assert.ok(validarCena(cena({ prioridade: 1, duracaoMax: 1300, beats: [beat(0, 300)] })).some((e) => /prioridade 1/.test(e)));
  assert.deepEqual(validarCena(cena({ prioridade: 3, duracaoMax: 2700, beats: [beat(0, 2600, { final: true })] })), []);
});

test("validarCena: segurarDesfechoAte não pode passar do beat final (pular mostraria o desfecho cedo)", () => {
  assert.equal(validarCena(cena({ segurarDesfechoAte: 900 })).length, 0);
  assert.ok(validarCena(cena({ segurarDesfechoAte: 950 })).some((e) => /passa do beat final/.test(e)));
});
