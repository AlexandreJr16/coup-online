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
import { F, U } from "./escalaMesa";
import { artUrl, backUrl, CHAR_LABEL, CHAR_SHORT, CHAR_VISUAL, CINZEL, COLORS } from "./helpers";

type Size = "sm" | "lg";
// Tamanhos em UNIDADES DA MESA (1 unidade = 1 px em 1280x720); o degrau de escala entra por U().
interface Dim {
  w: number;
  h: number;
  icon: number;
  label: number;
  radius: number;
}
const DIMS: Record<Size, Dim> = {
  sm: { w: 40, h: 56, icon: 22, label: 0, radius: 6 },
  lg: { w: 88, h: 124, icon: 34, label: 12, radius: 10 },
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
  flipLost = true,
  foil = false,
  onPointerMove,
  onPointerLeave,
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
  foil?: boolean; // brilho holográfico (cartas que são suas)
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLDivElement>) => void;
  flipLost?: boolean; // no modo flip, a face aparece como "perdida" (dessaturada); false = viva
}) {
  const d = DIMS[size];
  const outer: CSSProperties = {
    position: "relative",
    width: U(d.w),
    height: U(d.h),
    borderRadius: U(d.radius),
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
        style={{ ...outer, perspective: U(700) }}
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
            <FrontFace d={d} character={character} size={size} lost={flipLost} transform="rotateY(180deg)" />
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
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
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
          foil={foil}
        />
      )}
    </div>
  );
}

function faceStyle(d: Dim, extra: CSSProperties): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    borderRadius: U(d.radius),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: U(4),
    padding: U(d.label ? 8 : 2),
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
        <span style={{ fontSize: F(d.icon), opacity: 0.3, color: COLORS.gold }}>♛</span>
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
  foil,
}: {
  d: Dim;
  character: Character;
  size: Size;
  lost?: boolean;
  bluff?: boolean;
  selected?: boolean;
  hint?: ReactNode;
  transform?: string;
  foil?: boolean;
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
      ? `${U(2)} solid #3a3a3a`
      : `${U(2)} solid ${COLORS.gold}`;
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
          ? `inset 0 ${U(-18)} ${U(26)} rgba(0,0,0,0.35), 0 ${U(2)} ${U(6)} rgba(0,0,0,0.4)`
          : `inset 0 ${U(-18)} ${U(26)} rgba(0,0,0,0.35), 0 0 ${U(selected ? 16 : 10)} 1px rgba(240,165,0,0.55), 0 ${U(4)} ${U(10)} rgba(0,0,0,0.4)`,
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
              borderRadius: U(d.radius),
              border: frame,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
          {size === "lg" && (
            <div data-caption style={caption}>
              <span
                style={{ ...umaLinha, fontFamily: CINZEL, fontWeight: 800, fontSize: F(d.label), letterSpacing: 0.3, textShadow: "0 1px 2px #000, 0 0 6px #000" }}
              >
                {CHAR_SHORT[character]}
              </span>
              {hint && <span style={{ ...duasLinhas, fontSize: F(10), color: "rgba(255,240,210,0.92)", textShadow: "0 1px 2px #000" }}>{hint}</span>}
            </div>
          )}
        </>
      ) : (
        <>
          <span style={{ fontSize: F(d.icon), lineHeight: 1 }}>{v.icon}</span>
          {size === "lg" && (
            <span
              style={{ ...umaLinha, fontFamily: CINZEL, fontWeight: 700, fontSize: F(d.label), letterSpacing: 0.5 }}
            >
              {CHAR_SHORT[character]}
            </span>
          )}
          {size === "lg" && hint && (
            <span style={{ ...duasLinhas, fontSize: F(10), color: "rgba(255,255,255,0.78)" }}>{hint}</span>
          )}
        </>
      )}

      {foil && !muted && <div data-foil className="foil" aria-hidden />}
      {lost && <Corner size={size}>❌</Corner>}
      {bluff && !lost && (
        <Corner size={size}>
          <Pic name="mascara" emoji="🎭" size={16} />
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
  padding: `${U(14)} ${U(4)} ${U(5)}`,
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
        top: U(size === "sm" ? 2 : 4),
        right: U(size === "sm" ? 3 : 6),
        fontSize: F(size === "sm" ? 12 : 13),
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

// Rótulo de uma linha só: com fonte larga, corta com reticências em vez de sair da carta.
const umaLinha: CSSProperties = { display: "block", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
// Dica (o que a carta faz): até 2 linhas, centralizada.
const duasLinhas: CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%", textAlign: "center", lineHeight: 1.1 };
