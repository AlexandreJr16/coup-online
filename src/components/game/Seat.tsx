// Um lugar na mesa: avatar (iniciais + cor do nome), nome, moedas e cartas.
// Cartas face-down = costas empilhadas (qtd = influências). Reveladas = viradas
// para cima, visivelmente distintas. Eliminado = acinzentado/riscado.
"use client";

import type { CSSProperties } from "react";

import type { PublicPlayer } from "@/src/types/game";
import {
  avatarColor,
  avatarInitials,
  CHAR_LABEL,
  COLORS,
} from "./helpers";

export default function Seat({
  player,
  isCurrent,
  isMe,
  selectable,
  onSelect,
  style,
}: {
  player: PublicPlayer;
  isCurrent: boolean;
  isMe: boolean;
  selectable: boolean;
  onSelect?: () => void;
  style?: CSSProperties;
}) {
  const { name, coins, cards, eliminated } = player;
  const influences = cards.filter((c) => !c.revealed).length;

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      style={{
        position: "absolute",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: 96,
        color: COLORS.text,
        fontSize: 13,
        cursor: selectable ? "pointer" : "default",
        opacity: eliminated ? 0.4 : 1,
        ...style,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 18,
          color: "#fff",
          background: eliminated ? "#555" : avatarColor(name),
          filter: eliminated ? "grayscale(1)" : undefined,
          // Borda luminosa no turno; anel de seleção quando é alvo possível.
          boxShadow: isCurrent
            ? `0 0 0 3px ${COLORS.turn}, 0 0 16px 2px ${COLORS.turn}`
            : selectable
              ? `0 0 0 3px ${COLORS.red}`
              : "0 0 0 2px rgba(0,0,0,0.3)",
          textDecoration: eliminated ? "line-through" : undefined,
        }}
      >
        {avatarInitials(name)}
      </div>

      <div style={{ fontWeight: isMe ? 700 : 500, textAlign: "center" }}>
        {name}
        {isMe ? " (você)" : ""}
      </div>

      <div style={{ color: COLORS.gold, fontWeight: 600 }}>🪙 {coins}</div>

      {/* Cartas */}
      <div style={{ display: "flex", gap: 3, minHeight: 30 }}>
        {cards.map((c, i) =>
          c.revealed ? (
            <span
              key={i}
              title={c.character ? CHAR_LABEL[c.character] : undefined}
              style={{
                width: 22,
                height: 30,
                borderRadius: 3,
                background: "#3a3a3a",
                border: "1px solid #555",
                color: "#bbb",
                fontSize: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                lineHeight: 1,
                transform: "rotate(6deg)",
              }}
            >
              {c.character ? CHAR_LABEL[c.character].slice(0, 4) : "✖"}
            </span>
          ) : (
            <span
              key={i}
              style={{
                width: 22,
                height: 30,
                borderRadius: 3,
                background: "linear-gradient(135deg,#6b4f9e,#4a3570)",
                border: "1px solid #2a1f44",
              }}
            />
          ),
        )}
      </div>

      <div style={{ fontSize: 10, color: COLORS.dim }}>
        {influences} influência{influences === 1 ? "" : "s"}
      </div>
    </div>
  );
}
