// Engine de regras do Coup — máquina de estados pura e server-authoritative.
// Fiel a game-rules.md e ao diagrama de estados aprovado.
//
// Modelo: reducer puro `applyEvent(state, event) -> { state, error }`.
//  - Toda regra roda aqui (servidor); o cliente só manda eventos e recebe a view.
//  - applyEvent NÃO muta a entrada: clona, aplica, retorna o novo estado. Em
//    evento inválido, retorna o estado original + mensagem de erro.
//  - O RNG é injetável (default Math.random) para testes determinísticos.
//
// A resolução de uma jogada é uma FILA de efeitos (state.resolution). Efeitos
// instantâneos (moedas, troca de carta) aplicam na hora; perda de influência com
// 2 cartas e a Troca PAUSAM a fila pedindo input — é o que permite encadear o
// "perigo duplo do Assassino" sem casos especiais ad-hoc.

import { createDeck, shuffle, shuffleInPlace, type Rng } from "./deck";
import type {
  Character,
  Effect,
  EngineResult,
  GameConfig,
  GameEvent,
  GameState,
  GameView,
  PendingAction,
  Phase,
  PlayerState,
} from "../../types/game";

const TREASURY_TOTAL = 50; // total de moedas do jogo (Coup base)

// Erro de regra (evento inválido). Diferenciado de erro interno (bug).
class EngineError extends Error {}

// ── Setup: transição `partida_iniciada` do diagrama ─────────────────────────
export function createGame(
  players: ReadonlyArray<{ id: string; name: string }>,
  configInput: Partial<GameConfig> = {},
  rng: Rng = Math.random,
): GameState {
  if (players.length < 2 || players.length > 6) {
    throw new EngineError("Coup requer de 2 a 6 jogadores.");
  }
  const ids = new Set(players.map((p) => p.id));
  if (ids.size !== players.length) {
    throw new EngineError("IDs de jogadores duplicados.");
  }

  const deck = shuffle(createDeck(), rng);
  const playerStates: PlayerState[] = players.map((p) => {
    const c1 = deck.pop()!;
    const c2 = deck.pop()!;
    return {
      id: p.id,
      name: p.name,
      coins: 2,
      cards: [
        { character: c1, revealed: false },
        { character: c2, revealed: false },
      ],
    };
  });

  return {
    phase: "aguardando_acao",
    players: playerStates,
    order: players.map((p) => p.id),
    currentPlayerIndex: 0,
    deck,
    treasury: TREASURY_TOTAL - playerStates.length * 2,
    config: normalizeConfig(configInput),
    pending: null,
    resolution: [],
    mustRevealPlayerId: null,
    exchange: null,
    winnerId: null,
  };
}

function normalizeConfig(c: Partial<GameConfig>): GameConfig {
  return {
    globalReactionTime: clamp(c.globalReactionTime ?? 5, 3, 60),
    targetReactionTime: clamp(c.targetReactionTime ?? 15, 5, 120),
    challengeBlockTime: clamp(c.challengeBlockTime ?? 5, 3, 60),
  };
}

// ── Entrada principal ───────────────────────────────────────────────────────
export function applyEvent(
  state: GameState,
  event: GameEvent,
  rng: Rng = Math.random,
): EngineResult {
  const next = structuredClone(state);
  try {
    handle(next, event, rng);
  } catch (e) {
    if (e instanceof EngineError) return { state, error: e.message };
    throw e; // erro interno: não engole
  }
  return { state: next, error: null };
}

function handle(s: GameState, e: GameEvent, rng: Rng): void {
  switch (e.type) {
    case "action":
      return handleAction(s, e, rng);
    case "block":
      return handleBlock(s, e);
    case "challenge":
      return handleChallenge(s, e, rng);
    case "timeout":
      return handleTimeout(s, rng);
    case "reveal":
      return handleReveal(s, e, rng);
    case "exchange_choose":
      return handleExchangeChoose(s, e, rng);
  }
}

