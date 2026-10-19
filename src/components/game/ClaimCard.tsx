// A jogada em andamento, NA MESA: uma carta virada no centro com o lacre da ação e um
// anel de tempo em volta (substitui a placa de texto). Quem declarou, o quê e contra quem
// vem numa faixa curta embaixo. Não bloqueia cliques. Na janela de contestar um bloqueio,
// mostra o escudo e quem bloqueou.
"use client";

import type { CSSProperties } from "react";

import type { GameView } from "@/src/types/game";
import { Pic } from "./ActionSeal";
import Card from "./Card";
import { U } from "./escalaMesa";
import { ACTION_ICON, ACTION_META, CHAR_LABEL, CINZEL, COLORS } from "./helpers";

// Medidas em unidades da mesa (U): o anel é um SVG com viewBox nessas unidades, então o
// perímetro (e o ringOffset) não mudam com o degrau de escala.
const CARD_W = 88;
const CARD_H = 124;
const PAD = 8; // folga do anel em volta da carta
const R = 12;
export const RING_PERIMETER = 2 * (CARD_W + 2 * PAD + CARD_H + 2 * PAD) - (8 - 2 * Math.PI) * R;

/** Quanto do anel já foi "consumido" (dashoffset): cheio = 0; vazio = perímetro. */
export function ringOffset(pctLeft: number, perimeter = RING_PERIMETER): number {
  const p = Math.max(0, Math.min(100, pctLeft));
  return perimeter * (1 - p / 100);
}

export default function ClaimCard({ view, secondsLeft }: { view: GameView; secondsLeft: number }) {
  const p = view.pending;
  const timer = view.timer;
  if (!p || !timer) return null;
  const name = (id: string | null) => view.players.find((x) => x.id === id)?.name ?? "?";
  const pct = Math.max(0, Math.min(100, (secondsLeft / (timer.seconds || 1)) * 100));
  const blocked = view.phase === "janela_contestar_bloqueio" && p.block;
  const icon = blocked ? { icon: "bloquear" as const, emoji: "🛡️" } : ACTION_ICON[p.action];
  const legenda = blocked
    ? `${name(p.block!.blockerId)} · ${CHAR_LABEL[p.block!.character]}`
    : `${name(p.actorId)} · ${ACTION_META[p.action].label}${p.targetId ? ` → ${name(p.targetId)}` : ""}`;
  const W = CARD_W + 2 * PAD;
  const H = CARD_H + 2 * PAD;

  return (
    <div data-testid="claim-plate" data-pct={Math.round(pct)} style={wrap}>
      <div style={{ position: "relative", width: U(W), height: U(H) }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: U(W), height: U(H) }} aria-hidden>
          <rect x={2} y={2} width={W - 4} height={H - 4} rx={R} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={4} />
          <rect
            x={2}
            y={2}
            width={W - 4}
            height={H - 4}
            rx={R}
            fill="none"
            stroke={pct < 30 ? COLORS.red : COLORS.gold}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={RING_PERIMETER}
            strokeDashoffset={ringOffset(pct)}
            style={{ transition: "stroke-dashoffset 250ms linear, stroke 200ms" }}
          />
        </svg>
        <div style={{ position: "absolute", left: U(PAD), top: U(PAD), boxShadow: `0 ${U(10)} ${U(26)} rgba(0,0,0,0.55)`, borderRadius: U(10) }}>
          <Card faceDown size="lg" />
        </div>
        {/* Lacre da ação preso à carta */}
        <div style={seal}>
          <Pic name={icon.icon} emoji={icon.emoji} size={32} />
        </div>
      </div>
      <div style={legend}>{legenda}</div>
    </div>
  );
}

const wrap: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "48%",
  transform: "translate(-50%, -50%)",
  zIndex: 6,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: U(8),
  pointerEvents: "none",
};
const seal: CSSProperties = {
  position: "absolute",
  right: U(-10),
  bottom: U(-6),
  width: U(46),
  height: U(46),
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(circle at 35% 30%, #d0453a, #8b1a1a 70%)",
  border: `${U(2)} solid #5c1620`,
  boxShadow: `0 ${U(3)} ${U(8)} rgba(0,0,0,0.55), inset 0 ${U(2)} ${U(3)} rgba(255,255,255,0.25)`,
};
const legend: CSSProperties = {
  padding: `${U(4)} ${U(12)}`,
  fontFamily: CINZEL,
  fontWeight: 700,
  fontSize: U(14),
  color: "#2b2236",
  background: "linear-gradient(#e9dcbf, #d8c59a)",
  border: "1px solid #b8923f",
  borderRadius: U(8),
  whiteSpace: "nowrap",
  boxShadow: `0 ${U(4)} ${U(12)} rgba(0,0,0,0.45)`,
};
