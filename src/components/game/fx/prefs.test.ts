import { test } from "node:test";
import assert from "node:assert/strict";
import { cena } from "./test-cena";
import { adaptarCena, CHAVE_EFEITOS, lerPref, modoDeReproducao, parsePref, salvarPref } from "./prefs";
import { validarCena } from "./cena";

test("parsePref: valores válidos, inválidos e vazios", () => {
  assert.equal(parsePref("reduzido"), "reduzido");
  assert.equal(parsePref("desligado"), "desligado");
  assert.equal(parsePref("xyz"), "completo");
  assert.equal(parsePref(null), "completo");
  assert.equal(parsePref(undefined), "completo");
});

test("lerPref/salvarPref: usam a chave e sobrevivem a storage que lança ou não existe", () => {
  const mem: Record<string, string> = {};
  const st = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v) };
  salvarPref(st, "reduzido");
  assert.equal(mem[CHAVE_EFEITOS], "reduzido");
  assert.equal(lerPref(st), "reduzido");
  const quebrado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(lerPref(quebrado), "completo");
  assert.doesNotThrow(() => salvarPref(quebrado, "desligado"));
  assert.equal(lerPref(undefined), "completo");
});

test("modoDeReproducao: movimento reduzido do sistema vale mesmo com 'completo'", () => {
  assert.equal(modoDeReproducao("completo", false), "completo");
  assert.equal(modoDeReproducao("completo", true), "estatico");
  assert.equal(modoDeReproducao("reduzido", false), "estatico");
  assert.equal(modoDeReproducao("desligado", false), "nenhum");
  assert.equal(modoDeReproducao("desligado", true), "nenhum");
});

test("adaptarCena: completo mantém, nenhum remove, estático fica só com o carimbo final", () => {
  const c = cena({ prioridade: 3 });
  assert.equal(adaptarCena(c, "completo"), c);
  assert.equal(adaptarCena(c, "nenhum"), null);
  const e = adaptarCena(c, "estatico")!;
  assert.equal(e.beats.length, 1);
  assert.equal(e.beats[0].em, 0);
  assert.ok(e.duracaoMax <= 400);
  assert.equal(e.segurarDesfechoAte, undefined);
  assert.equal(e.beats[0].pulavel, false);
  assert.deepEqual(validarCena(e), []);
});

test("adaptarCena: cena sem beat final vira nada no modo estático", () => {
  const c = cena({ prioridade: 1, beats: [{ em: 0, dur: 300, alvo: { tipo: "centro" }, efeito: "vinheta" }] });
  assert.equal(adaptarCena(c, "estatico"), null);
});