// ── aguardando_acao → declara ação ──────────────────────────────────────────
function handleAction(
  s: GameState,
  e: Extract<GameEvent, { type: "action" }>,
  rng: Rng,
): void {
  if (s.phase !== "aguardando_acao") {
    throw new EngineError("Não é hora de declarar uma ação.");
  }
  const actor = currentPlayer(s);
  if (actor.id !== e.playerId) throw new EngineError("Não é o seu turno.");

  // Obrigatoriedade de Golpe com 10+ moedas.
  if (actor.coins >= 10 && e.action !== "golpe") {
    throw new EngineError("Com 10+ moedas você é obrigado a dar Golpe de Estado.");
  }

  switch (e.action) {
    // Imediatas ──────────────────────────────────────────────────────────────
    case "renda":
      gain(s, actor.id, 1);
      advanceTurn(s);
      return;

    case "golpe": {
      const target = requireTarget(s, e.targetId, actor.id);
      if (actor.coins < 7) throw new EngineError("Golpe de Estado custa 7 moedas.");
      pay(s, actor.id, 7);
      s.resolution = [{ kind: "lose_influence", playerId: target.id }];
      runResolution(s, rng);
      return;
    }

    // Globais ──────────────────────────────────────────────────────────────────
    case "ajuda_externa":
      s.pending = mkPending("ajuda_externa", actor.id, null, null, 0);
      s.phase = "janela_reacao_global";
      return;

    case "taxas":
      s.pending = mkPending("taxas", actor.id, null, "duque", 0);
      s.phase = "janela_reacao_global";
      return;

    case "trocar":
      s.pending = mkPending("trocar", actor.id, null, "embaixador", 0);
      s.phase = "janela_reacao_global";
      return;

    // Targeted ────────────────────────────────────────────────────────────────
    case "assassinar": {
      const target = requireTarget(s, e.targetId, actor.id);
      if (actor.coins < 3) throw new EngineError("Assassinar custa 3 moedas.");
      pay(s, actor.id, 3); // pago já na declaração (devolvido só se desmascarado)
      s.pending = mkPending("assassinar", actor.id, target.id, "assassino", 3);
      s.phase = "janela_reacao_vitima";
      return;
    }

    case "extorquir": {
      const target = requireTarget(s, e.targetId, actor.id);
      s.pending = mkPending("extorquir", actor.id, target.id, "capitao", 0);
      s.phase = "janela_reacao_vitima";
      return;
    }
  }
}

// ── Bloqueio (nas janelas de reação) ────────────────────────────────────────
function handleBlock(
  s: GameState,
  e: Extract<GameEvent, { type: "block" }>,
): void {
  if (s.phase !== "janela_reacao_global" && s.phase !== "janela_reacao_vitima") {
    throw new EngineError("Não há ação para bloquear agora.");
  }
  const p = s.pending!;
  byIdAlive(s, e.playerId); // bloqueador precisa estar vivo e existir
  if (e.playerId === p.actorId) {
    throw new EngineError("O ator não pode bloquear a própria ação.");
  }
  if (!isLegalBlock(p, e.playerId, e.character)) {
    throw new EngineError("Bloqueio inválido para esta ação.");
  }
  p.block = { blockerId: e.playerId, character: e.character };
  s.phase = "janela_contestar_bloqueio";
}

// Quem pode bloquear o quê (game-rules.md, tabela de Ações Contrárias).
function isLegalBlock(
  p: PendingAction,
  blockerId: string,
  character: Character,
): boolean {
  switch (p.action) {
    case "ajuda_externa": // qualquer um, alegando Duque
      return character === "duque";
    case "assassinar": // só a vítima, alegando Condessa
      return blockerId === p.targetId && character === "condessa";
    case "extorquir": // só a vítima, alegando Capitão ou Embaixador
      return (
        blockerId === p.targetId &&
        (character === "capitao" || character === "embaixador")
      );
    default: // renda, golpe, taxas, trocar não são bloqueáveis
      return false;
  }
}

// ── Contestação (da ação OU do bloqueio, conforme a fase) ────────────────────
function handleChallenge(
  s: GameState,
  e: Extract<GameEvent, { type: "challenge" }>,
  rng: Rng,
): void {
  byIdAlive(s, e.playerId);
  if (s.phase === "janela_reacao_global" || s.phase === "janela_reacao_vitima") {
    return challengeAction(s, e.playerId, rng);
  }
  if (s.phase === "janela_contestar_bloqueio") {
    return challengeBlock(s, e.playerId, rng);
  }
  throw new EngineError("Nada para contestar agora.");
}

