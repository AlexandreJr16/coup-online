// Mockup estático do dock (sem socket, dados fictícios). Palco lógico de 1280x720; em 1920
// o mesmo desenho é escalado em 1,5x dentro de um div de 1920x1080 (ver "Limitações").
// Três cascas para a mesma mão: cavalete | mesa | bandeja. As três zonas (ações básicas,
// poderes pela carta, reações) ficam sempre no mesmo lugar nas três e nos três estados.
import type { CSSProperties, ReactNode } from "react";

import { CARD_BY_ID } from "@/src/lib/game/cards";
import { CINZEL, COLORS } from "@/src/components/game/helpers";
import {
  AMPULHETA_PAL,
  AMPULHETA_ROWS,
  EXCLAMA_PAL,
  EXCLAMA_ROWS,
  FELT,
  LEATHER,
  LEATHER_INNER,
  MOEDA_PAL,
  MOEDA_ROWS,
  SWITCH_PAL,
  WOOD,
  WOOD_DARK,
  Disc,
  Plate,
  PxImg,
  Sprite,
  discClip,
  ellipseClip,
  notch,
  switchRows,
} from "./pixel";

export type Variant = "cavalete" | "mesa" | "bandeja";
export type Estado = "minha" | "reacao" | "espera";

const ART = "/art/imperio";
const SANS = "var(--font-geist-sans), Arial, sans-serif";
const icon = (n: string) => `${ART}/icones/${n}.sm.png`;
const icon64 = (n: string) => `${ART}/icones/${n}.png`;

const HAND_TOP = 520;
const CARD_W = 110;
const CARD_H = 155;
const HAND_LEFT = [521, 649]; // 2 cartas de 110 + vão de 18, centradas em 640

export const CSS = `
@keyframes dock-ring { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
@keyframes dock-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
.dock-ring { animation: dock-ring 1.4s steps(4, end) infinite; }
.dock-bob { animation: dock-bob 1.2s steps(2, end) infinite; }
.dock-btn { cursor: pointer; background: none; border: 0; padding: 0; font: inherit; color: inherit; }
.dock-btn:disabled { cursor: not-allowed; }
.dock-btn:focus-visible { outline: 3px solid #ffd866; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .dock-ring, .dock-bob { animation: none; } }
`;

// ── Peças pequenas ──────────────────────────────────────────────────────────
function Key({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <kbd
      style={{
        position: "absolute",
        padding: "0 5px",
        minWidth: 16,
        height: 16,
        lineHeight: "14px",
        textAlign: "center",
        font: `700 10px/14px ${SANS}`,
        color: "#1a1a2e",
        background: "#e8dcc0",
        border: "2px solid #14101a",
        boxShadow: "0 2px 0 #14101a",
        pointerEvents: "none",
        ...style,
      }}
    >
      {children}
    </kbd>
  );
}

/** Bloco de madeira/couro com contorno, textura e friso de luz. */
function Slab({
  l,
  t,
  w,
  h,
  tile,
  size,
  edge,
  light,
  shade,
  n = 6,
  style,
  children,
}: {
  l: number;
  t: number;
  w: number;
  h: number;
  tile: string;
  size: string;
  edge: string;
  light: string;
  shade: string;
  n?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", left: l, top: t, width: w, height: h, ...style }}>
      <div style={{ position: "absolute", inset: 0, background: edge, clipPath: notch(n) }} />
      <div
        style={{
          position: "absolute",
          inset: 4,
          background: tile,
          backgroundSize: size,
          imageRendering: "pixelated",
          clipPath: notch(n - 2),
        }}
      />
      <div style={{ position: "absolute", left: n + 2, right: n + 2, top: 4, height: 4, background: light }} />
      <div style={{ position: "absolute", left: n + 2, right: n + 2, bottom: 4, height: 6, background: shade }} />
      {children}
    </div>
  );
}

function Studs({ w, h, inset = 10 }: { w: number; h: number; inset?: number }) {
  const s = 8;
  const pts: Array<[number, number]> = [
    [inset, inset],
    [w - inset - s, inset],
    [inset, h - inset - s],
    [w - inset - s, h - inset - s],
  ];
  return (
    <>
      {pts.map(([x, y]) => (
        <div key={`${x}-${y}`} style={{ position: "absolute", left: x, top: y, width: s, height: s, background: "#e2b34a", boxShadow: "inset -2px -2px 0 #9b6b14, 0 0 0 2px #2a1a08" }} />
      ))}
    </>
  );
}

