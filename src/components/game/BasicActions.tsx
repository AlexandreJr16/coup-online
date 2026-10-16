// Ações básicas (sem personagem): botões FIXOS, sempre no mesmo lugar do dock — o
// jogador cria memória muscular. Apagam quando não é a vez ou faltam moedas.
"use client";

import type { CSSProperties } from "react";

import type { ActionType, GameView } from "@/src/types/game";
import { ACTION_META, actionBlockedReason, COLORS } from "./helpers";

const BASICS: Array<{ action: ActionType; sub: string; color: string; dark?: boolean }> = [
  { action: "renda", sub: "+1", color: COLORS.gold, dark: true },
  { action: "ajuda_externa", sub: "+2", color: COLORS.gold, dark: true },
  { action: "golpe", sub: "−7", color: COLORS.coup },
];

export default function BasicActions({
  view,
  myId,
  canAct,
  onAction,
}: {
  view: GameView;
  myId: string;
  canAct: boolean;
  onAction: (action: ActionType) => void;
}) {
  const coins = view.players.find((p) => p.id === myId)?.coins ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 208 }}>
      {BASICS.map(({ action, sub, color, dark }) => {
        const blocked = actionBlockedReason(coins, action) !== null;
        return (
          <button
            key={action}
            onClick={() => onAction(action)}
            disabled={!canAct || blocked}
            className="game-btn"
            style={
              {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "9px 14px",
                fontSize: 14,
                whiteSpace: "nowrap",
                color: dark ? "#1a1a2e" : COLORS.text,
                "--c": color,
              } as CSSProperties
            }
          >
            <span>{ACTION_META[action].label}</span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>🪙 {sub}</b>
          </button>
        );
      })}
    </div>
  );
}