function challengeAction(s: GameState, challengerId: string, rng: Rng): void {
  const p = s.pending!;
  if (p.claimedCharacter === null) {
    throw new EngineError("Esta ação não alega personagem; não pode ser contestada.");
  }
  if (challengerId === p.actorId) {
    throw new EngineError("O ator não pode contestar a si mesmo.");
  }
  const actor = byId(s, p.actorId);
  const claimed = p.claimedCharacter;
  const effects: Effect[] = [];

  if (hasFaceDown(actor, claimed)) {
    // Contestado TEM a carta: contestante perde 1; ator troca a carta provada e
    // a AÇÃO PROSSEGUE.
    effects.push({ kind: "replace_card", playerId: actor.id, character: claimed });
    effects.push({ kind: "lose_influence", playerId: challengerId });
    effects.push(...successEffects(p));
  } else {
    // Contestado NÃO tem (blefe): ator perde 1; ação FALHA; moedas devolvidas.
    if (p.paidCoins > 0) {
      effects.push({ kind: "gain", playerId: actor.id, amount: p.paidCoins });
    }
    effects.push({ kind: "lose_influence", playerId: actor.id });
  }

  s.pending = null;
  s.resolution = effects;
  runResolution(s, rng);
}

function challengeBlock(s: GameState, challengerId: string, rng: Rng): void {
  const p = s.pending!;
  const block = p.block!;
  if (challengerId === block.blockerId) {
    throw new EngineError("O bloqueador não pode contestar o próprio bloqueio.");
  }
  const blocker = byId(s, block.blockerId);
  const effects: Effect[] = [];

  if (hasFaceDown(blocker, block.character)) {
    // Bloqueio legítimo: contestante perde 1; bloqueador troca a carta. A ação
    // fica BLOQUEADA — moedas pagas NÃO são devolvidas.
    effects.push({
      kind: "replace_card",
      playerId: blocker.id,
      character: block.character,
    });
    effects.push({ kind: "lose_influence", playerId: challengerId });
  } else {
    // Bloqueio blefado: bloqueador perde 1; a AÇÃO PROSSEGUE.
    effects.push({ kind: "lose_influence", playerId: blocker.id });
    effects.push(...successEffects(p));
  }

  s.pending = null;
  s.resolution = effects;
  runResolution(s, rng);
}

// ── Timeout: fecha a janela atual ───────────────────────────────────────────
function handleTimeout(s: GameState, rng: Rng): void {
  if (s.phase === "janela_reacao_global" || s.phase === "janela_reacao_vitima") {
    // Ninguém reagiu / vítima aceitou → ação prossegue.
    const p = s.pending!;
    s.pending = null;
    s.resolution = successEffects(p);
    runResolution(s, rng);
    return;
  }
  if (s.phase === "janela_contestar_bloqueio") {
    // Ninguém contestou o bloqueio → bloqueio bem-sucedido → ação falha.
    // Moedas pagas NÃO voltam (caso especial). Fila vazia → próximo turno.
    s.pending = null;
    s.resolution = [];
    runResolution(s, rng);
    return;
  }
  throw new EngineError("Nada para expirar agora.");
}

// Efeitos de uma ação que se resolve com sucesso (sem bloqueio / bloqueio caiu).
function successEffects(p: PendingAction): Effect[] {
  switch (p.action) {
    case "ajuda_externa":
      return [{ kind: "gain", playerId: p.actorId, amount: 2 }];
    case "taxas":
      return [{ kind: "gain", playerId: p.actorId, amount: 3 }];
    case "trocar":
      return [{ kind: "exchange", playerId: p.actorId }];
    case "assassinar":
      return [{ kind: "lose_influence", playerId: p.targetId! }];
    case "extorquir":
      return [{ kind: "steal", fromId: p.targetId!, toId: p.actorId, amount: 2 }];
    default:
      return []; // renda/golpe nunca passam por janela
  }
}

// ── Revelação de carta (aguardando_revelacao) ───────────────────────────────
function handleReveal(
  s: GameState,
  e: Extract<GameEvent, { type: "reveal" }>,
  rng: Rng,
): void {
  if (s.phase !== "aguardando_revelacao") {
    throw new EngineError("Nada para revelar agora.");
  }
  if (e.playerId !== s.mustRevealPlayerId) {
    throw new EngineError("Não é você que deve revelar uma carta.");
  }
  const p = byId(s, e.playerId);
  const card = p.cards[e.cardIndex];
  if (!card || card.revealed) {
    throw new EngineError("Carta inválida para revelar.");
  }
  revealCard(s, p, e.cardIndex);
  s.mustRevealPlayerId = null;
  runResolution(s, rng); // retoma a fila pendente (pode pausar de novo / acabar)
}