// ── Cenário: salão, mesa (madeira + veludo), assentos e centro ──────────────
function Table() {
  const wood = { l: -110, t: -70, w: 1500, h: 900 };
  const layers: Array<{ l: number; t: number; w: number; h: number; bg: string; tile?: string; size?: string }> = [
    { ...wood, bg: "#3f2210", tile: WOOD, size: "192px 96px" },
    { l: -72, t: -32, w: 1424, h: 598, bg: "#24130a" },
    { l: -68, t: -28, w: 1416, h: 590, bg: "#d9a028" },
    { l: -64, t: -24, w: 1408, h: 582, bg: "#173f30", tile: FELT, size: "96px 96px" },
  ];
  return (
    <>
      {layers.map((e, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: e.l,
            top: e.t,
            width: e.w,
            height: e.h,
            background: e.tile ?? e.bg,
            backgroundSize: e.size,
            imageRendering: "pixelated",
            clipPath: ellipseClip(e.w, e.h, 6),
          }}
        />
      ))}
    </>
  );
}

function Seat({
  cx,
  y,
  name,
  avatar,
  coins,
  active,
  backs = true,
  waiting = false,
}: {
  cx: number;
  y: number;
  name: string;
  avatar: string;
  coins: number;
  active: boolean;
  backs?: boolean;
  waiting?: boolean;
}) {
  return (
    <div data-testid={`seat-${name}`} style={{ position: "absolute", left: cx - 70, top: y, width: 190, height: 140 }}>
      {active && (
        <div
          className="dock-ring"
          aria-hidden
          style={{ position: "absolute", left: -6, top: -6, width: 88, height: 116, background: COLORS.turn, clipPath: notch(6) }}
        />
      )}
      <div style={{ position: "absolute", left: 0, top: 0, width: 76, height: 104 }}>
        <div style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(4) }} />
        <div style={{ position: "absolute", inset: 3, background: "#b8793a", clipPath: notch(4) }} />
        <PxImg src={`${ART}/avatares/${avatar}.png`} w={64} h={92} style={{ position: "absolute", left: 6, top: 6 }} />
      </div>
      <Plate w={96} h={28} outline="#140c08" face="#2b1f1c" light="#2b1f1c" shade="#2b1f1c" padding="0 6px" style={{ position: "absolute", left: -10, top: 108 }}>
        <span style={{ flex: 1, textAlign: "center", fontFamily: CINZEL, fontWeight: 700, fontSize: 13, color: COLORS.text }}>{name}</span>
      </Plate>
      <div style={{ position: "absolute", left: 86, top: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Sprite rows={MOEDA_ROWS} palette={MOEDA_PAL} px={3} />
        <b style={{ fontFamily: CINZEL, fontSize: 20, color: COLORS.gold, textShadow: "0 2px 0 #000" }}>{coins}</b>
      </div>
      {backs && (
        <>
          <PxImg src={`${ART}/verso.sm.png`} w={40} h={58} style={{ position: "absolute", left: 86, top: 44 }} />
          <PxImg src={`${ART}/verso.sm.png`} w={40} h={58} style={{ position: "absolute", left: 104, top: 40 }} />
        </>
      )}
      {waiting && (
        <div className="dock-bob" style={{ position: "absolute", left: 134, top: 2 }} data-testid="seat-espera">
          <Sprite rows={AMPULHETA_ROWS} palette={AMPULHETA_PAL} px={3} label="pensando" />
        </div>
      )}
    </div>
  );
}

function Coins({ x, y }: { x: number; y: number }) {
  const piles = [5, 3, 4];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 110, height: 128 }} data-testid="erario">
      {piles.map((n, p) =>
        Array.from({ length: n }).map((_, i) => (
          <div key={`${p}-${i}`} style={{ position: "absolute", left: p * 34, top: 96 - i * 9 - (p === 1 ? 6 : 0) }}>
            <Sprite rows={MOEDA_ROWS} palette={MOEDA_PAL} px={4} />
          </div>
        )),
      )}
    </div>
  );
}

