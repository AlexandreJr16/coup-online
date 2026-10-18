// Mockup estático da tela de fim de partida (sem socket, dados fictícios). Palco lógico de
// 1280x720; em 1920 o mesmo desenho é escalado em 1,5x. Os prêmios vêm de computeAwards
// (src/lib/game/awards.ts) com estatísticas inventadas, para o texto ser o do jogo.
import type { CSSProperties, ReactNode } from "react";

import { CINZEL, COLORS } from "@/src/components/game/helpers";
import { computeAwards, type Award } from "@/src/lib/game/awards";
import type { PlayerStats } from "@/src/types/game";
import {
  AMPULHETA_PAL,
  AMPULHETA_ROWS,
  COROA,
  FELT,
  ICONE_CARRASCO,
  ICONE_DESCONFIADO,
  ICONE_LINCE,
  ICONE_MENTIROSO,
  ICONE_OLHO,
  ICONE_RICACO,
  LEATHER_INNER,
  MOEDA_PAL,
  MOEDA_ROWS,
  TROFEU,
  WOOD,
  Plate,
  PxImg,
  Rects,
  Sprite,
  ellipseClip,
  notch,
  type R,
} from "./pixel";

export type Papel = "jogador" | "espectador";
export type Fx = "moedas" | "confete" | "ambos" | "nenhum";

const ART = "/art/imperio";
const SANS = "var(--font-geist-sans), Arial, sans-serif";

// ── Dados fictícios ─────────────────────────────────────────────────────────
const JOGADORES = [
  { id: "p1", nome: "Ana", avatar: "dama_corte", vitorias: 3 },
  { id: "p2", nome: "Bia", avatar: "doceira", vitorias: 2 },
  { id: "p3", nome: "Caio", avatar: "capitao_porto", vitorias: 1 },
  { id: "p4", nome: "Davi", avatar: "ator", vitorias: 0 },
] as const;
const VENCEDOR = JOGADORES[0];
const PARTIDA = 4;

const stat = (s: Partial<PlayerStats>): PlayerStats => ({
  challengesMade: 0,
  challengesRight: 0,
  bluffsCaught: 0,
  blocks: 0,
  kills: 0,
  maxCoins: 3,
  influenceLost: 0,
  ...s,
});
const STATS: Record<string, PlayerStats> = {
  p1: stat({ challengesMade: 2, challengesRight: 2, maxCoins: 11, kills: 1 }),
  p2: stat({ challengesMade: 7, challengesRight: 3, maxCoins: 6 }),
  p3: stat({ kills: 4, bluffsCaught: 1, maxCoins: 8 }),
  p4: stat({ bluffsCaught: 3, challengesMade: 1, maxCoins: 5 }),
};
const AWARDS: Award[] = computeAwards(STATS, Object.fromEntries(JOGADORES.map((j) => [j.id, j.nome])));

const ICONE: Record<Award["id"], { list: readonly R[] }> = {
  carrasco: { list: ICONE_CARRASCO },
  ricaco: { list: ICONE_RICACO },
  mentiroso: { list: ICONE_MENTIROSO },
  desconfiado: { list: ICONE_DESCONFIADO },
  olho_de_lince: { list: ICONE_LINCE },
};

// ── CSS (animações só com transform/opacity; sem movimento sob prefers-reduced-motion) ──
const CSS = `
@keyframes vit-fall {
  from { transform: translate3d(0, -80px, 0) rotate(0deg); }
  to { transform: translate3d(var(--dx), 820px, 0) rotate(var(--rot)); }
}
@keyframes vit-flip { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.2); } }
@keyframes vit-crown { from { transform: translateY(-46px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes vit-pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
.vit-p { position: absolute; top: 0; animation: vit-fall var(--dur) linear var(--delay) infinite; }
.vit-flip { animation: vit-flip 0.6s steps(3, end) infinite; }
.vit-crown { animation: vit-crown 0.7s steps(6, end) both; }
.vit-pulse { animation: vit-pulse 1.6s steps(4, end) infinite; }
.vit-btn { cursor: pointer; background: none; border: 0; padding: 0; font: inherit; color: inherit; }
.vit-btn:disabled { cursor: default; }
.vit-btn:focus-visible { outline: 3px solid #ffd866; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .vit-p { display: none; }
  .vit-flip, .vit-crown, .vit-pulse { animation: none; }
}
`;

