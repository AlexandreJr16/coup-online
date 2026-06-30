// Carta de personagem em CSS puro (sem imagem externa). Visual único compartilhado
// pela mesa (Seat, size="sm") e pela mão (HandView, size="lg"), dirigido por
// CHAR_VISUAL (que deriva de cards.ts). Variantes (DESIGN.md "Cartas — Visual"):
//  - face-down  → costas #2c3e50 + borda dourada (sem personagem)
//  - owned      → cor cheia + borda dourada brilhante
//  - bluff      → dessaturada + 🎭
//  - lost       → revelada/perdida: dessaturada, opacidade 50%, ❌
// Modo `flip` (mesa): estrutura 3D que VIRA sozinha quando `revealed` passa a true.
"use client";

import type { CSSProperties, ReactNode } from "react";

import type { Character } from "@/src/types/game";
import { CHAR_LABEL, CHAR_VISUAL, COLORS } from "./helpers";

type Size = "sm" | "lg";
interface Dim {
  w: number;
  h: number;
  icon: number;
  label: number;
  radius: number;
}
const DIMS: Record<Size, Dim> = {
  sm: { w: 40, h: 56, icon: 22, label: 0, radius: 6 },
  lg: { w: 88, h: 124, icon: 34, label: 13, radius: 10 },
};

const CINZEL = "var(--font-cinzel), Georgia, serif";

export default function Card({
  character,
  faceDown,
  lost,
  bluff,
  selected,
  flip,
  revealed,
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
  flip?: boolean; // ativa a estrutura 3D (mesa)
  revealed?: boolean; // controla a virada quando flip=true
  size?: Size;
  onClick?: () => void;
  style?: CSSProperties;
  hint?: ReactNode; // texto auxiliar (ação) — só no size="lg"
}) {
  const d = DIMS[size];
  const outer: CSSProperties = {
    position: "relative",
    width: d.w,
    height: d.h,
    borderRadius: d.radius,
    flex: "none",
    cursor: onClick ? "pointer" : "default",
    userSelect: "none",
    ...style,
  };

  // ── Mesa: carta que vira em 3D ao ser revelada (P4) ───────────────────────
  if (flip) {
    return (
      <div
        onClick={onClick}
        title={character ? CHAR_LABEL[character] : undefined}
        style={{ ...outer, perspective: 700 }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 600ms cubic-bezier(0.2,0.8,0.2,1)",
            transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <BackFace d={d} />
          {/* Face revelada (perdida) — só ganha personagem no instante da virada,
              então a carta oculta de outro jogador nunca fica no DOM. */}
          {character ? (
            <FrontFace d={d} character={character} size={size} lost transform="rotateY(180deg)" />
          ) : (
            <BackFace d={d} transform="rotateY(180deg)" />
          )}
        </div>
      </div>
    );
  }

  // ── Estático: verso OU frente (mão, troca, revelar) ───────────────────────
  return (
    <div
      onClick={onClick}
      title={character ? CHAR_LABEL[character] : undefined}
      style={outer}
    >
      {faceDown || !character ? (
        <BackFace d={d} />
      ) : (
        <FrontFace
          d={d}
          character={character}
          size={size}
          lost={lost}
          bluff={bluff}
          selected={selected}
          hint={hint}
        />
      )}
    </div>
  );
}

function faceStyle(d: Dim, extra: CSSProperties): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    borderRadius: d.radius,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: d.label ? 8 : 2,
    boxSizing: "border-box",
    overflow: "hidden",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    ...extra,
  };
}

function BackFace({ d, transform }: { d: Dim; transform?: string }) {
  return (
    <div
      style={faceStyle(d, {
        background: `linear-gradient(150deg, ${COLORS.cardBack}, #1f2d3d)`,
        border: "1px solid rgba(240,165,0,0.5)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
        transform,
      })}
    >
      <span style={{ fontSize: d.icon, opacity: 0.3, color: COLORS.gold }}>♛</span>
    </div>
  );
}

function FrontFace({
  d,
  character,
  size,
  lost,
  bluff,
  selected,
  hint,
  transform,
}: {
  d: Dim;
  character: Character;
  size: Size;
  lost?: boolean;
  bluff?: boolean;
  selected?: boolean;
  hint?: ReactNode;
  transform?: string;
}) {
  const v = CHAR_VISUAL[character];
  const muted = lost || bluff;
  return (
    <div
      style={faceStyle(d, {
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
        transform,
      })}
    >
      <span style={{ fontSize: d.icon, lineHeight: 1 }}>{v.icon}</span>
      {size === "lg" && (
        <span
          style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: d.label, letterSpacing: 0.5 }}
        >
          {CHAR_LABEL[character]}
        </span>
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
        top: size === "sm" ? 2 : 4,
        right: size === "sm" ? 3 : 6,
        fontSize: size === "sm" ? 12 : 13,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}
