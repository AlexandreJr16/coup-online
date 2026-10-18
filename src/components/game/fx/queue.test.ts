import { test } from "node:test";
import assert from "node:assert/strict";
import { avancar, enfileirar, filaVazia, MAX_VISIVEIS, pular, reiniciar } from "./queue";
import type { FilaEvento } from "./queue";
import type { Cena, Prioridade } from "./types";
import { beat } from "./test-cena";

const c = (id: string, prioridade: Prioridade, dur = 1000, pulavel = true): Cena => ({
  id, prioridade, duracaoMax: dur, beats: [beat(0, dur - 200, { pulavel }), beat(dur - 200, 200, { final: true, pulavel })],
});
const ids = (ev: FilaEvento[], tipo: FilaEvento["tipo"]) =>
  ev.filter((e) => e.tipo === tipo).map((e) => ("cena" in e ? e.cena.id : "cenaId" in e ? e.cenaId : ""));

test("fila: cena entra, toca e termina no tempo", () => {
  let r = enfileirar(filaVazia(), [c("a", 2, 1000)], 0);
  assert.deepEqual(ids(r.eventos, "iniciar"), ["a"]);
  r = avancar(r.state, 999);
  assert.deepEqual(r.eventos, []);
  r = avancar(r.state, 1000);
  assert.deepEqual(ids(r.eventos, "terminar"), ["a"]);
  assert.equal(r.state.ativas.length, 0);
});

test("fila: máximo de 2 cenas visíveis; as demais esperam e entram quando abre vaga", () => {
  let r = enfileirar(filaVazia(), [c("a", 2), c("b", 2), c("c", 2)], 0);
  assert.equal(r.state.ativas.length, MAX_VISIVEIS);
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["c"]);
  r = avancar(r.state, 1000);
  assert.deepEqual(ids(r.eventos, "iniciar"), ["c"]);
});

test("fila: a mesma cena (mesmo id) não toca duas vezes", () => {
  let r = enfileirar(filaVazia(), [c("a", 2)], 0);
  r = enfileirar(r.state, [c("a", 2)], 10);
  assert.deepEqual(ids(r.eventos, "iniciar"), []);
  assert.equal(r.state.ativas.length, 1);
});

test("fila: prioridade 0 sem vaga vira estado final (instantânea), nunca espera", () => {
  let r = enfileirar(filaVazia(), [c("a", 2), c("b", 2)], 0);
  r = enfileirar(r.state, [c("renda", 0, 300)], 10);
  assert.deepEqual(ids(r.eventos, "instantanea"), ["renda"]);
  assert.equal(r.state.pendentes.length, 0);
});

test("fila: prioridade 0 durante um drama alto também é descartada", () => {
  let r = enfileirar(filaVazia(), [c("duelo", 3, 2600)], 0);
  r = enfileirar(r.state, [c("renda", 0, 300)], 10);
  assert.deepEqual(ids(r.eventos, "instantanea"), ["renda"]);
});

test("fila: coalescência, dez cenas de prioridade 1 seguidas deixam só a mais recente esperando", () => {
  let r = enfileirar(filaVazia(), [c("x1", 2), c("x2", 2)], 0); // ocupa as 2 vagas
  let instant = 0;
  for (let i = 1; i <= 10; i++) {
    r = enfileirar(r.state, [c(`d${i}`, 1, 400)], i);
    instant += ids(r.eventos, "instantanea").length;
  }
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["d10"]);
  assert.equal(instant, 9);
});

test("fila: prioridade 2 e 3 esperam em fila (não são descartadas)", () => {
  let r = enfileirar(filaVazia(), [c("a", 2), c("b", 2)], 0);
  r = enfileirar(r.state, [c("p2", 2), c("p3", 3)], 5);
  assert.deepEqual(r.state.pendentes.map((p) => p.id).sort(), ["p2", "p3"]);
  r = avancar(r.state, 1000);
  // prioridade maior entra primeiro
  assert.deepEqual(ids(r.eventos, "iniciar"), ["p3", "p2"]);
});

