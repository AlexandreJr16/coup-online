import { test } from "node:test";
import assert from "node:assert/strict";
import { challengePair, makeView } from "../test-utils";
import { viewForPlayer } from "@/src/lib/game/engine";
import { criarHold, HOLD_ESPERA_MAX_MS, iniciarHold, liberarHold, liberarHolds, podarHolds, viewEfetiva } from "./hold";
import { toPublicView } from "./publica";

const antes = toPublicView(makeView({ phase: "janela_reacao_global", mustRevealPlayerId: null }));
const real = toPublicView(makeView({ phase: "aguardando_revelacao", mustRevealPlayerId: "p1" }));

test("hold: enquanto a cena espera, a view anterior segue exibida; depois do início, até o veredito", () => {
  let hs = [criarHold("duelo#1", antes, 1, 1000)];
  assert.equal(viewEfetiva(real, hs, 1500), antes); // cena ainda na fila
  hs = iniciarHold(hs, "duelo#1", 2000, 1900);
  assert.equal(viewEfetiva(real, hs, 2000), antes);
  assert.equal(viewEfetiva(real, hs, 3899), antes);
  assert.equal(viewEfetiva(real, hs, 3900), real);
});

test("hold: sem holds a view é a real", () => {
  assert.equal(viewEfetiva(real, [], 0), real);
});

test("hold: o teto de 3 s vale mesmo se a cena pedir mais; duração inválida não segura", () => {
  const h = iniciarHold([criarHold("c", antes, 1, 0)], "c", 0, 99999)[0];
  assert.equal(h.ate, 3000);
  assert.equal(iniciarHold([criarHold("c", antes, 1, 0)], "c", 10, NaN)[0].ate, 10);
  assert.equal(iniciarHold([criarHold("c", antes, 1, 0)], "c", 10, -5)[0].ate, 10);
});

test("hold: cena travada na fila não prende a UI para sempre", () => {
  const hs = [criarHold("c", antes, 1, 0)];
  assert.equal(viewEfetiva(real, hs, HOLD_ESPERA_MAX_MS - 1), antes);
  assert.equal(viewEfetiva(real, hs, HOLD_ESPERA_MAX_MS), real);
});

test("hold: hold de outra partida (revanche) é ignorado", () => {
  const m2 = toPublicView(makeView({ matchNumber: 2 }));
  assert.equal(viewEfetiva(m2, [criarHold("c", antes, 1, 0)], 100), m2);
});

test("hold: relógio incoerente (agora antes da criação, ex.: outro relógio) não prende a UI", () => {
  const h = criarHold("c", antes, 1, 1_700_000_000_000); // Date.now
  assert.equal(viewEfetiva(real, [h], 5000), real); // performance.now
});

test("hold: vários ativos usam o mais antigo; podar remove vencidos; liberar por cena e liberar tudo", () => {
  const velho = iniciarHold([criarHold("a", antes, 1, 0)], "a", 0, 2000)[0];
  const novo = iniciarHold([criarHold("b", real, 1, 500)], "b", 500, 2000)[0];
  assert.equal(viewEfetiva(real, [velho, novo], 1000), antes);
  assert.deepEqual(podarHolds([velho, novo], real, 2100), [novo]);
  assert.deepEqual(liberarHold([velho, novo], "a"), [novo]);
  assert.deepEqual(liberarHolds(), []);
});

test("hold + engine: a legenda do desfecho (mustRevealPlayerId) não aparece antes do veredito", () => {
  const { afterAction, truth, bluff } = challengePair();
  const pre = toPublicView(viewForPlayer(afterAction.truth, "p3"));
  let holds = [criarHold("duelo#1", pre, 1, 0)];
  holds = iniciarHold(holds, "duelo#1", 0, 1900);
  for (const final of [truth, bluff]) {
    const r = toPublicView(viewForPlayer(final, "p3"));
    const exibida = viewEfetiva(r, holds, 1000);
    assert.equal(exibida.mustRevealPlayerId, pre.mustRevealPlayerId);
    assert.equal(exibida.lastChallenge, pre.lastChallenge);
    assert.deepEqual(exibida.stats, pre.stats);
  }
  const a = viewEfetiva(toPublicView(viewForPlayer(truth, "p3")), holds, 1000);
  const b = viewEfetiva(toPublicView(viewForPlayer(bluff, "p3")), holds, 1000);
  assert.deepEqual(a, b);
  const a2 = viewEfetiva(toPublicView(viewForPlayer(truth, "p3")), holds, 1900);
  const b2 = viewEfetiva(toPublicView(viewForPlayer(bluff, "p3")), holds, 1900);
  assert.notDeepEqual(a2, b2);
});
