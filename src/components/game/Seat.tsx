// Um lugar na mesa: avatar (iniciais + cor do nome), nome, moedas e cartas.
// Cartas face-down = costas empilhadas (qtd = influências). Reveladas = viradas
// para cima, visivelmente distintas. Eliminado = acinzentado/riscado.
"use client";

import { type CSSProperties, useState } from "react";

import type { PublicPlayer } from "@/src/types/game";
import Card from "./Card";
import { ChipPile } from "./ChipPile";
import { CoinDelta, useCountUp } from "./CoinFx";
import { U } from "./escalaMesa";
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
  balloon,
  custoFantasma = 0,
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
  balloon?: string; // jogada em andamento deste jogador ("Assassinar → Bia")
  custoFantasma?: number; // custo da ação em foco: fichas fantasma na pilha de quem olha (P07.S6)
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
        gap: U(4),
        width: U(96),
        color: COLORS.text,
        fontSize: U(13),
        cursor: selectable ? "pointer" : "default",
        opacity: eliminated ? 0.4 : dim ? 0.72 : 1,
        transition: "opacity 220ms ease",
        ...style,
      }}
    >
      {/* Lampião: halo quente atrás de quem está na vez */}
      {isCurrent && !eliminated && (
        <div
          aria-hidden
          className="lamp"
          style={{ width: U(190), height: U(190), transform: `translate(-50%, ${U(-18)})` }}
        />
      )}

      {balloon && (
        <div
          data-seat-balloon
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: U(2),
            zIndex: 3,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            fontSize: U(12),
            padding: `${U(2)} ${U(8)}`,
            color: "#14101a",
            background: COLORS.gold,
            border: "2px solid #14101a",
          }}
        >
          {balloon}
        </div>
      )}

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
            width: U(portrait ? 62 : 56),
            height: U(portrait ? 72 : 56),
            borderRadius: portrait ? U(10) : "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: U(18),
            color: "#fff",
            background: eliminated ? "#555" : portrait ? "#2a1d33" : avatarColor(name),
            border: portrait ? `${U(3)} solid ${COLORS.gold}` : undefined,
            outline: portrait ? `${U(2)} solid #14101a` : undefined,
            overflow: portrait ? "visible" : undefined,
            filter: eliminated ? "grayscale(1)" : undefined,
            boxShadow:
              isCurrent && !eliminated
                ? undefined // o keyframe turn-pulse controla o box-shadow
                : selectable
                  ? `0 0 0 ${U(3)} ${COLORS.red}`
                  : `0 ${U(3)} ${U(8)} rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)`,
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
              borderRadius: U(6),
              objectFit: "cover",
              objectPosition: "center top",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          avatarInitials(name)
        )}
        {selectable && <span style={{ ...badge, top: U(-10), right: U(-10) }}>🎯</span>}
        {passed && !eliminated && (
          <span style={{ ...badge, bottom: U(-6), right: U(-8), background: "#2f6b45" }}>✔</span>
        )}
      </div>

      {/* Plaquinha do nome, meio sobreposta ao retrato */}
      <div
        style={{
          marginTop: U(-10),
          padding: `${U(2)} ${U(10)}`,
          maxWidth: U(110),
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: CINZEL,
          fontWeight: isMe ? 800 : 600,
          fontSize: U(12),
          letterSpacing: 0.3,
          textAlign: "center",
          color: isMe ? COLORS.turn : COLORS.text,
          background: "linear-gradient(#3a2a22, #241a16)",
          border: "1px solid rgba(240,165,0,0.55)",
          borderRadius: U(4),
          boxShadow: `0 ${U(2)} ${U(6)} rgba(0,0,0,0.5)`,
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
          padding: `${U(1)} ${U(10)}`,
          borderRadius: 999,
          background: "rgba(14,8,10,0.72)",
          border: "1px solid rgba(240,165,0,0.35)",
        }}
      >
        <ChipPile count={coins} shown={shownCoins} ownerId={player.id} custo={isMe ? custoFantasma : 0} tombada={eliminated} />
        <CoinDelta delta={coinDelta} deltaKey={deltaKey} />
      </div>

      {/* Cartas estilo UNO: versos visíveis (qtd = influências); ao perder, a
          carta vira em 3D mostrando o personagem dessaturado. */}
      <div style={{ display: "flex", gap: U(5), minHeight: U(56) }}>
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
  width: U(22),
  height: U(22),
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: U(12),
  lineHeight: 1,
  background: "#8b1a1a",
  border: `${U(2)} solid #14101a`,
  color: "#fff",
  boxShadow: `0 ${U(2)} ${U(6)} rgba(0,0,0,0.5)`,
};
