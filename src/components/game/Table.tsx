// Mesa de poker vista de cima: elipse de feltro com os jogadores em volta.
// O jogador local fica sempre embaixo-centro (rotaciona a lista). Marca o turno
// e acende os alvos selecionáveis quando uma ação targeted pede alvo.
"use client";

import type { PublicPlayer } from "@/src/types/game";
import { useCountUp } from "./CoinFx";
import { COLORS, seatLayout } from "./helpers";
import Seat from "./Seat";

const CINZEL = "var(--font-cinzel), Georgia, serif";

export default function Table({
  players,
  currentPlayerId,
  myId,
  treasury,
  coinDeltas,
  deltaKey = 0,
  selectableTargetIds = [],
  onSelectTarget,
}: {
  players: PublicPlayer[];
  currentPlayerId: string | null;
  myId: string;
  treasury?: number; // Tesouro Central (Economia viva)
  coinDeltas?: Record<string, number>;
  deltaKey?: number;
  selectableTargetIds?: string[];
  onSelectTarget?: (id: string) => void;
}) {
  // Rotaciona para o local virar índice 0 (assento de baixo).
  const meIndex = Math.max(0, players.findIndex((p) => p.id === myId));
  const ordered = [...players.slice(meIndex), ...players.slice(0, meIndex)];
  const layout = seatLayout(ordered.length);
  const shownTreasury = useCountUp(treasury ?? 0);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 420,
        background: COLORS.bg,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Arena: região interna com margem para os assentos não encostarem nas
          bordas (assentos são posicionados em % desta caixa, não da tela toda). */}
      <div style={{ position: "absolute", inset: "9% 5%" }}>
        {/* Feltro central */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "84%",
            height: "82%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${COLORS.felt}, ${COLORS.feltEdge})`,
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 8px #14130f",
          }}
        />

        {/* Tesouro Central no centro do feltro (Economia viva) */}
        {typeof treasury === "number" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${COLORS.gold}55`,
              boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontFamily: CINZEL, fontWeight: 700, color: COLORS.text, fontSize: 13 }}>
              Tesouro
            </span>
            <span style={{ fontWeight: 800, color: COLORS.gold }}>🪙 {shownTreasury}</span>
          </div>
        )}

        {ordered.map((p, i) => (
          <Seat
            key={p.id}
            player={p}
            isCurrent={p.id === currentPlayerId}
            isMe={p.id === myId}
            coinDelta={coinDeltas?.[p.id] ?? 0}
            deltaKey={deltaKey}
            selectable={selectableTargetIds.includes(p.id)}
            onSelect={onSelectTarget ? () => onSelectTarget(p.id) : undefined}
            style={{ left: `${layout[i].leftPct}%`, top: `${layout[i].topPct}%` }}
          />
        ))}
      </div>
    </div>
  );
}
