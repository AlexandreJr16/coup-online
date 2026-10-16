// Carta de personagem: CSS puro + emoji, ou retrato pixel art quando o catálogo
// (cards.ts `arte`) tem imagem — com fallback para o emoji. Visual único compartilhado
// pela mesa (Seat, size="sm") e pela mão (HandView, size="lg"), dirigido por
// CHAR_VISUAL (que deriva de cards.ts). Variantes (DESIGN.md "Cartas — Visual"):
//  - face-down  → costas #2c3e50 + borda dourada (sem personagem)
//  - owned      → cor cheia + borda dourada brilhante
//  - bluff      → dessaturada + 🎭
//  - lost       → revelada/perdida: dessaturada, opacidade 50%, ❌
// Modo `flip` (mesa): estrutura 3D que VIRA sozinha quando `revealed` passa a true.
"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import type { Expressao } from "@/src/lib/game/cards";
import type { Character } from "@/src/types/game";
import { Pic } from "./ActionSeal";
import { artUrl, backUrl, CHAR_LABEL, CHAR_SHORT, CHAR_VISUAL, CINZEL, COLORS } from "./helpers";

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
  className,
  onPointerDown,
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
  className?: string; // classe na carta (ex.: hand-card para o hover da mão)
  onPointerDown?: (e: React.PointerEvent) => void; // início de arrasto (mão)
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
        className={className}
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
          <BackFace d={d} size={size} />
          {/* Face revelada (perdida) — só ganha personagem no instante da virada,
              então a carta oculta de outro jogador nunca fica no DOM. */}
          {character ? (
            <FrontFace d={d} character={character} size={size} lost transform="rotateY(180deg)" />
          ) : (
            <BackFace d={d} size={size} transform="rotateY(180deg)" />
          )}
        </div>
      </div>
    );
  }

  // ── Estático: verso OU frente (mão, troca, revelar) ───────────────────────
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      title={character ? CHAR_LABEL[character] : undefined}
      className={className}
      style={outer}
    >
      {faceDown || !character ? (
        <BackFace d={d} size={size} />
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

function BackFace({ d, size, transform }: { d: Dim; size: Size; transform?: string }) {
  // Verso em pixel art do tema; se o arquivo faltar, cai no verso CSS (coroa ♛).
  const [failed, setFailed] = useState(false);
  const src = failed ? null : backUrl(size);
  return (
    <div
      style={faceStyle(d, {
        background: `linear-gradient(150deg, ${COLORS.cardBack}, #1f2d3d)`,
        border: src ? "none" : "1px solid rgba(240,165,0,0.5)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
        transform,
      })}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <span style={{ fontSize: d.icon, opacity: 0.3, color: COLORS.gold }}>♛</span>
      )}
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
  // Expressão do retrato: perdida → atingido; carta que você não tem (blefe) → blefe.
  // ("eliminado" fica para o jogador inteiro, no Seat — Fase 3.)
  const expr: Expressao = lost ? "atingido" : bluff ? "blefe" : "neutro";
  const src = artUrl(character, expr, size);
  const [artFailed, setArtFailed] = useState(false);
  const art = src && !artFailed ? src : null; // sem imagem (ou erro de carga) → emoji
  const frame = lost
    ? "1px solid #555"
    : bluff
      ? "2px solid #3a3a3a"
      : `2px solid ${COLORS.gold}`;
  return (
    <div
      style={faceStyle(d, {
        background: v.color,
        color: "#fff",
        opacity: lost ? 0.5 : 1,
        filter: muted ? "grayscale(0.85) brightness(0.8)" : "none",
        // Com arte, a moldura vira overlay (abaixo) para a imagem ocupar o tamanho
        // exato da carta — escala 1:1 mantém os pixels nítidos.
        border: art ? "none" : frame,
        boxShadow: muted
          ? "inset 0 -18px 26px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.4)"
          : `inset 0 -18px 26px rgba(0,0,0,0.35), 0 0 ${selected ? 16 : 10}px 1px rgba(240,165,0,0.55), 0 4px 10px rgba(0,0,0,0.4)`,
        transform,
      })}
    >
      {art ? (
        <>
          {/* Pixel art estática: <img> simples (sem otimização do next/image, que
              suavizaria os pixels); imageRendering mantém as bordas nítidas. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art}
            alt=""
            draggable={false}
            onError={() => setArtFailed(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              imageRendering: "pixelated",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: d.radius,
              border: frame,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
          {size === "lg" && (
            <div style={caption}>
              <span
                style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: d.label, letterSpacing: 0.5 }}
              >
                {CHAR_SHORT[character]}
              </span>
              {hint && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.78)" }}>{hint}</span>}
            </div>
          )}
        </>
      ) : (
        <>
          <span style={{ fontSize: d.icon, lineHeight: 1 }}>{v.icon}</span>
          {size === "lg" && (
            <span
              style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: d.label, letterSpacing: 0.5 }}
            >
              {CHAR_SHORT[character]}
            </span>
          )}
          {size === "lg" && hint && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.78)" }}>{hint}</span>
          )}
        </>
      )}

      {lost && <Corner size={size}>❌</Corner>}
      {bluff && !lost && (
        <Corner size={size}>
          <Pic name="mascara" emoji="🎭" size={size === "sm" ? 16 : 16} />
        </Corner>
      )}
    </div>
  );
}

// Faixa de legenda sobre o retrato (nome + ação), legível sobre qualquer arte.
const caption: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "14px 4px 5px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1,
  background: "linear-gradient(transparent, rgba(10,8,16,0.88))",
};

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