function Deck({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 100, height: 134 }} data-testid="baralho">
      {[0, 1, 2].map((i) => (
        <PxImg key={i} src={`${ART}/verso.png`} w={88} h={128} style={{ position: "absolute", left: i * 3, top: 6 - i * 3 }} />
      ))}
    </div>
  );
}

function Tag({ x, y, w = 110, children }: { x: number; y: number; w?: number; children: ReactNode }) {
  return (
    <Plate w={w} h={26} outline="#140c08" face="#2b1f1c" light="#2b1f1c" shade="#2b1f1c" padding="0 6px" style={{ position: "absolute", left: x, top: y }}>
      <span style={{ flex: 1, textAlign: "center", fontFamily: CINZEL, fontWeight: 700, fontSize: 12, color: COLORS.dim, whiteSpace: "nowrap" }}>{children}</span>
    </Plate>
  );
}

/** A jogada na mesa: carta virada com o lacre da ação, o alvo e a barra de tempo. */
function Jogada() {
  const lit = 6;
  return (
    <div data-testid="jogada" style={{ position: "absolute", left: 0, top: 0 }}>
      <PxImg src={`${ART}/verso.png`} w={88} h={128} style={{ position: "absolute", left: 596, top: 186 }} />
      <div style={{ position: "absolute", left: 660, top: 170 }}>
        <Disc d={56} outline="#2a0605" ring="#7a1a14" face="#a8312c">
          <PxImg src={icon("extorquir")} w={32} h={32} />
        </Disc>
      </div>
      <Tag x={540} y={320} w={200}>
        Bia · Extorquir → você
      </Tag>
      <div style={{ position: "absolute", left: 560, top: 354, display: "flex", gap: 2 }} aria-label="tempo restante">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 8, background: i < lit ? COLORS.gold : "#3a2e24", boxShadow: "0 0 0 2px #140c08" }} />
        ))}
      </div>
    </div>
  );
}

// ── Zona 1: ações básicas (fichas sobre a madeira) ──────────────────────────
type FichaState = "ready" | "off" | "locked";
function Ficha({ x, y, name, label, sub, ring, face, state }: { x: number; y: number; name: string; label: string; sub: string; ring: string; face: string; state: FichaState }) {
  const filter = state === "off" ? "grayscale(0.85) brightness(0.62)" : state === "locked" ? "grayscale(0.4) brightness(0.78)" : undefined;
  return (
    <button
      type="button"
      className="dock-btn"
      disabled={state !== "ready"}
      data-testid={`ficha-${name}`}
      data-state={state}
      aria-label={`${label} ${sub}`}
      style={{ position: "absolute", left: x, top: y, width: 88, height: 116 }}
    >
      <div style={{ position: "absolute", left: 0, top: 6, width: 88, height: 88, background: "rgba(0,0,0,0.4)", clipPath: discClip(88, 4) }} />
      <div style={{ position: "absolute", left: 0, top: 0, filter }}>
        <Disc d={88} outline="#1a0f08" ring={ring} face={face}>
          <PxImg src={icon64(name)} w={64} h={64} />
        </Disc>
      </div>
      {state === "locked" && <PxImg src={icon("cadeado")} w={32} h={32} style={{ position: "absolute", right: -4, top: -4 }} />}
      <div style={{ position: "absolute", left: 0, top: 92, filter }}>
        <Plate w={88} h={24} outline="#140c08" face="#2b1f1c" light="#2b1f1c" shade="#2b1f1c" padding="0 4px">
          <span style={{ flex: 1, textAlign: "center", fontFamily: CINZEL, fontWeight: 700, fontSize: 11, color: COLORS.text, whiteSpace: "nowrap" }}>
            {label} <b style={{ color: state === "locked" ? "#e8695b" : COLORS.gold }}>{sub}</b>
          </span>
        </Plate>
      </div>
    </button>
  );
}

function Basicas({ estado }: { estado: Estado }) {
  const on = estado === "minha";
  const y = 566;
  return (
    <div data-zone="basicas" data-testid="dock-zone-basicas">
      <Ficha x={72} y={y} name="renda" label="Renda" sub="+1" ring="#d9a028" face="#4a3418" state={on ? "ready" : "off"} />
      <Ficha x={170} y={y} name="ajuda_externa" label="Ajuda" sub="+2" ring="#d9a028" face="#4a3418" state={on ? "ready" : "off"} />
      <Ficha x={268} y={y} name="golpe" label="Golpe" sub="−7" ring="#b3392b" face="#3a1a16" state={on ? "locked" : "off"} />
    </div>
  );
}

