// Um lugar na mesa: avatar (iniciais + cor do nome), nome, moedas e cartas.
// Cartas face-down = costas empilhadas (qtd = influências). Reveladas = viradas
// para cima, visivelmente distintas. Eliminado = acinzentado/riscado.
"use client";

import type { CSSProperties } from "react";

import type { PublicPlayer } from "@/src/types/game";
import Card from "./Card";
import { avatarColor, avatarInitials, COLORS } from "./helpers";

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

      {/* Cartas: face-down = costas empilhadas (qtd = influências); reveladas =
          personagem dessaturado e visivelmente distinto. */}
      <div style={{ display: "flex", gap: 4, minHeight: 42 }}>
        {cards.map((c, i) =>
          c.revealed ? (
            <Card key={i} size="sm" character={c.character} lost />
          ) : (
            <Card key={i} size="sm" faceDown />
          ),
        )}
      </div>
    </div>
  );
}
