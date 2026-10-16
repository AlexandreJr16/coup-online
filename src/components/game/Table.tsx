// Mesa de poker vista de cima: elipse de feltro com os jogadores em volta.
// O jogador local fica sempre embaixo-centro (rotaciona a lista). Marca o turno
// e acende os alvos selecionáveis quando uma ação targeted pede alvo.
"use client";

import type { PublicPlayer } from "@/src/types/game";
import { useCountUp } from "./CoinFx";
import { CINZEL, COLORS, seatLayout, seatStyle } from "./helpers";
import Seat from "./Seat";

export default function Table({
  players,
  currentPlayerId,
  myId,
  treasury,
  coinDeltas,
  deltaKey = 0,
  selectableTargetIds = [],
  onSelectTarget,
  dimOthers = false,
  urgentIds = [],
  passedIds = [],
}: {
  players: PublicPlayer[];
  currentPlayerId: string | null;
  myId: string;
  treasury?: number; // Tesouro Central (Economia viva)
  coinDeltas?: Record<string, number>;
  deltaKey?: number;
  selectableTargetIds?: string[];
  onSelectTarget?: (id: string) => void;
  dimOthers?: boolean; // turno de alguém: escurece os demais assentos
  urgentIds?: string[]; // jogadores que a mesa está esperando
  passedIds?: string[]; // quem já passou na janela de reação
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
        background: "transparent", // o fundo vem do TableBackdrop (cenário do tema)
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Feltro central (os assentos ficam ancorados nas bordas, fora dele) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "62%",
          height: "58%",
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
              top: "60%",
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
              Erário
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
            dim={dimOthers && p.id !== currentPlayerId}
            urgent={urgentIds.includes(p.id)}
            passed={passedIds.includes(p.id)}
            style={seatStyle(layout[i])}
          />
        ))}
    </div>
  );
}