// ── Peças ───────────────────────────────────────────────────────────────────
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
  n = 8,
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
  children?: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", left: l, top: t, width: w, height: h }}>
      <div style={{ position: "absolute", inset: 0, background: edge, clipPath: notch(n) }} />
      <div style={{ position: "absolute", inset: 4, background: tile, backgroundSize: size, imageRendering: "pixelated", clipPath: notch(n - 2) }} />
      <div style={{ position: "absolute", left: n + 2, right: n + 2, top: 4, height: 4, background: light }} />
      <div style={{ position: "absolute", left: n + 2, right: n + 2, bottom: 4, height: 6, background: shade }} />
      {children}
    </div>
  );
}

function Mesa() {
  const layers = [
    { l: -110, t: -70, w: 1500, h: 900, bg: WOOD, size: "192px 96px" },
    { l: -72, t: -32, w: 1424, h: 780, bg: "#24130a" },
    { l: -68, t: -28, w: 1416, h: 772, bg: "#d9a028" },
    { l: -64, t: -24, w: 1408, h: 764, bg: FELT, size: "96px 96px" },
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
            background: e.bg,
            backgroundSize: e.size,
            imageRendering: "pixelated",
            clipPath: ellipseClip(e.w, e.h, 6),
          }}
        />
      ))}
    </>
  );
}

