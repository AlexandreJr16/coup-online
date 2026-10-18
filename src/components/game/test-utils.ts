// Construtor de GameView para os testes de UI (não entra no bundle do app).
import { applyEvent, createGame } from "@/src/lib/game/engine";
import type { Rng } from "@/src/lib/game/deck";
import type { ActionType, Character, GameState, GameView, PublicPlayer } from "@/src/types/game";

const card = (character: Character | null, revealed = false) => ({ character, revealed });

export function player(
  id: string,
  over: Partial<PublicPlayer> & { hand?: [Character | null, Character | null] } = {},
): PublicPlayer {
  const { hand, ...rest } = over;
  return {
    id,
    name: id.toUpperCase(),
    coins: 2,
    eliminated: false,
    cards: [card(hand?.[0] ?? null), card(hand?.[1] ?? null)],
    ...rest,
  };
}

export function makeView(over: Partial<GameView> = {}): GameView {
  return {
    phase: "aguardando_acao",
    matchNumber: 1,
    lastChallenge: null,
    stats: {},
    players: [
      player("p1", { name: "Ana", hand: ["duque", "assassino"] }),
      player("p2", { name: "Bia" }),
      player("p3", { name: "Caio" }),
    ],
    currentPlayerId: "p1",
    deckCount: 19,
    treasury: 44,
    config: { globalReactionTime: 5, targetReactionTime: 15, challengeBlockTime: 5, turnTime: 45, choiceTime: 30 },
    pending: null,
    mustRevealPlayerId: null,
    exchange: null,
    winnerId: null,
    timer: { phase: "aguardando_acao", seconds: 45, remainingMs: 45000 },
    ...over,
  };
}

// ── Helpers para cenários repetíveis (P02.S2) ───────────────────────────────

// N jogadores p1..pN (nomes "P1".."PN"), todos com a mão oculta.
export function playersN(n: number): PublicPlayer[] {
  return Array.from({ length: n }, (_, i) => player(`p${i + 1}`));
}

// Troca a mão (visível) de um jogador; os demais ficam como estão.
export function withHand(
  view: GameView,
  playerId: string,
  hand: [Character | null, Character | null],
): GameView {
  return {
    ...view,
    players: view.players.map((p) =>
      p.id === playerId ? { ...p, cards: [card(hand[0]), card(hand[1])] } : p,
    ),
  };
}

// Ação em andamento (janela de reação) sobre a view.
export function withPending(
  view: GameView,
  over: Partial<NonNullable<GameView["pending"]>> & { actorId: string; action: ActionType },
): GameView {
  return {
    ...view,
    phase: "janela_reacao_global",
    pending: { targetId: null, claimedCharacter: null, block: null, passedIds: [], ...over },
  };
}

// RNG determinístico (mulberry32) para a engine nos testes de cena.
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dá a mão `hand` ao jogador trocando com cartas do baralho: mantém as 25 cartas.
function giveHand(s: GameState, playerId: string, hand: [Character, Character]): void {
  const p = s.players.find((x) => x.id === playerId)!;
  hand.forEach((want, i) => {
    if (p.cards[i].character === want) return;
    const j = s.deck.indexOf(want);
    if (j === -1) throw new Error(`sem ${want} no baralho para a mão de ${playerId}`);
    s.deck[j] = p.cards[i].character;
    p.cards[i].character = want;
  });
}

// Par verdade/blefe gerado PELA ENGINE: mesmo pré-estado (3 jogadores, p1 abre, rng fixo),
// p1 declara `action` (alegando `claimed`) e p2 contesta. Só a mão de p1 muda:
// em `truth` ela tem a carta alegada; em `bluff` não tem. Os campos derivados
// (mustRevealPlayerId, stats, lastChallenge, eliminated) saem consistentes da engine.
// Para a view de um observador: `viewForPlayer(par.truth, "p3")`.
export function challengePair(
  opts: { action?: ActionType; claimed?: Character; seed?: number } = {},
): { pre: GameState; truth: GameState; bluff: GameState } {
  const { action = "taxas", claimed = "duque", seed = 7 } = opts;
  const ids = [
    { id: "p1", name: "Ana" },
    { id: "p2", name: "Bia" },
    { id: "p3", name: "Caio" },
  ];
  const pre = createGame(ids, {}, seededRng(seed), { firstPlayerId: "p1" });
  const other = (["duque", "assassino", "capitao", "embaixador", "condessa"] as Character[]).filter(
    (c) => c !== claimed,
  );
  const run = (hand: [Character, Character]): GameState => {
    const s = structuredClone(pre);
    giveHand(s, "p1", hand);
    const a = applyEvent(s, { type: "action", playerId: "p1", action }, seededRng(seed));
    if (a.error) throw new Error(a.error);
    const c = applyEvent(a.state, { type: "challenge", playerId: "p2" }, seededRng(seed));
    if (c.error) throw new Error(c.error);
    return c.state;
  };
  return { pre, truth: run([claimed, other[0]]), bluff: run([other[0], other[1]]) };
}