// ── Zona 3: reações (selos grandes, perto da jogada) ────────────────────────
type SealMode = "lit" | "off" | "ghost";
const SEAL_W = 176;
const SEAL_H = 68;
const SEAL_GAP = 16;

function Reacao({
  kind,
  mode,
  blank = false,
}: {
  kind: "contestar" | "bloquear" | "passar";
  mode: SealMode;
  blank?: boolean; // silhueta vazia (esperando): só o lugar, sem texto
}) {
  const cfg = {
    contestar: { label: "Contestar", key: "C", face: "#b3392b", light: "#d4574a", shade: "#8a2a20", outline: "#3a0a08" },
    bloquear: { label: "Bloquear", key: "B", face: "#6f7f95", light: "#93a3b8", shade: "#55647a", outline: "#1e2733" },
    passar: { label: "Passar", key: "Espaço", face: "#6b6460", light: "#8a827c", shade: "#4d4743", outline: "#1d1a18" },
  }[kind];
  const opacity = mode === "lit" ? 1 : mode === "off" ? 0.5 : blank ? 0.14 : 0.22;
  const filter = mode === "lit" ? undefined : "grayscale(0.85) brightness(0.7)";
  return (
    <button
      type="button"
      className="dock-btn"
      disabled={mode !== "lit"}
      data-testid={`reacao-${kind}`}
      data-state={mode}
      aria-label={`${cfg.label} (${cfg.key})`}
      style={{ position: "relative", width: SEAL_W, height: SEAL_H, opacity, filter }}
    >
      <div style={{ position: "absolute", left: 0, top: 5, width: SEAL_W, height: SEAL_H, background: "rgba(0,0,0,0.45)", clipPath: notch(4) }} />
      <Plate w={SEAL_W} h={SEAL_H} outline={cfg.outline} face={cfg.face} light={cfg.light} shade={cfg.shade} padding="0 14px 0 14px" style={{ position: "absolute", left: 0, top: 0 }}>
        {!blank && (
          <>
            <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", flex: "none" }}>
              {kind === "contestar" ? <Sprite rows={EXCLAMA_ROWS} palette={EXCLAMA_PAL} px={3} /> : <PxImg src={icon(kind === "bloquear" ? "bloquear" : "passar")} w={48} h={48} />}
            </div>
            <span style={{ flex: 1, textAlign: "left", fontFamily: CINZEL, fontWeight: 800, fontSize: 18, color: "#fff6e0", textShadow: "0 2px 0 rgba(0,0,0,0.55)" }}>{cfg.label}</span>
          </>
        )}
      </Plate>
      {mode === "lit" && <Key style={{ left: 12, top: -9 }}>{cfg.key}</Key>}
    </button>
  );
}

function Reacoes({ estado }: { estado: Estado }) {
  const lit = estado === "reacao";
  const mode: SealMode = lit ? "lit" : "ghost";
  return (
    <div
      data-zone="reacoes"
      data-testid="dock-zone-reacoes"
      style={{ position: "absolute", left: 640 - (SEAL_W * 3 + SEAL_GAP * 2) / 2, top: 388, display: "flex", gap: SEAL_GAP }}
    >
      <Reacao kind="contestar" mode={mode} blank={estado === "espera"} />
      <Reacao kind="bloquear" mode={mode} blank={estado === "espera"} />
      <Reacao kind="passar" mode={mode} blank={estado === "espera"} />
      {estado === "espera" && (
        <div className="dock-bob" style={{ position: "absolute", left: 280 - 24, top: 10 }} data-testid="reacoes-espera">
          <Sprite rows={AMPULHETA_ROWS} palette={AMPULHETA_PAL} px={4} label="esperando os outros" />
        </div>
      )}
    </div>
  );
}

// ── Zona 2: poderes pela carta (a mão) ──────────────────────────────────────
const HAND: Array<{ id: "duque" | "assassino"; power: string }> = [
  { id: "duque", power: "taxas" },
  { id: "assassino", power: "assassinar" },
];

