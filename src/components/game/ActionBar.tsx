// Modo A — ActionBar (botões). Barra inferior visível no seu turno.
// Categorias por cor (DESIGN.md): dourado=moeda, vermelho=agressivo,
// preto=golpe, neutro=trocar. Indicador de blefe sutil onde falta o personagem.
// Implementa InteractionModeProps: só chama onAction; alvo e socket ficam no
// GameBoard (logo, intercambiável com HandView sem mudar nada).
"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import type { ActionType, GameView } from "@/src/types/game";
import {
  ACTION_META,
  categoryColor,
  COLORS,
  type InteractionModeProps,
  isBluff,
} from "./helpers";

export default function ActionBar({ view, myId, onAction }: InteractionModeProps) {
  const [coinOpen, setCoinOpen] = useState(false);
  const meCoins = view.players.find((p) => p.id === myId)?.coins ?? 0;
  const mustCoup = meCoins >= 10;

  const disabled = (action: ActionType): boolean => {
    if (mustCoup) return action !== "golpe"; // 10+: só golpe
    const cost = ACTION_META[action].coinCost ?? 0;
    return meCoins < cost;
  };

  const fire = (action: ActionType) => {
    setCoinOpen(false);
    onAction(action); // targeted: GameBoard entra em modo de seleção de alvo
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "12px 16px",
        background: "rgba(0,0,0,0.35)",
        borderRadius: 10,
      }}
    >
      {mustCoup && (
        <span style={{ color: COLORS.gold, fontWeight: 600 }}>
          ⚠️ 10+ moedas: Golpe obrigatório
        </span>
      )}

      {/* Dourado — moedas (abre sub-ações +1/+2/+3) */}
      {coinOpen && !mustCoup ? (
        <>
          <Btn action="renda" view={view} myId={myId} off={disabled("renda")} on={() => fire("renda")} />
          <Btn action="ajuda_externa" view={view} myId={myId} off={disabled("ajuda_externa")} on={() => fire("ajuda_externa")} />
          <Btn action="taxas" view={view} myId={myId} off={disabled("taxas")} on={() => fire("taxas")} />
        </>
      ) : (
        <Plain color={COLORS.gold} dark off={mustCoup} on={() => setCoinOpen(true)}>
          💰 Moedas ▾
        </Plain>
      )}

      {/* Vermelho — agressivas */}
      <Btn action="assassinar" view={view} myId={myId} off={disabled("assassinar")} on={() => fire("assassinar")} />
      <Btn action="extorquir" view={view} myId={myId} off={disabled("extorquir")} on={() => fire("extorquir")} />

      {/* Preto — golpe */}
      <Btn action="golpe" view={view} myId={myId} off={disabled("golpe")} on={() => fire("golpe")} />

      {/* Neutro — trocar */}
      <Btn action="trocar" view={view} myId={myId} off={disabled("trocar")} on={() => fire("trocar")} />
    </div>
  );
}

// Botão de uma ação concreta: cor da categoria + custo + blefe.
function Btn({
  action,
  view,
  myId,
  off,
  on,
}: {
  action: ActionType;
  view: GameView;
  myId: string;
  off: boolean;
  on: () => void;
}) {
  const meta = ACTION_META[action];
  const bluff = isBluff(view, myId, action);
  const cost = meta.coinCost ? ` (${meta.coinCost})` : "";
  return (
    <Plain
      color={categoryColor(meta.category)}
      dark={meta.category === "coin"}
      off={off}
      bluff={bluff}
      on={on}
      title={bluff ? "Blefe: você não tem esse personagem" : undefined}
    >
      {meta.label}
      {cost}
    </Plain>
  );
}

function Plain({
  children,
  color,
  dark,
  off,
  bluff,
  on,
  title,
}: {
  children: ReactNode;
  color: string;
  dark?: boolean; // texto escuro (botões dourados claros)
  off?: boolean;
  bluff?: boolean;
  on: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={on}
      disabled={off}
      title={title}
      className="game-btn"
      style={
        {
          padding: "9px 14px",
          fontSize: 14,
          color: dark ? "#1a1a2e" : COLORS.text,
          border: bluff ? "2px dashed rgba(255,255,255,0.85)" : undefined,
          "--c": color,
        } as CSSProperties
      }
    >
      {children}
      {bluff ? " 🎭" : ""}
    </button>
  );
}
