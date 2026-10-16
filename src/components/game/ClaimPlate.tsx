// Placa da jogada no centro da mesa: quem fez o quê (e contra quem), com a barra de
// tempo da janela. NÃO bloqueia a mesa (pointer-events: none) — é informação, não
// modal. No passo 4.3 isto vira a carta jogada de verdade, com anel de tempo.
"use client";

import type { CSSProperties } from "react";

import type { GameView } from "@/src/types/game";
import { ACTION_META, CHAR_LABEL, CINZEL, COLORS } from "./helpers";

export default function ClaimPlate({
  view,
  secondsLeft,
}: {
  view: GameView;
  secondsLeft: number;
}) {
  const p = view.pending;
  const timer = view.timer;
  if (!p || !timer) return null;
  const name = (id: string | null) => view.players.find((x) => x.id === id)?.name ?? "?";
  const pct = Math.max(0, Math.min(100, (secondsLeft / (timer.seconds || 1)) * 100));

  const blocked = view.phase === "janela_contestar_bloqueio" && p.block;
  return (
    <div style={plate}>
      <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 15, letterSpacing: 0.4 }}>
        {blocked
          ? `🛡️ ${name(p.block!.blockerId)} · ${CHAR_LABEL[p.block!.character]}`
          : `${name(p.actorId)} · ${ACTION_META[p.action].label}${p.targetId ? ` → ${name(p.targetId)}` : ""}`}
      </div>
      <div style={track}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: pct < 30 ? COLORS.red : COLORS.gold,
            transition: "width 250ms linear",
          }}
        />
      </div>
    </div>
  );
}

const plate: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "36%",
  transform: "translateX(-50%)",
  zIndex: 6,
  minWidth: 240,
  padding: "10px 16px 12px",
  textAlign: "center",
  color: COLORS.text,
  background: "linear-gradient(#e9dcbf, #d8c59a)",
  border: "1px solid #b8923f",
  borderRadius: 10,
  boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};
const track: CSSProperties = {
  height: 6,
  marginTop: 8,
  background: "rgba(20,16,26,0.35)",
  borderRadius: 3,
  overflow: "hidden",
};
