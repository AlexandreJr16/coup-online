// Testes do status da rodada (função pura). Rodar: npm test
// Jogadores do makeView: p1 = Ana, p2 = Bia, p3 = Caio.

import { test } from "node:test";
import assert from "node:assert/strict";

import type { GameView } from "@/src/types/game";
import { deriveRoundStatus } from "./status";
import { makeView, player } from "./test-utils";

const ANA = "p1";
const BIA = "p2";
const CAIO = "p3";

type Pending = NonNullable<GameView["pending"]>;
const pending = (over: Partial<Pending>): Pending => ({
  action: "taxas",
  actorId: ANA,
  targetId: null,
  claimedCharacter: "duque",
  block: null,
  passedIds: [],
  ...over,
});

test("turno: 'Vez de Ana' para os outros e 'Sua vez' para ela", () => {
  const v = makeView();
  const outro = deriveRoundStatus(v, BIA);
  assert.equal(outro.headline, "Vez de Ana");
  assert.equal(outro.detail, "Escolhendo uma ação");
  assert.equal(outro.turnPlayerId, ANA);
  assert.deepEqual(outro.waitingOnIds, [ANA]);
  assert.equal(outro.mine, false);

  const eu = deriveRoundStatus(v, ANA);
  assert.equal(eu.headline, "Sua vez");
  assert.equal(eu.detail, "Escolha uma ação");
  assert.equal(eu.mine, true);
});

test("turno: espectador (fora da mesa) vê sempre os nomes", () => {
  const s = deriveRoundStatus(makeView(), "espectador-x");
  assert.equal(s.headline, "Vez de Ana");
  assert.equal(s.mine, false);
});

test("turno: com 10+ moedas avisa que o Golpe é obrigatório", () => {
  const v = makeView({
    players: [player("p1", { name: "Ana", coins: 11 }), player("p2", { name: "Bia" }), player("p3", { name: "Caio" })],
  });
  assert.equal(deriveRoundStatus(v, BIA).detail, "Golpe de Estado obrigatório (11 moedas)");
  assert.equal(deriveRoundStatus(v, ANA).detail, "Golpe de Estado obrigatório (11 moedas)");
});

test("reação global (Taxas): quem declarou, o personagem alegado e quem pode contestar ou passar", () => {
  const v = makeView({ phase: "janela_reacao_global", pending: pending({}) });
  const s = deriveRoundStatus(v, BIA);
  assert.equal(s.headline, "Ana declarou Taxas (Barão do Café)");
  assert.equal(s.detail, "Aguardando você e Caio: contestar ou passar");
  assert.deepEqual(s.waitingOnIds, [BIA, CAIO]);
  assert.equal(s.turnPlayerId, ANA);
});

test("reação global: quem declarou vê 'Você declarou' e a lista dos outros", () => {
  const v = makeView({ phase: "janela_reacao_global", pending: pending({}) });
  const s = deriveRoundStatus(v, ANA);
  assert.equal(s.headline, "Você declarou Taxas (Barão do Café)");
  assert.equal(s.detail, "Aguardando Bia e Caio: contestar ou passar");
});

test("reação global: quem já passou sai da espera e aparece em passedIds", () => {
  const v = makeView({ phase: "janela_reacao_global", pending: pending({ passedIds: [BIA] }) });
  const s = deriveRoundStatus(v, CAIO);
  assert.equal(s.detail, "Aguardando você: contestar ou passar");
  assert.deepEqual(s.waitingOnIds, [CAIO]);
  assert.deepEqual(s.passedIds, [BIA]);
});

test("Ajuda Externa (sem personagem alegado): ninguém contesta, qualquer um pode bloquear", () => {
  const v = makeView({
    phase: "janela_reacao_global",
    pending: pending({ action: "ajuda_externa", claimedCharacter: null }),
  });
  const s = deriveRoundStatus(v, BIA);
  assert.equal(s.headline, "Ana declarou Ajuda Externa");
  assert.equal(s.detail, "Aguardando você e Caio: bloquear ou passar");
});

test("reação da vítima (Assassinar): o alvo pode bloquear, os demais só contestar", () => {
  const v = makeView({
    phase: "janela_reacao_vitima",
    pending: pending({ action: "assassinar", targetId: BIA, claimedCharacter: "assassino" }),
  });
  const s = deriveRoundStatus(v, CAIO);
  assert.equal(s.headline, "Ana declarou Assassinar contra Bia (Capoeira)");
  // Bia (alvo) primeiro, com mais opções; Caio (eu) depois.
  assert.equal(s.detail, "Aguardando Bia: contestar, bloquear ou passar · você: contestar ou passar");
  assert.deepEqual(s.waitingOnIds.sort(), [BIA, CAIO]);

  const alvo = deriveRoundStatus(v, BIA);
  assert.equal(alvo.headline, "Ana declarou Assassinar contra você (Capoeira)");
  assert.equal(alvo.detail, "Aguardando você: contestar, bloquear ou passar · Caio: contestar ou passar");
});

