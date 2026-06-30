// Modo B — HandView (cartas). Estilo Pokémon TCG: as 5 cartas em leque embaixo.
// As que você TEM: vivas. As que pode blefar: dessaturadas + máscara. Clicar
// numa carta dá zoom e mostra a ação daquele personagem. Ações gerais (sem
// personagem) ficam numa tira à parte. Mesmo InteractionModeProps do ActionBar.
"use client";

import { type CSSProperties, useState } from "react";

import { CARD_BY_ID } from "@/src/lib/game/cards";
import type { ActionType, Character } from "@/src/types/game";
import Card from "./Card";
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
              className="game-btn"
              style={
                {
                  padding: "10px 18px",
                  fontSize: 15,
                  color: COLORS.text,
                  border: isBluff(view, myId, selectedAction)
                    ? "2px dashed rgba(255,255,255,0.85)"
                    : undefined,
                  "--c": COLORS.red,
                } as CSSProperties
              }
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

      {/* Leque de 5 cartas: as que TENHO em cor cheia + borda brilhante; as que
          posso BLEFAR dessaturadas + 🎭 (Card cuida do visual). */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 22 }}>
        {ALL_CHARACTERS.map((char, i) => {
          const have = owned.includes(char);
          const isSel = selected === char;
          return (
            <Card
              key={char}
              size="lg"
              character={char}
              bluff={!have}
              selected={isSel}
              hint={CARD_BY_ID[char].dica}
              onClick={() => setSelected(isSel ? null : char)}
              style={{
                marginLeft: i === 0 ? 0 : -16,
                transform: `rotate(${(i - 2) * 5}deg) translateY(${isSel ? -22 : 0}px) scale(${isSel ? 1.12 : 1})`,
                transformOrigin: "bottom center",
                transition: "transform 120ms ease",
                zIndex: isSel ? 10 : i,
              }}
            />
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
      className="game-btn"
      style={
        {
          padding: "9px 14px",
          fontSize: 14,
          color: dark ? "#1a1a2e" : COLORS.text,
          "--c": color,
        } as CSSProperties
      }
    >
      {label}
    </button>
  );
}
