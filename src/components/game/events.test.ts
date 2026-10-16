// Testes (retroativos) da derivação de eventos do Feed/selos/Economia viva.
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { deriveEvents } from "./events";
import { makeView, player } from "./test-utils";

const ids = () => {
  let n = 0;
  return () => ++n;
};
const pend = (over = {}) => ({
  action: "taxas" as const, actorId: "p1", targetId: null, claimedCharacter: "duque" as const,
  block: null, passedIds: [], ...over,
});

test("sem mudança entre as views: nada é derivado", () => {
  const v = makeView();
  const d = deriveEvents(v, v, ids());
  assert.deepEqual(d.log, []);
  assert.equal(d.block, null);
  assert.equal(d.challenge, null);
  assert.deepEqual(d.coinDeltas, {});
});

test("ação declarada entra no feed com o alvo, uma vez só", () => {
  const prev = makeView();
  const cur = makeView({ phase: "janela_reacao_vitima", pending: pend({ action: "assassinar", targetId: "p2" }) });
  const d = deriveEvents(prev, cur, ids());
  assert.equal(d.log.length, 1);
  assert.equal(d.log[0].kind, "action");
  assert.match(d.log[0].text, /Ana declarou Assassinar em Bia/);
  // a mesma ação na view seguinte (alguém passou) não duplica
  const cur2 = makeView({ phase: "janela_reacao_vitima", pending: pend({ action: "assassinar", targetId: "p2", passedIds: ["p3"] }) });
  assert.equal(deriveEvents(cur, cur2, ids()).log.length, 0);
});

test("bloqueio novo gera log e o evento do selo", () => {
  const prev = makeView({ phase: "janela_reacao_global", pending: pend({ action: "ajuda_externa", claimedCharacter: null }) });
  const cur = makeView({
    phase: "janela_contestar_bloqueio",
    pending: pend({ action: "ajuda_externa", claimedCharacter: null, block: { blockerId: "p2", character: "duque" } }),
  });
  const d = deriveEvents(prev, cur, ids());
  assert.equal(d.block?.blockerId, "p2");
  assert.equal(d.block?.character, "duque");
  assert.ok(d.log.some((l) => l.kind === "block" && /Bia bloqueou/.test(l.text)));
});

test("contestação pública: todos derivam o mesmo selo e o veredito (verdade x blefe)", () => {
  const prev = makeView();
  const lc = { n: 1, challengerId: "p2", accusedId: "p1", claimed: "duque" as const, kind: "action" as const };
  const verdade = deriveEvents(prev, makeView({ lastChallenge: { ...lc, accusedHadCard: true } }), ids());
  assert.equal(verdade.challenge?.title, "Bia contestou Ana");
  assert.match(verdade.challenge!.verdict, /^Tinha/);
  const blefe = deriveEvents(prev, makeView({ lastChallenge: { ...lc, accusedHadCard: false } }), ids());
  assert.match(blefe.challenge!.verdict, /^Era blefe/);
  assert.ok(blefe.log.some((l) => l.kind === "challenge"));
});

test("contestação já vista (mesmo n) não dispara de novo — nem ao reconectar", () => {
  const lc = { n: 3, challengerId: "p2", accusedId: "p1", claimed: "duque" as const, kind: "action" as const, accusedHadCard: true };
  const v = makeView({ lastChallenge: lc });
  assert.equal(deriveEvents(v, makeView({ lastChallenge: lc, treasury: 40 }), ids()).challenge, null);
});

test("carta revelada vira 'perdeu' e, quando elimina, 'foi exilado'", () => {
  const prev = makeView({ players: [player("p1", { name: "Ana", hand: ["duque", "assassino"] }), player("p2", { name: "Bia" })] });
  const cur = makeView({
    players: [
      player("p1", { name: "Ana", hand: ["duque", "assassino"] }),
      player("p2", { name: "Bia", eliminated: true, cards: [
        { character: "capitao", revealed: true },
        { character: "embaixador", revealed: true },
      ] }),
    ],
  });
  const d = deriveEvents(prev, cur, ids());
  assert.equal(d.log.filter((l) => l.kind === "reveal").length, 2);
  assert.ok(d.log.some((l) => l.kind === "eliminate" && /Bia foi exilado/.test(l.text)));
});

test("vencedor aparece uma vez", () => {
  const prev = makeView();
  const cur = makeView({ phase: "fim_de_jogo", winnerId: "p1" });
  assert.ok(deriveEvents(prev, cur, ids()).log.some((l) => l.kind === "winner" && /Ana venceu/.test(l.text)));
  assert.equal(deriveEvents(cur, cur, ids()).log.length, 0);
});

test("deltas de moeda só dos jogadores que mudaram (positivo e negativo)", () => {
  const prev = makeView({ players: [player("p1", { coins: 2 }), player("p2", { coins: 5 }), player("p3", { coins: 4 })] });
  const cur = makeView({ players: [player("p1", { coins: 5 }), player("p2", { coins: 3 }), player("p3", { coins: 4 })] });
  assert.deepEqual(deriveEvents(prev, cur, ids()).coinDeltas, { p1: 3, p2: -2 });
});

test("ids dos eventos são únicos e crescentes", () => {
  const prev = makeView();
  const cur = makeView({
    phase: "janela_reacao_global",
    pending: pend(),
    lastChallenge: { n: 1, challengerId: "p2", accusedId: "p1", claimed: "duque", accusedHadCard: false, kind: "action" },
  });
  const d = deriveEvents(prev, cur, ids());
  const all = [...d.log.map((l) => l.id), d.challenge!.id];
  assert.equal(new Set(all).size, all.length);
});