function Kbd({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <kbd
      style={{
        position: "absolute",
        padding: "0 7px",
        minWidth: 20,
        height: 20,
        textAlign: "center",
        font: `700 11px/16px ${SANS}`,
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

const COLS = ["#f0b429", "#c0392b", "#4fb3c8", "#f4ead2", "#2f8f5a", "#9a6fd4"];
const N_PARTICULAS = 28; // teto

/** Chuva de moedas e/ou confete: posição, atraso e velocidade determinísticos por índice. */
function Chuva({ fx }: { fx: Fx }) {
  if (fx === "nenhum") return null;
  return (
    <div aria-hidden data-testid="vitoria-fx" data-fx={fx} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
      {Array.from({ length: N_PARTICULAS }).map((_, i) => {
        const moeda = fx === "moedas" ? true : fx === "confete" ? false : i % 2 === 0;
        const left = (i * 37 + i * i * 11) % 96;
        const style = {
          left: `${2 + left}%`,
          ["--dx" as string]: `${(((i * 13) % 9) - 4) * 18}px`,
          ["--rot" as string]: moeda ? "0deg" : `${(i * 53) % 360}deg`,
          ["--dur" as string]: `${2.6 + (i % 5) * 0.4}s`,
          ["--delay" as string]: `${-(i % 7) * 0.5}s`,
        } as CSSProperties;
        return (
          <div key={i} className="vit-p" style={style}>
            {moeda ? (
              <div className="vit-flip" style={{ animationDelay: `${-(i % 3) * 0.2}s` }}>
                <Sprite rows={MOEDA_ROWS} palette={MOEDA_PAL} px={3} />
              </div>
            ) : (
              <div style={{ width: 8 + (i % 3) * 2, height: 8 + ((i + 1) % 3) * 2, background: COLS[i % COLS.length] }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Titulo({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        fontFamily: CINZEL,
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 2,
        color: COLORS.dim,
        textTransform: "uppercase",
        borderBottom: "2px solid #4a3418",
        paddingBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Retrato() {
  const W = 216;
  const Ht = 300;
  const x = 150;
  const y = 134;
  return (
    <div data-testid="vitoria-retrato" style={{ position: "absolute", left: x, top: y, width: W, height: Ht }}>
      <div className="vit-pulse" aria-hidden style={{ position: "absolute", left: -8, top: -8, width: W + 16, height: Ht + 16, background: COLORS.turn, clipPath: notch(8) }} />
      <div style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(6) }} />
      <div style={{ position: "absolute", inset: 3, background: "#d9a028", clipPath: notch(6) }} />
      <div style={{ position: "absolute", inset: 9, background: "#140c08" }} />
      <PxImg src={`${ART}/avatares/${VENCEDOR.avatar}.png`} w={192} h={276} style={{ position: "absolute", left: 12, top: 12 }} alt={VENCEDOR.nome} />
      <div className="vit-crown" style={{ position: "absolute", left: W / 2 - 45, top: -44 }} data-testid="vitoria-coroa">
        <Rects list={COROA} w={18} h={10} px={5} label="coroa" />
      </div>
      <div style={{ position: "absolute", left: 178, top: 200 }} data-testid="vitoria-trofeu">
        <Rects list={TROFEU} w={24} h={26} px={4} label="troféu" />
      </div>
    </div>
  );
}

function Premios() {
  return (
    <>
      <Titulo x={450} y={72} w={350}>
        Prêmios da partida
      </Titulo>
      <div data-testid="vitoria-premios" style={{ position: "absolute", left: 450, top: 116 }}>
        {AWARDS.map((a, i) => (
          <div key={a.id} data-award={a.id} style={{ position: "absolute", left: 0, top: i * 84, width: 350, height: 76 }}>
            <div style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(4) }} />
            <div style={{ position: "absolute", inset: 3, background: "#2b1f1c", clipPath: notch(4) }} />
            <div style={{ position: "absolute", left: 10, top: 8, width: 60, height: 60 }}>
              <div style={{ position: "absolute", inset: 0, background: "#d9a028", clipPath: notch(4) }} />
              <div style={{ position: "absolute", inset: 3, background: "#140c08", clipPath: notch(4) }} />
              <div style={{ position: "absolute", left: 6, top: 6 }}>
                <Rects list={ICONE[a.id].list} w={16} h={16} px={3} label={a.titulo} />
              </div>
            </div>
            <div style={{ position: "absolute", left: 84, top: 10, right: 12 }}>
              <div style={{ fontFamily: CINZEL, fontWeight: 800, fontSize: 18, color: COLORS.turn }}>{a.titulo}</div>
              <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 13, color: "#e8dcc0", lineHeight: 1.35 }}>
                <b>{a.names.join(" e ")}</b>
                <br />
                <span style={{ color: COLORS.dim }}>{a.detalhe}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Placar() {
  return (
    <>
      <Titulo x={850} y={72} w={290}>
        Placar da noite
      </Titulo>
      <div data-testid="vitoria-placar" style={{ position: "absolute", left: 850, top: 116 }}>
        {JOGADORES.map((j, i) => {
          const venceu = j.id === VENCEDOR.id;
          return (
            <div key={j.id} data-player={j.id} style={{ position: "absolute", left: 0, top: i * 80, width: 290, height: 72 }}>
              <div style={{ position: "absolute", inset: 0, background: venceu ? "#d9a028" : "#140c08", clipPath: notch(4) }} />
              <div style={{ position: "absolute", inset: 3, background: venceu ? "#3a2c12" : "#2b1f1c", clipPath: notch(4) }} />
              <PxImg src={`${ART}/avatares/${j.avatar}.png`} w={32} h={46} style={{ position: "absolute", left: 12, top: 13 }} />
              <div style={{ position: "absolute", left: 56, top: 10, fontFamily: CINZEL, fontWeight: 700, fontSize: 16, color: COLORS.text }}>{j.nome}</div>
              <div style={{ position: "absolute", left: 56, top: 36, display: "flex", gap: 4, height: 26, alignItems: "center" }}>
                {j.vitorias === 0 ? (
                  <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.dim }}>sem vitórias</span>
                ) : (
                  Array.from({ length: j.vitorias }).map((_, k) => (
                    <div key={k} style={{ opacity: venceu && k === j.vitorias - 1 ? 1 : 0.9 }}>
                      <Rects list={TROFEU} w={24} h={26} px={1} />
                    </div>
                  ))
                )}
              </div>
              <b style={{ position: "absolute", right: 14, top: 14, fontFamily: CINZEL, fontSize: 26, color: COLORS.gold, textShadow: "0 2px 0 #000" }}>{j.vitorias}</b>
              {venceu && (
                <span style={{ position: "absolute", right: 14, top: 48, fontFamily: SANS, fontWeight: 700, fontSize: 11, color: "#1a1a2e", background: COLORS.turn, padding: "0 6px" }}>+1 hoje</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 850, top: 446, width: 290, fontFamily: SANS, fontSize: 12, color: COLORS.dim, lineHeight: 1.4 }}>
        {PARTIDA} partidas nesta sala. O placar zera quando a sala fecha.
      </div>
    </>
  );
}

function Espectadores() {
  return (
    <div data-testid="vitoria-espectadores" style={{ position: "absolute", left: 850, top: 492, width: 290, display: "flex", gap: 10, alignItems: "center" }}>
      <Rects list={ICONE_OLHO} w={12} h={8} px={3} label="espectadores" />
      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "#e8dcc0", lineHeight: 1.35 }}>
        2 pessoas assistindo. Elas entram na próxima partida se alguém pedir a revanche.
      </span>
    </div>
  );
}

function Revanche({ papel }: { papel: Papel }) {
  if (papel === "espectador") {
    return (
      <div data-testid="victory-wait" style={{ position: "absolute", left: 300, top: 556, display: "flex" }}>
        <Plate w={680} h={84} outline="#1d1a18" face="#4d4743" light="#6b6460" shade="#38322e" padding="0 22px">
          <Sprite rows={AMPULHETA_ROWS} palette={AMPULHETA_PAL} px={4} />
          <span style={{ fontFamily: SANS, fontSize: 15, color: "#f0f0f0", lineHeight: 1.4 }}>
            Você está assistindo: se um jogador pedir a revanche, você entra na próxima partida.
          </span>
        </Plate>
      </div>
    );
  }
  return (
    <button type="button" className="vit-btn" data-testid="revanche" aria-label="Jogar de novo (Enter)" style={{ position: "absolute", left: 410, top: 556, width: 460, height: 84 }}>
      <div style={{ position: "absolute", left: 0, top: 6, width: 460, height: 84, background: "rgba(0,0,0,0.45)", clipPath: notch(4) }} />
      <Plate w={460} h={84} outline="#3a2608" face="#d9a028" light="#f0c85a" shade="#a67810" padding="0 26px" style={{ position: "absolute", left: 0, top: 0 }}>
        <PxImg src={`${ART}/icones/trocar.png`} w={64} h={64} />
        <span style={{ flex: 1, textAlign: "center", fontFamily: CINZEL, fontWeight: 900, fontSize: 30, color: "#2a1a05", textShadow: "0 2px 0 rgba(255,255,255,0.25)" }}>Jogar de novo</span>
      </Plate>
      <Kbd style={{ left: 18, top: -11 }}>Enter</Kbd>
    </button>
  );
}

function Scene({ papel, fx }: { papel: Papel; fx: Fx }) {
  return (
    <div data-testid="vitoria" data-papel={papel} style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0e0c1a" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -16,
          background: `linear-gradient(rgba(14,12,26,0.42), rgba(14,12,26,0.66)), url(${ART}/mesa.png) center / cover no-repeat`,
          filter: "blur(3px) saturate(1.15)",
        }}
      />
      <Mesa />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(10,8,16,0.66)" }} />

      <div data-testid="vitoria-painel">
        <Slab l={100} t={36} w={1080} h={648} tile={WOOD} size="192px 96px" edge="#24130a" light="#b57a40" shade="#3f2210" n={10} />
        <Slab l={124} t={60} w={1032} h={600} tile={LEATHER_INNER} size="80px 80px" edge="#120a0a" light="#3a2422" shade="#150d0e" n={8}>
          <div aria-hidden style={{ position: "absolute", inset: 10, border: "2px solid rgba(217,160,40,0.45)" }} />
        </Slab>

        <div style={{ position: "absolute", left: 150, top: 70, width: 216, textAlign: "center", fontFamily: SANS, fontSize: 12, letterSpacing: 2, color: COLORS.dim }}>
          PARTIDA {PARTIDA} · FIM DE JOGO
        </div>
        <Retrato />
        <div data-testid="vitoria-nome" style={{ position: "absolute", left: 120, top: 454, width: 300, textAlign: "center", fontFamily: CINZEL, fontWeight: 900, fontSize: 34, color: COLORS.turn, textShadow: "0 3px 0 #000" }}>
          {VENCEDOR.nome} vence!
        </div>

        <Premios />
        <Placar />
        <Espectadores />
        <Revanche papel={papel} />
      </div>

      <Chuva fx={fx} />
    </div>
  );
}

export default function VitoriaMock({ papel, fx, res }: { papel: Papel; fx: Fx; res: 1280 | 1920 }) {
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
          <Scene papel={papel} fx={fx} />
        </div>
      </div>
    </>
  );
}