const PLAQUE: Record<Variant, { outline: string; face: string; text: string; light: string; shade: string }> = {
  cavalete: { outline: "#3a2608", face: "#c9a24a", text: "#2a1a08", light: "#e6c46a", shade: "#9b7a2c" },
  mesa: { outline: "#1a0f08", face: "#3f2410", text: "#f0e2c0", light: "#3f2410", shade: "#3f2410" },
  bandeja: { outline: "#1a0c08", face: "#7a4a2a", text: "#f4e6c8", light: "#8f5c38", shade: "#5e3720" },
};

function Mao({ variant, estado }: { variant: Variant; estado: Estado }) {
  const mine = estado === "minha";
  const rot = variant === "mesa" ? [-4, 4] : [0, 0];
  return (
    <div data-zone="poderes" data-testid="dock-zone-poderes">
      {HAND.map(({ id, power }, i) => {
        const lift = mine ? 14 : 0;
        const name = CARD_BY_ID[id].nome;
        return (
          <button
            key={id}
            type="button"
            className="dock-btn"
            data-testid={`mao-${id}`}
            data-glow={mine ? "1" : "0"}
            aria-label={`${name}${mine ? `, poder: ${CARD_BY_ID[id].dica}` : ""}`}
            style={{
              position: "absolute",
              left: HAND_LEFT[i],
              top: HAND_TOP - lift,
              width: CARD_W,
              height: CARD_H,
              transform: `rotate(${rot[i]}deg)`,
              transformOrigin: "50% 100%",
              background: CARD_BY_ID[id].cor,
              boxShadow: mine ? "0 0 0 3px #140c08, 0 0 0 6px #ffd866" : "0 0 0 3px #140c08",
            }}
          >
            <PxImg src={`${ART}/${id}/neutro.png`} w={CARD_W} h={CARD_H} />
            <div aria-hidden style={{ position: "absolute", inset: 0, border: `2px solid ${COLORS.gold}`, pointerEvents: "none" }} />
            {mine && (
              <div style={{ position: "absolute", right: -16, top: -16 }}>
                <Disc d={48} outline="#2a1a05" ring="#d9a028" face="#2b1f1c">
                  <PxImg src={icon(power)} w={32} h={32} />
                </Disc>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Plaquetas com o nome das cartas; desenhadas por último para ficarem sobre o cavalete. */
function Plaquetas({ variant }: { variant: Variant }) {
  const plaqueTop = variant === "cavalete" ? 664 : variant === "mesa" ? 686 : 679;
  const pq = PLAQUE[variant];
  return (
    <div data-testid="dock-plaquetas">
      {HAND.map(({ id }, i) => (
        <Plate
          key={id}
          w={CARD_W}
          h={26}
          outline={pq.outline}
          face={pq.face}
          light={pq.light}
          shade={pq.shade}
          padding="0 4px"
          style={{ position: "absolute", left: HAND_LEFT[i], top: plaqueTop }}
        >
          <span style={{ flex: 1, textAlign: "center", fontFamily: CINZEL, fontWeight: 700, fontSize: 12, color: pq.text, whiteSpace: "nowrap" }}>{CARD_BY_ID[id].nome}</span>
        </Plate>
      ))}
    </div>
  );
}

// ── Cascas das três variações ───────────────────────────────────────────────
function ShellBack({ variant }: { variant: Variant }) {
  if (variant === "cavalete") {
    return (
      <>
        <div aria-hidden style={{ position: "absolute", left: 412, top: 668, width: 456, height: 40, background: "rgba(0,0,0,0.38)", clipPath: notch(6) }} />
        <Slab l={424} t={596} w={432} h={64} tile={WOOD_DARK} size="192px 96px" edge="#24130a" light="#8c5a2e" shade="#2e190b" />
      </>
    );
  }
  if (variant === "mesa") {
    return <div aria-hidden style={{ position: "absolute", left: 500, top: 652, width: 280, height: 40, background: "rgba(0,0,0,0.36)", clipPath: ellipseClip(280, 40, 4) }} />;
  }
  return (
    <>
      <div aria-hidden style={{ position: "absolute", left: 384, top: 502, width: 512, height: 218, background: "rgba(0,0,0,0.4)", clipPath: notch(10) }} />
      <Slab l={386} t={494} w={508} h={224} tile={LEATHER} size="80px 80px" edge="#1a0c08" light="#7d4a34" shade="#33160f" n={10}>
        <div aria-hidden style={{ position: "absolute", inset: 8, border: "2px dashed #e0c58a", opacity: 0.8 }} />
        <Studs w={508} h={224} inset={14} />
      </Slab>
      <Slab l={412} t={516} w={456} h={188} tile={LEATHER_INNER} size="80px 80px" edge="#120a0a" light="#3a2422" shade="#150d0e" n={8} />
    </>
  );
}

function ShellFront({ variant }: { variant: Variant }) {
  if (variant !== "cavalete") return null;
  return (
    <Slab l={406} t={650} w={468} h={62} tile={WOOD} size="192px 96px" edge="#24130a" light="#b57a40" shade="#3f2210">
      <Studs w={468} h={62} inset={12} />
    </Slab>
  );
}

// ── Eu: retrato, moedas e "passar automático" ───────────────────────────────
function Eu({ estado }: { estado: Estado }) {
  const mine = estado === "minha";
  const auto = estado === "espera";
  return (
    <div data-testid="dock-eu">
      <Seat cx={1090} y={522} name="Você" avatar="estudante" coins={5} active={mine} backs={false} />
      <button
        type="button"
        role="switch"
        aria-checked={auto}
        className="dock-btn"
        data-testid="dock-autopass"
        data-on={auto ? "1" : "0"}
        title="Passa sozinho nas jogadas que não são contra você"
        style={{ position: "absolute", left: 990, top: 668, height: 44, minWidth: 190, display: "flex", alignItems: "center", gap: 10 }}
      >
        <Sprite rows={switchRows(auto)} palette={SWITCH_PAL} px={3} />
        <span style={{ fontFamily: SANS, fontSize: 12, color: "#e8dcc0", textShadow: "0 1px 0 #000", whiteSpace: "nowrap" }}>Passar automático</span>
      </button>
    </div>
  );
}

// ── Cena completa ───────────────────────────────────────────────────────────
function Scene({ variant, estado }: { variant: Variant; estado: Estado }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0e0c1a" }} data-testid={`dock-${variant}`} data-estado={estado}>
      {/* salão desfocado atrás da mesa (a arte tem só 168x96) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -16,
          background: `linear-gradient(rgba(14,12,26,0.42), rgba(14,12,26,0.66)), url(${ART}/mesa.png) center / cover no-repeat`,
          filter: "blur(3px) saturate(1.15)",
        }}
      />
      <Table />

      <Seat cx={400} y={22} name="Bia" avatar="dama_corte" coins={7} active={estado === "reacao"} />
      <Seat cx={900} y={22} name="Caio" avatar="capitao_porto" coins={3} active={estado === "espera"} waiting={estado === "espera"} />

      <Deck x={estado === "reacao" ? 420 : 500} y={196} />
      <Coins x={estado === "reacao" ? 770 : 690} y={196} />
      <Tag x={estado === "reacao" ? 415 : 495} y={338} w={110}>
        Corte · 11
      </Tag>
      <Tag x={estado === "reacao" ? 772 : 692} y={338} w={110}>
        Erário · 28
      </Tag>
      {estado === "reacao" && <Jogada />}

      <Reacoes estado={estado} />

      <ShellBack variant={variant} />
      <Mao variant={variant} estado={estado} />
      <ShellFront variant={variant} />
      <Plaquetas variant={variant} />
      <Basicas estado={estado} />
      <Eu estado={estado} />
    </div>
  );
}

/** Palco: div de tamanho exato (1280x720 ou 1920x1080); o desenho lógico é 1280x720. */
export default function DockMock({ variant, estado, res }: { variant: Variant; estado: Estado; res: 1280 | 1920 }) {
  const k = res / 1280;
  return (
    <>
      <style>{CSS}</style>
      <div
        data-testid="stage"
        data-res={res}
        style={{ position: "relative", width: res, height: (res * 9) / 16, overflow: "hidden", background: "#0e0c1a", boxShadow: "0 0 0 2px #46506b" }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 720, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <Scene variant={variant} estado={estado} />
        </div>
      </div>
    </>
  );
}