test("bloqueio: quem bloqueou, com qual personagem, e quem pode contestar o bloqueio", () => {
  const v = makeView({
    phase: "janela_contestar_bloqueio",
    pending: pending({
      action: "extorquir",
      targetId: BIA,
      claimedCharacter: "capitao",
      block: { blockerId: BIA, character: "embaixador" },
    }),
  });
  const s = deriveRoundStatus(v, CAIO);
  assert.equal(s.headline, "Bia bloqueou Extorquir com Regatão");
  // O bloqueador não reage ao próprio bloqueio: sobram Ana (ator) e Caio.
  assert.equal(s.detail, "Aguardando Ana e você: contestar o bloqueio ou passar");
  assert.deepEqual(s.waitingOnIds, [ANA, CAIO]);

  const bloqueador = deriveRoundStatus(v, BIA);
  assert.equal(bloqueador.headline, "Você bloqueou Extorquir com Regatão");
});

test("reação: quando todos já passaram, diz que está resolvendo", () => {
  const v = makeView({ phase: "janela_reacao_global", pending: pending({ passedIds: [BIA, CAIO] }) });
  const s = deriveRoundStatus(v, ANA);
  assert.equal(s.detail, "Todos reagiram: resolvendo a jogada");
  assert.deepEqual(s.waitingOnIds, []);
});

test("jogador eliminado não é esperado na janela de reação", () => {
  const v = makeView({
    phase: "janela_reacao_global",
    players: [
      player("p1", { name: "Ana" }),
      player("p2", { name: "Bia" }),
      player("p3", { name: "Caio", eliminated: true }),
    ],
    pending: pending({}),
  });
  const s = deriveRoundStatus(v, ANA);
  assert.deepEqual(s.waitingOnIds, [BIA]);
  assert.equal(s.detail, "Aguardando Bia: contestar ou passar");
});

test("revelação: quem perdeu influência escolhe a carta (eu vs. os outros)", () => {
  const v = makeView({ phase: "aguardando_revelacao", mustRevealPlayerId: BIA, pending: null });
  const outro = deriveRoundStatus(v, ANA);
  assert.equal(outro.headline, "Bia perdeu uma influência");
  assert.equal(outro.detail, "Escolhendo qual carta revelar");
  assert.deepEqual(outro.waitingOnIds, [BIA]);

  const eu = deriveRoundStatus(v, BIA);
  assert.equal(eu.headline, "Você perdeu uma influência");
  assert.equal(eu.detail, "Escolha qual carta revelar");
});

test("troca: o jogador da vez escolhe as cartas (eu vs. os outros)", () => {
  const v = makeView({ phase: "aguardando_troca", pending: null });
  assert.equal(deriveRoundStatus(v, BIA).headline, "Ana está trocando cartas");
  assert.equal(deriveRoundStatus(v, BIA).detail, "Escolhendo quais cartas manter");
  assert.equal(deriveRoundStatus(v, ANA).headline, "Você está trocando cartas");
  assert.equal(deriveRoundStatus(v, ANA).detail, "Escolha quais cartas manter");
});

test("fim de jogo: anuncia o vencedor e não tem ninguém na vez", () => {
  const v = makeView({ phase: "fim_de_jogo", winnerId: BIA, currentPlayerId: null, timer: null });
  const s = deriveRoundStatus(v, ANA);
  assert.equal(s.headline, "Bia venceu!");
  assert.equal(s.turnPlayerId, null);
  assert.deepEqual(s.waitingOnIds, []);
  assert.equal(deriveRoundStatus(v, BIA).headline, "Você venceu!");
});

test("o status nunca expõe carta oculta: só usa nomes públicos, mesmo com mãos reveladas na view", () => {
  const v = makeView({
    phase: "janela_reacao_global",
    pending: pending({}),
    players: [
      player("p1", { name: "Ana", hand: ["duque", "assassino"] }), // minha mão (visível só para mim)
      player("p2", { name: "Bia" }),
      player("p3", { name: "Caio" }),
    ],
  });
  const texto = JSON.stringify(deriveRoundStatus(v, ANA));
  // O Capoeira (assassino) está na mão da Ana, mas não é alegado: não pode aparecer.
  assert.ok(!texto.includes("Capoeira"), texto);
});
