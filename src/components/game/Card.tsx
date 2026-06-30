// Carta de personagem em CSS puro (sem imagem externa). Visual único compartilhado
// pela mesa (Seat, size="sm") e pela mão (HandView, size="lg"), dirigido por
// CHAR_VISUAL. Variantes (DESIGN.md "Cartas — Visual"):
//  - face-down  → costas #2c3e50 + borda dourada sutil (sem personagem)
//  - owned      → cor cheia do personagem + borda dourada brilhante
//  - bluff      → dessaturada + 🎭 (você não tem, mas pode blefar)
//  - lost       → revelada/perdida: dessaturada, opacidade 50%, ❌
"use client";

import type { CSSProperties, ReactNode } from "react";

import type { Character } from "@/src/types/game";
import { CHAR_LABEL, CHAR_VISUAL, COLORS } from "./helpers";

type Size = "sm" | "lg";

const DIMS: Record<Size, { w: number; h: number; icon: number; label: number; radius: number }> = {
  sm: { w: 30, h: 42, icon: 16, label: 0, radius: 5 },
  lg: { w: 88, h: 124, icon: 34, label: 13, radius: 10 },
};

export default function Card({
  character,
  faceDown,
  lost,
  bluff,
  selected,
  size = "lg",
  onClick,
  style,
  hint,
}: {
  character?: Character | null;
  faceDown?: boolean;
  lost?: boolean;
  bluff?: boolean;
  selected?: boolean;
  size?: Size;
  onClick?: () => void;
  style?: CSSProperties;
  hint?: ReactNode; // texto auxiliar (ex.: ação do personagem) — só no size="lg"
}) {
  const d = DIMS[size];
  const base: CSSProperties = {
    position: "relative",
    width: d.w,
    height: d.h,
    borderRadius: d.radius,
    flex: "none",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: size === "lg" ? 8 : 2,
    cursor: onClick ? "pointer" : "default",
    userSelect: "none",
    overflow: "hidden",
    ...style,
  };

  // ── Face-down: costas (não revela personagem) ─────────────────────────────
  if (faceDown || !character) {
    return (
      <div
        onClick={onClick}
        style={{
          ...base,
          background: `linear-gradient(150deg, ${COLORS.cardBack}, #1f2d3d)`,
          border: "1px solid rgba(240,165,0,0.45)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <span style={{ fontSize: d.icon, opacity: 0.25, color: COLORS.gold }}>♛</span>
      </div>
    );
  }

  const v = CHAR_VISUAL[character];
  const muted = lost || bluff; // dessaturada

  return (
    <div
      onClick={onClick}
      title={CHAR_LABEL[character]}
      style={{
        ...base,
        background: v.color,
        color: "#fff",
        opacity: lost ? 0.5 : 1,
        filter: muted ? "grayscale(0.85) brightness(0.8)" : "none",
        border: lost
          ? "1px solid #555"
          : bluff
            ? "2px solid #3a3a3a"
            : `2px solid ${COLORS.gold}`,
        boxShadow: muted
          ? "inset 0 -18px 26px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.4)"
          : `inset 0 -18px 26px rgba(0,0,0,0.35), 0 0 ${selected ? 16 : 10}px 1px rgba(240,165,0,0.55), 0 4px 10px rgba(0,0,0,0.4)`,
      }}
    >
      <span style={{ fontSize: d.icon, lineHeight: 1 }}>{v.icon}</span>
      {size === "lg" && (
        <span style={{ fontWeight: 700, fontSize: d.label }}>{CHAR_LABEL[character]}</span>
      )}
      {size === "lg" && hint && (
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.78)" }}>{hint}</span>
      )}

      {lost && <Corner size={size}>❌</Corner>}
      {bluff && !lost && <Corner size={size}>🎭</Corner>}
    </div>
  );
}

function Corner({ children, size }: { children: ReactNode; size: Size }) {
  return (
    <span
      style={{
        position: "absolute",
        top: size === "sm" ? 1 : 4,
        right: size === "sm" ? 2 : 6,
        fontSize: size === "sm" ? 10 : 13,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}
