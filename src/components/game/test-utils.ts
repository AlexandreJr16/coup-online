// Construtor de GameView para os testes de UI (não entra no bundle do app).
import type { Character, GameView, PublicPlayer } from "@/src/types/game";

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