// ── Escolha da Troca (aguardando_troca) ─────────────────────────────────────
function handleExchangeChoose(
  s: GameState,
  e: Extract<GameEvent, { type: "exchange_choose" }>,
  rng: Rng,
): void {
  if (s.phase !== "aguardando_troca") {
    throw new EngineError("Nenhuma troca em andamento.");
  }
  const ex = s.exchange!;
  if (e.playerId !== ex.playerId) throw new EngineError("Não é a sua troca.");
  if (e.keep.length !== ex.keepCount) {
    throw new EngineError(`Você deve manter exatamente ${ex.keepCount} carta(s).`);
  }
  if (!isSubMultiset(e.keep, ex.pool)) {
    throw new EngineError("Seleção inválida: cartas fora do conjunto oferecido.");
  }

  const p = byId(s, ex.playerId);
  // Devolve as não escolhidas à Corte e reembaralha.
  for (const c of multisetSubtract(ex.pool, e.keep)) s.deck.push(c);
  shuffleInPlace(s.deck, rng);
  // Mantidas vão para os slots face-down (cartas reveladas permanecem).
  let k = 0;
  for (let i = 0; i < p.cards.length; i++) {
    if (!p.cards[i].revealed) {
      p.cards[i] = { character: e.keep[k++], revealed: false };
    }
  }
  s.exchange = null;
  runResolution(s, rng); // fila vazia → próximo turno
}

// ── Resolução: aplica a fila de efeitos, pausando quando precisa de input ────
function runResolution(s: GameState, rng: Rng): void {
  while (s.resolution.length > 0) {
    const eff = s.resolution[0];

    if (eff.kind === "lose_influence") {
      const p = byId(s, eff.playerId);
      const faceDown = p.cards.filter((c) => !c.revealed);
      if (faceDown.length === 0) {
        s.resolution.shift(); // já eliminado: nada a perder
        continue;
      }
      if (faceDown.length === 1) {
        revealCard(s, p, p.cards.findIndex((c) => !c.revealed));
        s.resolution.shift();
        continue;
      }
      // 2 cartas: jogador escolhe qual virar. Pausa a fila no restante.
      s.resolution.shift();
      s.mustRevealPlayerId = p.id;
      s.phase = "aguardando_revelacao";
      return;
    }

    if (eff.kind === "exchange") {
      const p = byId(s, eff.playerId);
      const drawn = [s.deck.pop()!, s.deck.pop()!]; // 2 cartas da Corte
      const faceDown = p.cards
        .filter((c) => !c.revealed)
        .map((c) => c.character);
      s.resolution.shift();
      s.exchange = {
        playerId: p.id,
        pool: [...faceDown, ...drawn],
        keepCount: faceDown.length,
      };
      s.phase = "aguardando_troca";
      return;
    }

    applyInstant(s, eff, rng);
    s.resolution.shift();
  }
  advanceTurn(s);
}

function applyInstant(s: GameState, eff: Effect, rng: Rng): void {
  switch (eff.kind) {
    case "gain":
      gain(s, eff.playerId, eff.amount);
      return;
    case "pay":
      pay(s, eff.playerId, eff.amount);
      return;
    case "steal":
      steal(s, eff.fromId, eff.toId, eff.amount);
      return;
    case "replace_card":
      replaceCard(s, eff.playerId, eff.character, rng);
      return;
    default:
      throw new Error(`interno: efeito não instantâneo em applyInstant: ${eff.kind}`);
  }
}

// ── proximo_turno: avança o ponteiro e checa fim de jogo ────────────────────
function advanceTurn(s: GameState): void {
  s.pending = null;
  s.resolution = [];
  s.exchange = null;
  s.mustRevealPlayerId = null;

  const alive = s.players.filter(isAlive);
  if (alive.length <= 1) {
    s.phase = "fim_de_jogo";
    s.winnerId = alive.length === 1 ? alive[0].id : null;
    return;
  }

  let idx = s.currentPlayerIndex;
  for (let step = 0; step < s.order.length; step++) {
    idx = (idx + 1) % s.order.length;
    if (isAlive(byId(s, s.order[idx]))) {
      s.currentPlayerIndex = idx;
      break;
    }
  }
  s.phase = "aguardando_acao";
}

// ── Mutadores de baixo nível ────────────────────────────────────────────────
function gain(s: GameState, id: string, n: number): void {
  const p = byId(s, id);
  const got = Math.min(n, s.treasury); // Tesouro é finito (Coup base: 50 moedas)
  p.coins += got;
  s.treasury -= got;
}

function pay(s: GameState, id: string, n: number): void {
  byId(s, id).coins -= n; // afford-check é feito antes (validação da ação)
  s.treasury += n;
}

function steal(s: GameState, fromId: string, toId: string, n: number): void {
  const from = byId(s, fromId);
  const amount = Math.min(n, from.coins); // se a vítima tem só 1, leva 1
  from.coins -= amount;
  byId(s, toId).coins += amount;
}