test("fila: só um drama alto por vez; o segundo espera inteiro", () => {
  let r = enfileirar(filaVazia(), [c("duelo", 3, 2600)], 0);
  r = enfileirar(r.state, [c("exilio", 3, 2600)], 100);
  assert.deepEqual(r.state.ativas.map((a) => a.cena.id), ["duelo"]);
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["exilio"]);
  r = avancar(r.state, 2600);
  assert.deepEqual(ids(r.eventos, "terminar"), ["duelo"]);
  assert.deepEqual(ids(r.eventos, "iniciar"), ["exilio"]);
});

test("fila: drama alto encurta as cenas de prioridade <= 1 que já tocavam", () => {
  let r = enfileirar(filaVazia(), [c("decl", 1, 1000)], 0);
  r = enfileirar(r.state, [c("duelo", 3, 2600)], 100);
  const decl = r.state.ativas.find((a) => a.cena.id === "decl")!;
  assert.ok(decl.fim <= 100 + 120);
  const duelo = r.state.ativas.find((a) => a.cena.id === "duelo")!;
  assert.equal(duelo.fim, 100 + 2600); // o drama alto toca inteiro
});

test("fila: aba oculta descarta tudo (estado final), sem replay", () => {
  let r = enfileirar(filaVazia(), [c("a", 2)], 0);
  r = enfileirar(r.state, [c("b", 3), c("c", 1)], 50, true);
  assert.deepEqual(ids(r.eventos, "terminar"), ["a"]);
  assert.deepEqual(ids(r.eventos, "instantanea"), ["b", "c"]);
  assert.equal(r.state.ativas.length, 0);
  assert.equal(r.state.pendentes.length, 0);
});

test("fila: pular salta ao beat final e mostra o carimbo por 400 ms", () => {
  let r = enfileirar(filaVazia(), [c("duelo", 3, 2600)], 0);
  r = pular(r.state, 500);
  assert.deepEqual(r.eventos, [{ tipo: "saltar", cenaId: "duelo", paraMs: 2600 }]);
  assert.equal(r.state.ativas[0].fim, 900);
  assert.deepEqual(ids(avancar(r.state, 900).eventos, "terminar"), ["duelo"]);
});

test("fila: pular perto do fim nunca estende a cena; pular duas vezes não repete", () => {
  let r = enfileirar(filaVazia(), [c("a", 3, 1000)], 0);
  const perto = pular(r.state, 950);
  assert.equal(perto.state.ativas[0].fim, 1000); // min(fim, agora + 400)
  r = pular(r.state, 100);
  const de_novo = pular(r.state, 120);
  assert.deepEqual(de_novo.eventos, []);
});

test("fila: pular não adianta cenas que ainda esperam", () => {
  let r = enfileirar(filaVazia(), [c("duelo", 3, 2600), c("exilio", 3, 2600)], 0);
  r = pular(r.state, 100);
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["exilio"]);
});

test("fila: revanche reinicia tudo", () => {
  let r = enfileirar(filaVazia(), [c("a", 2), c("b", 3)], 0);
  r = reiniciar(r.state);
  assert.deepEqual(ids(r.eventos, "terminar").sort(), ["a", "b"]);
  assert.deepEqual(r.state, filaVazia());
});

test("fila: é pura (não muta o estado de entrada)", () => {
  const s0 = enfileirar(filaVazia(), [c("a", 2)], 0).state;
  const snap = structuredClone(s0);
  enfileirar(s0, [c("b", 3)], 10);
  avancar(s0, 2000);
  pular(s0, 5);
  assert.deepEqual(s0, snap);
});

// ── Achados da auditoria do núcleo (ciclo 1) ──
test("fila (Q1): na coalescência fica a cena de MAIOR prioridade, não a última do lote", () => {
  let r = enfileirar(filaVazia(), [c("x1", 2), c("x2", 2)], 0);
  r = enfileirar(r.state, [c("decl", 1, 400), c("renda", 0, 300)], 10);
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["decl"]);
  assert.deepEqual(ids(r.eventos, "instantanea"), ["renda"]);
});

