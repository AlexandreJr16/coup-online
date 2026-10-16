// Um lugar na mesa: avatar (iniciais + cor do nome), nome, moedas e cartas.
// Cartas face-down = costas empilhadas (qtd = influências). Reveladas = viradas
// para cima, visivelmente distintas. Eliminado = acinzentado/riscado.
"use client";

import { type CSSProperties, useState } from "react";

import type { PublicPlayer } from "@/src/types/game";
import Card from "./Card";
import { CoinDelta, useCountUp } from "./CoinFx";
import { avatarColor, avatarInitials, avatarUrl, CINZEL, COLORS } from "./helpers";

export default function Seat({
  player,
  isCurrent,
  isMe,
  selectable,
  onSelect,
  dim = false,
  urgent = false,
  passed = false,
  style,
  coinDelta = 0,
  deltaKey = 0,
  avatar,
}: {
  player: PublicPlayer;
  isCurrent: boolean;
  isMe: boolean;
  selectable: boolean; // alvo possível da ação escolhida (mira pulsando)
  onSelect?: () => void;
  dim?: boolean; // escurece quem não está na vez (o brilho fica só em quem joga)
  urgent?: boolean; // a mesa espera por este jogador (revelar/trocar)
  passed?: boolean; // já passou nesta janela de reação (✔)
  style?: CSSProperties;
  coinDelta?: number; // variação de moedas na última transição (Economia viva)
  deltaKey?: number; // re-dispara a animação do "+N/−N"
  avatar?: string; // slug do retrato pixel art (sem ele, iniciais coloridas)
}) {
  const { name, coins, cards, eliminated } = player;
  const shownCoins = useCountUp(coins);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const portrait = avatar && !avatarFailed ? avatarUrl(avatar) : null;

  return (
    <div
      data-seat={name}
      data-seat-id={player.id}
      data-coins={coins}
      data-target={selectable ? "sim" : undefined}
      onClick={selectable ? onSelect : undefined}
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: 96,
        color: COLORS.text,
        fontSize: 13,
        cursor: selectable ? "pointer" : "default",
        opacity: eliminated ? 0.4 : dim ? 0.72 : 1,
        transition: "opacity 220ms ease",
        ...style,
      }}
    >
      {/* Lampião: halo quente atrás de quem está na vez */}
      {isCurrent && !eliminated && <div aria-hidden className="lamp" />}

      {/* Retrato emoldurado — pulsa no turno (classe turn-pulse); anel vermelho quando é alvo */}
      <div
        data-avatar={avatar}
        className={
          isCurrent && !eliminated
            ? "turn-pulse"
            : selectable
              ? "target-pulse"
              : urgent
                ? "urgent-pulse"
                : undefined
        }
        style={
          {
            position: "relative",
            width: portrait ? 62 : 56,
            height: portrait ? 72 : 56,
            borderRadius: portrait ? 10 : "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 18,
            color: "#fff",
            background: eliminated ? "#555" : portrait ? "#2a1d33" : avatarColor(name),
            border: portrait ? `3px solid ${COLORS.gold}` : undefined,
            outline: portrait ? "2px solid #14101a" : undefined,
            overflow: portrait ? "visible" : undefined,
            filter: eliminated ? "grayscale(1)" : undefined,
            boxShadow:
              isCurrent && !eliminated
                ? undefined // o keyframe turn-pulse controla o box-shadow
                : selectable
                  ? `0 0 0 3px ${COLORS.red}`
                  : "0 3px 8px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)",
            textDecoration: eliminated ? "line-through" : undefined,
            "--turn": COLORS.turn,
          } as CSSProperties
        }
      >
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portrait}
            alt=""
            draggable={false}
            onError={() => setAvatarFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 6,
              objectFit: "cover",
              objectPosition: "center top",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          avatarInitials(name)
        )}
        {selectable && <span style={{ ...badge, top: -10, right: -10 }}>🎯</span>}
        {passed && !eliminated && (
          <span style={{ ...badge, bottom: -6, right: -8, background: "#2f6b45" }}>✔</span>
        )}
      </div>

      {/* Plaquinha do nome, meio sobreposta ao retrato */}
      <div
        style={{
          marginTop: -10,
          padding: "2px 10px",
          maxWidth: 110,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: CINZEL,
          fontWeight: isMe ? 800 : 600,
          fontSize: 12,
          letterSpacing: 0.3,
          textAlign: "center",
          color: isMe ? COLORS.turn : COLORS.text,
          background: "linear-gradient(#3a2a22, #241a16)",
          border: "1px solid rgba(240,165,0,0.55)",
          borderRadius: 4,
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        {name}
        {isMe ? " (você)" : ""}
      </div>

      <div
        data-seat-coin
        style={{
          position: "relative",
          color: COLORS.gold,
          fontWeight: 700,
          padding: "1px 10px",
          borderRadius: 999,
          background: "rgba(14,8,10,0.72)",
          border: "1px solid rgba(240,165,0,0.35)",
        }}
      >
        <span key={coins} className="pop" style={{ display: "inline-block" }}>🪙 {shownCoins}</span>
        <CoinDelta delta={coinDelta} deltaKey={deltaKey} />
      </div>

      {/* Cartas estilo UNO: versos visíveis (qtd = influências); ao perder, a
          carta vira em 3D mostrando o personagem dessaturado. */}
      <div style={{ display: "flex", gap: 5, minHeight: 56 }}>
        {cards.map((c, i) => (
          <div key={i} data-card style={{ display: "flex" }}>
            <Card flip size="sm" character={c.revealed ? c.character : null} revealed={c.revealed} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Selo pequeno preso ao avatar (mira de alvo, ✔ de quem passou).
const badge: CSSProperties = {
  position: "absolute",
  width: 22,
  height: 22,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  lineHeight: 1,
  background: "#8b1a1a",
  border: "2px solid #14101a",
  color: "#fff",
  boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
};
