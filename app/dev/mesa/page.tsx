// Mesa de demonstração (sem socket): partida FICTÍCIA só para revisar visual.
// Estados por query: ?fase=turno (padrão) | reacao | contestar | revelar | troca | fim
//   ?n=2..6 muda o número de jogadores. Útil para as Fases 3–4 do ROADMAP.
//   ?restante=3 fixa o tempo restante da fase (em s): revisa o aviso dos últimos segundos.
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import GameBoard from "@/src/components/game/GameBoard";
import TableBackdrop from "@/src/components/game/TableBackdrop";
import { RoundStatusSlot } from "@/src/components/game/TurnBanner";
import { COLORS } from "@/src/components/game/helpers";
import type { Character, GameView } from "@/src/types/game";

const card = (character: Character | null, revealed = false) => ({ character, revealed });
const CONFIG = { globalReactionTime: 5, targetReactionTime: 15, challengeBlockTime: 5, turnTime: 45, choiceTime: 30 };

function build(fase: string, n: number): GameView {
  const names = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"];
  const players = names.slice(0, n).map((name, i) => ({
    id: `p${i + 1}`,
    name,
    coins: [4, 7, 2, 9, 3, 5][i],
    eliminated: false,
    cards:
      i === 0
        ? [card("duque"), card("assassino")]
        : i === 2
          ? [card("capitao", true), card(null)]
          : [card(null), card(null)],
  }));
  const base: GameView = {
    phase: "aguardando_acao",
    matchNumber: 1,
    lastChallenge: null,
    stats: {},
    players,
    currentPlayerId: "p1",
    deckCount: 11,
    treasury: 28,
    config: CONFIG,
    pending: null,
    mustRevealPlayerId: null,
    exchange: null,
    winnerId: null,
    timer: { phase: "aguardando_acao", seconds: 45, remainingMs: 32000 },
  };
  switch (fase) {
    case "reacao":
      return {
        ...base,
        phase: "janela_reacao_global",
        currentPlayerId: "p2",
        pending: { action: "taxas", actorId: "p2", targetId: null, claimedCharacter: "duque", block: null, passedIds: ["p3"] },
        timer: { phase: "janela_reacao_global", seconds: 5, remainingMs: 3400 },
      };
    case "contestar":
      return {
        ...base,
        phase: "janela_contestar_bloqueio",
        currentPlayerId: "p2",
        pending: {
          action: "ajuda_externa", actorId: "p2", targetId: null, claimedCharacter: null,
          block: { blockerId: "p3", character: "duque" }, passedIds: [],
        },
        timer: { phase: "janela_contestar_bloqueio", seconds: 5, remainingMs: 4100 },
      };
    case "revelar":
      return {
        ...base,
        phase: "aguardando_revelacao",
        mustRevealPlayerId: "p1",
        timer: { phase: "aguardando_revelacao", seconds: 30, remainingMs: 21000 },
      };
    case "troca":
      return {
        ...base,
        phase: "aguardando_troca",
        exchange: { pool: ["duque", "assassino", "condessa", "embaixador"] },
        timer: { phase: "aguardando_troca", seconds: 30, remainingMs: 21000 },
      };
    case "fim":
      return {
        ...base,
        phase: "fim_de_jogo",
        winnerId: "p1",
        currentPlayerId: null,
        timer: null,
        stats: {
          p1: { challengesMade: 4, challengesRight: 3, bluffsCaught: 0, blocks: 1, kills: 2, maxCoins: 11, influenceLost: 1 },
          p2: { challengesMade: 1, challengesRight: 0, bluffsCaught: 3, blocks: 0, kills: 0, maxCoins: 5, influenceLost: 2 },
          p3: { challengesMade: 2, challengesRight: 1, bluffsCaught: 1, blocks: 2, kills: 1, maxCoins: 6, influenceLost: 2 },
          p4: { challengesMade: 0, challengesRight: 0, bluffsCaught: 0, blocks: 0, kills: 0, maxCoins: 4, influenceLost: 2 },
        },
      };
    default:
      return base;
  }
}

function Mesa() {
  const q = useSearchParams();
  const built = build(q.get("fase") ?? "turno", Math.min(6, Math.max(2, Number(q.get("n") ?? 4))));
  const restante = Number(q.get("restante"));
  const view =
    q.get("restante") !== null && Number.isFinite(restante) && built.timer
      ? { ...built, timer: { ...built.timer, remainingMs: Math.max(0, restante) * 1000 } }
      : built;
  // Em "reacao"/"contestar" quem age é o p2; eu (p1) sou espectador/reator.
  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.bg }}>
      {/* Faixa do topo como a da sala: só o slot da faixa de status da rodada */}
      <header style={{ flex: "none", display: "flex", alignItems: "center", padding: "10px 16px", background: "linear-gradient(#2b1f1c, #1a1214)", borderBottom: "2px solid rgba(240,165,0,0.6)" }}>
        <RoundStatusSlot />
      </header>
      <TableBackdrop>
        <GameBoard view={view} myId="p1" />
      </TableBackdrop>
    </main>
  );
}

export default function MesaDevPage() {
  return (
    <Suspense fallback={null}>
      <Mesa />
    </Suspense>
  );
}
