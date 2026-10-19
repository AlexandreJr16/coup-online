// Ações básicas (sem personagem): selos FIXOS, sempre no mesmo lugar do dock — o jogador
// cria memória muscular. Fora da vez ficam apagados; sem moedas ganham cadeado; com 10+
// moedas só o Golpe de Estado fica aceso (obrigatório).
"use client";

import type { ActionType, GameView } from "@/src/types/game";
import ActionSeal from "./ActionSeal";
import { U } from "./escalaMesa";
import { ACTION_META, basicSealState, COLORS, type IconName } from "./helpers";

const BASICS: Array<{ action: ActionType; icon: IconName; emoji: string; sub: string; color: string }> = [
  { action: "renda", icon: "renda", emoji: "🪙", sub: "+1", color: COLORS.gold },
  { action: "ajuda_externa", icon: "ajuda_externa", emoji: "👝", sub: "+2", color: COLORS.gold },
  { action: "golpe", icon: "golpe", emoji: "💥", sub: "−7", color: "#b3392b" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: U(10), width: U(208) }}>
      {BASICS.map(({ action, icon, emoji, sub, color }) => (
        <ActionSeal
          key={action}
          icon={icon}
          emoji={emoji}
          label={ACTION_META[action].label}
          sub={sub}
          color={color}
          state={basicSealState(coins, action, canAct)}
          onClick={() => onAction(action)}
        />
      ))}
    </div>
  );
}
