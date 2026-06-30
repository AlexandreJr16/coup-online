// Modo B — HandView (cartas). Estilo Pokémon TCG: as 5 cartas em leque embaixo.
// As que você TEM: vivas. As que pode blefar: dessaturadas + máscara. Clicar
// numa carta dá zoom e mostra a ação daquele personagem. Ações gerais (sem
// personagem) ficam numa tira à parte. Mesmo InteractionModeProps do ActionBar.
"use client";

import { useState } from "react";

import type { ActionType, Character } from "@/src/types/game";
import {
  ACTION_META,
  ALL_CHARACTERS,
  CHAR_LABEL,
  CHARACTER_ACTION,
  COLORS,
  type InteractionModeProps,
  isBluff,
  myFaceDownChars,
} from "./helpers";

const CHAR_HINT: Record<Character, string> = {
  duque: "Taxas +3",
  assassino: "Assassinar",
  capitao: "Extorquir",
  embaixador: "Trocar",
  condessa: "Bloqueia Assassinato",
};

export default function HandView({ view, myId, onAction }: InteractionModeProps) {
  const [selected, setSelected] = useState<Character | null>(null);
  const owned = myFaceDownChars(view, myId);
  const meCoins = view.players.find((p) => p.id === myId)?.coins ?? 0;
  const mustCoup = meCoins >= 10;

  const disabled = (action: ActionType): boolean => {
    if (mustCoup) return action !== "golpe";
    return meCoins < (ACTION_META[action].coinCost ?? 0);
  };

  const selectedAction = selected ? CHARACTER_ACTION[selected] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {/* Painel da carta selecionada: ação do personagem */}
      <div style={{ minHeight: 44 }}>
        {selected &&
          (selectedAction ? (
            <button
              onClick={() => {
                onAction(selectedAction);
                setSelected(null);
              }}
              disabled={disabled(selectedAction)}
              style={{
                padding: "10px 18px",
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.text,
                background: disabled(selectedAction) ? "#2b2b2b" : COLORS.red,
                border: isBluff(view, myId, selectedAction)
                  ? "2px dashed rgba(255,255,255,0.85)"
                  : "2px solid transparent",
                borderRadius: 8,
                cursor: disabled(selectedAction) ? "not-allowed" : "pointer",
              }}
            >
              Usar {ACTION_META[selectedAction].label}
              {isBluff(view, myId, selectedAction) ? " 🎭 (blefe)" : ""}
            </button>
          ) : (
            <span style={{ color: COLORS.dim }}>
              {CHAR_LABEL[selected]} não tem ação de turno (só reage).
            </span>
          ))}
      </div>

      {/* Leque de 5 cartas */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {ALL_CHARACTERS.map((char, i) => {
          const have = owned.includes(char);
          const isSel = selected === char;
          return (
            <button
              key={char}
              onClick={() => setSelected(isSel ? null : char)}
              style={{
                position: "relative",
                width: 88,
                height: 124,
                marginLeft: i === 0 ? 0 : -16,
                padding: 8,
                borderRadius: 10,
                cursor: "pointer",
                color: COLORS.text,
                background: "linear-gradient(160deg,#3b2f63,#241b3f)",
                border: `2px solid ${have ? COLORS.gold : "#3a3a3a"}`,
                filter: have ? "none" : "grayscale(0.85) brightness(0.7)",
                transform: `rotate(${(i - 2) * 5}deg) translateY(${isSel ? -22 : 0}px) scale(${isSel ? 1.12 : 1})`,
                transformOrigin: "bottom center",
                transition: "transform 120ms ease",
                zIndex: isSel ? 10 : i,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>{CHAR_LABEL[char]}</span>
              <span style={{ fontSize: 10, color: COLORS.dim }}>{CHAR_HINT[char]}</span>
              {!have && (
                <span style={{ position: "absolute", top: 4, right: 6, fontSize: 12 }}>🎭</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ações gerais (não têm carta) */}
      <div style={{ display: "flex", gap: 10 }}>
        <Gen label="Renda (+1)" color={COLORS.gold} dark off={disabled("renda")} on={() => onAction("renda")} />
        <Gen label="Ajuda Externa (+2)" color={COLORS.gold} dark off={disabled("ajuda_externa")} on={() => onAction("ajuda_externa")} />
        <Gen label="Golpe (7)" color={COLORS.coup} off={disabled("golpe")} on={() => onAction("golpe")} />
      </div>
      {mustCoup && (
        <span style={{ color: COLORS.gold, fontWeight: 600 }}>
          ⚠️ 10+ moedas: Golpe obrigatório
        </span>
      )}
    </div>
  );
}

function Gen({
  label,
  color,
  dark,
  off,
  on,
}: {
  label: string;
  color: string;
  dark?: boolean;
  off: boolean;
  on: () => void;
}) {
  return (
    <button
      onClick={on}
      disabled={off}
      style={{
        padding: "8px 14px",
        fontSize: 14,
        fontWeight: 600,
        color: off ? "#888" : dark ? "#1a1a2e" : COLORS.text,
        background: off ? "#2b2b2b" : color,
        border: "none",
        borderRadius: 8,
        cursor: off ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
