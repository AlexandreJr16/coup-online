// Um lugar na mesa: avatar (iniciais + cor do nome), nome, moedas e cartas.
// Cartas face-down = costas empilhadas (qtd = influências). Reveladas = viradas
// para cima, visivelmente distintas. Eliminado = acinzentado/riscado.
"use client";

import type { CSSProperties } from "react";

import type { PublicPlayer } from "@/src/types/game";
import Card from "./Card";
import { CoinDelta, useCountUp } from "./CoinFx";
import { avatarColor, avatarInitials, COLORS } from "./helpers";

export default function Seat({
  player,
  isCurrent,
  isMe,
  selectable,
  onSelect,
  style,
  coinDelta = 0,
  deltaKey = 0,
}: {
  player: PublicPlayer;
  isCurrent: boolean;
  isMe: boolean;
  selectable: boolean;
  onSelect?: () => void;
  style?: CSSProperties;
  coinDelta?: number; // variação de moedas na última transição (Economia viva)
  deltaKey?: number; // re-dispara a animação do "+N/−N"
}) {
  const { name, coins, cards, eliminated } = player;
  const shownCoins = useCountUp(coins);

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
      {/* Avatar — pulsa no turno (classe turn-pulse); anel vermelho quando é alvo */}
      <div
        className={isCurrent && !eliminated ? "turn-pulse" : undefined}
        style={
          {
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
            boxShadow:
              isCurrent && !eliminated
                ? undefined // o keyframe turn-pulse controla o box-shadow
                : selectable
                  ? `0 0 0 3px ${COLORS.red}`
                  : "0 0 0 2px rgba(0,0,0,0.3)",
            textDecoration: eliminated ? "line-through" : undefined,
            "--turn": COLORS.turn,
          } as CSSProperties
        }
      >
        {avatarInitials(name)}
      </div>

      <div style={{ fontWeight: isMe ? 700 : 500, textAlign: "center" }}>
        {name}
        {isMe ? " (você)" : ""}
      </div>

      <div style={{ position: "relative", color: COLORS.gold, fontWeight: 600 }}>
        🪙 {shownCoins}
        <CoinDelta delta={coinDelta} deltaKey={deltaKey} />
      </div>

      {/* Cartas estilo UNO: versos visíveis (qtd = influências); ao perder, a
          carta vira em 3D mostrando o personagem dessaturado. */}
      <div style={{ display: "flex", gap: 5, minHeight: 56 }}>
        {cards.map((c, i) => (
          <Card
            key={i}
            flip
            size="sm"
            character={c.revealed ? c.character : null}
            revealed={c.revealed}
          />
        ))}
      </div>
    </div>
  );
}
