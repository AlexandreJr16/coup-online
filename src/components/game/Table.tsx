// Mesa de poker vista de cima: elipse de feltro com os jogadores em volta.
// O jogador local fica sempre embaixo-centro (rotaciona a lista). Marca o turno
// e acende os alvos selecionáveis quando uma ação targeted pede alvo.
"use client";

import type { PublicPlayer } from "@/src/types/game";
import { COLORS, seatLayout } from "./helpers";
import Seat from "./Seat";

export default function Table({
  players,
  currentPlayerId,
  myId,
  selectableTargetIds = [],
  onSelectTarget,
}: {
  players: PublicPlayer[];
  currentPlayerId: string | null;
  myId: string;
  selectableTargetIds?: string[];
  onSelectTarget?: (id: string) => void;
}) {
  // Rotaciona para o local virar índice 0 (assento de baixo).
  const meIndex = Math.max(0, players.findIndex((p) => p.id === myId));
  const ordered = [...players.slice(meIndex), ...players.slice(0, meIndex)];
  const layout = seatLayout(ordered.length);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 460,
        background: COLORS.bg,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Feltro central */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "72%",
          height: "64%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.felt}, ${COLORS.feltEdge})`,
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 8px #14130f",
        }}
      />

      {ordered.map((p, i) => (
        <Seat
          key={p.id}
          player={p}
          isCurrent={p.id === currentPlayerId}
          isMe={p.id === myId}
          selectable={selectableTargetIds.includes(p.id)}
          onSelect={onSelectTarget ? () => onSelectTarget(p.id) : undefined}
          style={{ left: `${layout[i].leftPct}%`, top: `${layout[i].topPct}%` }}
        />
      ))}
    </div>
  );
}
