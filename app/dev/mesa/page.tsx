// Mesa de demonstração (sem socket): partida FICTÍCIA só para revisar visual —
// cenário, cartas, verso, assentos. Útil para as Fases 3–4 do ROADMAP.
"use client";

import GameBoard from "@/src/components/game/GameBoard";
import TableBackdrop from "@/src/components/game/TableBackdrop";
import { COLORS } from "@/src/components/game/helpers";
import type { Character, GameView } from "@/src/types/game";

const card = (character: Character | null, revealed = false) => ({ character, revealed });

const VIEW: GameView = {
  phase: "aguardando_acao",
  matchNumber: 1,
  lastChallenge: null,
  players: [
    { id: "p1", name: "Ana", coins: 4, eliminated: false, cards: [card("duque"), card("assassino")] },
    { id: "p2", name: "Bia", coins: 7, eliminated: false, cards: [card(null), card(null)] },
    { id: "p3", name: "Caio", coins: 2, eliminated: false, cards: [card("capitao", true), card(null)] },
    { id: "p4", name: "Davi", coins: 9, eliminated: false, cards: [card(null), card(null)] },
  ],
  currentPlayerId: "p1",
  deckCount: 11,
  treasury: 28,
  config: { globalReactionTime: 5, targetReactionTime: 15, challengeBlockTime: 5, turnTime: 45, choiceTime: 30 },
  pending: null,
  mustRevealPlayerId: null,
  exchange: null,
  winnerId: null,
  timer: { phase: "aguardando_acao", seconds: 45, remainingMs: 32000 },
};

export default function MesaDevPage() {
  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.bg }}>
      <TableBackdrop>
        <GameBoard view={VIEW} myId="p1" interactionMode="hand" />
      </TableBackdrop>
    </main>
  );
}