test("fila (Q3): pendentes descartadas por aba oculta ou por revanche viram 'instantanea'", () => {
  const r = enfileirar(filaVazia(), [c("a", 2), c("b", 2), c("p", 2)], 0);
  assert.deepEqual(r.state.pendentes.map((x) => x.id), ["p"]);
  const oculta = enfileirar(r.state, [], 5, true);
  assert.deepEqual(ids(oculta.eventos, "instantanea"), ["p"]);
  const reinicio = reiniciar(r.state);
  assert.deepEqual(ids(reinicio.eventos, "instantanea"), ["p"]);
});

test("fila (Q4): cena menor que chega DURANTE o drama alto sai logo", () => {
  let r = enfileirar(filaVazia(), [c("duelo", 3, 2600)], 0);
  r = enfileirar(r.state, [c("decl", 1, 1000)], 1);
  const decl = r.state.ativas.find((a) => a.cena.id === "decl")!;
  assert.equal(decl.fim, 1 + 120);
});

test("fila (Q5): drama alto não espera atrás de duas cenas menores: toma a vaga da mais antiga", () => {
  let r = enfileirar(filaVazia(), [c("d1", 1, 400)], 0);
  r = enfileirar(r.state, [c("d2", 1, 400)], 5);
  assert.equal(r.state.ativas.length, 2);
  r = enfileirar(r.state, [c("duelo", 3, 2600)], 20);
  assert.deepEqual(ids(r.eventos, "iniciar"), ["duelo"]);
  assert.deepEqual(ids(r.eventos, "terminar"), ["d1"]);
  assert.equal(r.state.ativas.length, MAX_VISIVEIS);
  assert.equal(r.state.pendentes.length, 0);
});

test("fila (Q5): drama alto NÃO toma a vaga de uma cena de prioridade 2", () => {
  let r = enfileirar(filaVazia(), [c("a", 2), c("b", 2)], 0);
  r = enfileirar(r.state, [c("duelo", 3, 2600)], 20);
  assert.deepEqual(r.state.pendentes.map((p) => p.id), ["duelo"]);
});

test("fila (Q7): pular ignora cena que não é pulável", () => {
  let r = enfileirar(filaVazia(), [c("a", 3, 2000, false)], 0);
  r = pular(r.state, 100);
  assert.deepEqual(r.eventos, []);
  assert.equal(r.state.ativas[0].fim, 2000);
});

test("fila (Q6): o mesmo id não toca duas vezes na partida, mas toca depois de reiniciar", () => {
  let r = enfileirar(filaVazia(), [c("decl#p1", 1, 400)], 0);
  r = avancar(r.state, 500);
  r = enfileirar(r.state, [c("decl#p1", 1, 400)], 60_000);
  assert.deepEqual(ids(r.eventos, "iniciar"), []); // regra: ids únicos por partida (use o contador)
  r = reiniciar(r.state);
  r = enfileirar(r.state, [c("decl#p1", 1, 400)], 61_000);
  assert.deepEqual(ids(r.eventos, "iniciar"), ["decl#p1"]);
});

test("fila: fuzz de 3000 passos mantém os invariantes (máx. 2 ativas, 1 drama alto, sem id duplicado)", () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let st = filaVazia();
  let now = 0;
  for (let i = 0; i < 3000; i++) {
    now += Math.floor(rnd() * 300);
    const k = rnd();
    const r = k < 0.5
      ? enfileirar(st, [c(`c${i}`, Math.floor(rnd() * 4) as Prioridade, 300 + Math.floor(rnd() * 1500))], now, rnd() < 0.05)
      : k < 0.85 ? avancar(st, now) : k < 0.97 ? pular(st, now) : reiniciar(st);
    st = r.state;
    assert.ok(st.ativas.length <= MAX_VISIVEIS);
    assert.ok(st.ativas.filter((a) => a.cena.prioridade === 3).length <= 1);
    const ids2 = [...st.ativas.map((a) => a.cena.id), ...st.pendentes.map((p) => p.id)];
    assert.equal(new Set(ids2).size, ids2.length);
  }
});