function revealCard(s: GameState, p: PlayerState, index: number): void {
  p.cards[index].revealed = true;
  if (p.cards.every((c) => c.revealed)) {
    // Exilado: devolve todas as moedas ao Tesouro.
    s.treasury += p.coins;
    p.coins = 0;
  }
}

function replaceCard(
  s: GameState,
  playerId: string,
  character: Character,
  rng: Rng,
): void {
  const p = byId(s, playerId);
  const idx = p.cards.findIndex((c) => !c.revealed && c.character === character);
  if (idx === -1) throw new Error("interno: carta a trocar não encontrada");
  s.deck.push(character); // devolve à Corte
  shuffleInPlace(s.deck, rng); // reembaralha
  p.cards[idx] = { character: s.deck.pop()!, revealed: false }; // saca nova
}

// ── Consultas auxiliares ────────────────────────────────────────────────────
function currentPlayer(s: GameState): PlayerState {
  return byId(s, s.order[s.currentPlayerIndex]);
}

function byId(s: GameState, id: string): PlayerState {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new Error(`interno: jogador ${id} não encontrado`);
  return p;
}

function byIdAlive(s: GameState, id: string): PlayerState {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new EngineError("Jogador inexistente.");
  if (!isAlive(p)) throw new EngineError("Jogador eliminado não pode agir.");
  return p;
}

function requireTarget(
  s: GameState,
  targetId: string | undefined,
  actorId: string,
): PlayerState {
  if (!targetId) throw new EngineError("Esta ação exige um alvo.");
  if (targetId === actorId) throw new EngineError("Você não pode se alvejar.");
  const t = s.players.find((p) => p.id === targetId);
  if (!t) throw new EngineError("Alvo inexistente.");
  if (!isAlive(t)) throw new EngineError("Alvo já foi eliminado.");
  return t;
}

function isAlive(p: PlayerState): boolean {
  return p.cards.some((c) => !c.revealed);
}

function hasFaceDown(p: PlayerState, character: Character): boolean {
  return p.cards.some((c) => !c.revealed && c.character === character);
}

function mkPending(
  action: PendingAction["action"],
  actorId: string,
  targetId: string | null,
  claimedCharacter: Character | null,
  paidCoins: number,
): PendingAction {
  return { action, actorId, targetId, claimedCharacter, paidCoins, block: null };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isSubMultiset(sub: Character[], sup: Character[]): boolean {
  const counts = new Map<Character, number>();
  for (const c of sup) counts.set(c, (counts.get(c) ?? 0) + 1);
  for (const c of sub) {
    const n = counts.get(c) ?? 0;
    if (n === 0) return false;
    counts.set(c, n - 1);
  }
  return true;
}

function multisetSubtract(sup: Character[], sub: Character[]): Character[] {
  const result = sup.slice();
  for (const c of sub) {
    const i = result.indexOf(c);
    if (i !== -1) result.splice(i, 1);
  }
  return result;
}

// ── View filtrada por jogador (regra inegociável: não vazar cartas alheias) ──
export function viewForPlayer(s: GameState, viewerId: string): GameView {
  return {
    phase: s.phase,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      eliminated: !isAlive(p),
      cards: p.cards.map((c) => ({
        revealed: c.revealed,
        character: c.revealed || p.id === viewerId ? c.character : null,
      })),
    })),
    currentPlayerId:
      s.phase === "fim_de_jogo" ? null : s.order[s.currentPlayerIndex] ?? null,
    deckCount: s.deck.length,
    treasury: s.treasury,
    config: s.config,
    pending: s.pending
      ? {
          action: s.pending.action,
          actorId: s.pending.actorId,
          targetId: s.pending.targetId,
          claimedCharacter: s.pending.claimedCharacter,
          block: s.pending.block,
        }
      : null,
    mustRevealPlayerId: s.mustRevealPlayerId,
    exchange:
      s.exchange && s.exchange.playerId === viewerId
        ? { pool: s.exchange.pool }
        : null,
    winnerId: s.winnerId,
    timer: currentTimer(s),
  };
}

// Qual timer governa a fase atual (o servidor usa para armar o setTimeout).
export function currentTimer(s: GameState): { phase: Phase; seconds: number } | null {
  switch (s.phase) {
    case "janela_reacao_global":
      return { phase: s.phase, seconds: s.config.globalReactionTime };
    case "janela_reacao_vitima":
      return { phase: s.phase, seconds: s.config.targetReactionTime };
    case "janela_contestar_bloqueio":
      return { phase: s.phase, seconds: s.config.challengeBlockTime };
    default:
      return null;
  }
}
