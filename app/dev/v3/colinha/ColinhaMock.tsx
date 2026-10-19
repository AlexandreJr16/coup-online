// Mockup estático da colinha como UMA peça (carta de referência que sobe). Palco lógico de
// 1280x720 (em 1920, o mesmo desenho em 1,5x). Personagens, ações, custos, quem bloqueia e o
// que é contestável vêm de buildCheatSheet() (cheatsheet.ts, intocado). Só as 5 regras curtas
// são texto novo deste mockup (ver "Decisões necessárias").
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { buildCheatSheet, type ActionInfo, type CharacterInfo } from "@/src/components/game/cheatsheet";
import { CARD_BY_ID } from "@/src/lib/game/cards";
import { CINZEL, COLORS } from "@/src/components/game/helpers";
import {
  COROA,
  Disc,
  FELT,
  LEATHER_INNER,
  PxImg,
  Rects,
  WOOD,
  ellipseClip,
  notch,
  r,
  EXCLAMA_PAL,
  EXCLAMA_ROWS,
  Sprite,
  type R,
} from "./pixel";

const ART = "/art/imperio";
const SANS = "var(--font-geist-sans), Arial, sans-serif";
const SHEET = buildCheatSheet();
const icon = (n: string) => `${ART}/icones/${n}.sm.png`;

// ── ✓ e ✗ em pixel ──────────────────────────────────────────────────────────
const TICK: readonly R[] = [r(0, 4, 2, 2, "#fff6dc", true), r(2, 6, 2, 2, "#fff6dc", true), r(4, 4, 2, 2, "#fff6dc", true), r(6, 2, 2, 2, "#fff6dc", true), r(8, 0, 2, 2, "#fff6dc", true)];
const CRUZ: readonly R[] = [
  r(0, 0, 2, 2, "#f2d9d4", true), r(2, 2, 2, 2, "#f2d9d4", true), r(4, 4, 2, 2, "#f2d9d4", true), r(6, 6, 2, 2, "#f2d9d4", true),
  r(6, 0, 2, 2, "#f2d9d4", true), r(4, 2, 2, 2, "#f2d9d4", true), r(2, 4, 2, 2, "#f2d9d4", true), r(0, 6, 2, 2, "#f2d9d4", true),
];

function Mark({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={`${label}: ${ok ? "sim" : "não"}`}
      data-mark={ok ? "sim" : "nao"}
      style={{ position: "relative", display: "block", width: 24, height: 24, flex: "none" }}
    >
      <span style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(4) }} />
      <span style={{ position: "absolute", inset: 3, background: ok ? "#2f8f5a" : "#9b2d24", clipPath: notch(2) }} />
      <span style={{ position: "absolute", left: ok ? 4 : 6, top: ok ? 6 : 6 }}>
        {ok ? <Rects list={TICK} w={10} h={8} px={2} /> : <Rects list={CRUZ} w={8} h={8} px={2} />}
      </span>
    </span>
  );
}

// ── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes col-up { from { transform: translateY(90px) scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
.col-up { animation: col-up 0.55s steps(9, end) both; }
.col-btn { cursor: pointer; background: none; border: 0; padding: 0; font: inherit; color: inherit; }
.col-btn:focus-visible { outline: 3px solid #ffd866; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .col-up { animation: none; } }
`;

// ── Peças ───────────────────────────────────────────────────────────────────
function Slab({ l, t, w, h, tile, size, edge, light, shade, n = 8, children }: { l: number; t: number; w: number; h: number; tile: string; size: string; edge: string; light: string; shade: string; n?: number; children?: ReactNode }) {
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

function Fundo() {
  const layers = [
    { l: -110, t: -70, w: 1500, h: 900, bg: WOOD, size: "192px 96px" },
    { l: -72, t: -32, w: 1424, h: 780, bg: "#24130a" },
    { l: -68, t: -28, w: 1416, h: 772, bg: "#d9a028" },
    { l: -64, t: -24, w: 1408, h: 764, bg: FELT, size: "96px 96px" },
  ];
  return (
    <>
      <div aria-hidden style={{ position: "absolute", inset: -16, background: `linear-gradient(rgba(14,12,26,0.42), rgba(14,12,26,0.66)), url(${ART}/mesa.png) center / cover no-repeat`, filter: "blur(3px) saturate(1.15)" }} />
      {layers.map((e, i) => (
        <div key={i} aria-hidden style={{ position: "absolute", left: e.l, top: e.t, width: e.w, height: e.h, background: e.bg, backgroundSize: e.size, imageRendering: "pixelated", clipPath: ellipseClip(e.w, e.h, 6) }} />
      ))}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(10,8,16,0.62)" }} />
    </>
  );
}

/** Quem bloqueia: retratos mini + escopo (qualquer / só o alvo). */
function Bloqueadores({ info }: { info: ActionInfo }) {
  const quem = info.bloqueadaPor[0]?.quem;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {info.bloqueadaPor.map((b) => (
        <PxImg key={b.characterId} src={`${ART}/${b.characterId}/neutro.sm.png`} w={20} h={28} alt={b.nome} style={{ boxShadow: "0 0 0 2px #140c08" }} />
      ))}
      <span style={{ fontFamily: SANS, fontSize: 10.5, color: COLORS.dim, whiteSpace: "nowrap" }}>{quem === "qualquer" ? "qualquer" : "só o alvo"}</span>
    </span>
  );
}

function Flags({ info, inline = false }: { info: ActionInfo; inline?: boolean }) {
  const bloqueavel = info.bloqueadaPor.length > 0;
  const lab: CSSProperties = { fontFamily: SANS, fontSize: 11.5, color: "#e8dcc0" };
  return (
    <div style={{ display: "flex", flexDirection: inline ? "row" : "column", gap: inline ? 14 : 6, alignItems: inline ? "center" : "flex-start" }}>
      <span data-flag="contestar" style={{ display: "flex", alignItems: "center", gap: 6, height: 24 }}>
        <Mark ok={info.contestavel} label="Contestar" />
        <span style={lab}>Contestar</span>
      </span>
      <span data-flag="bloquear" style={{ display: "flex", alignItems: "center", gap: 6, height: bloqueavel && !inline ? 28 : 24 }}>
        <Mark ok={bloqueavel} label="Bloquear" />
        <span style={lab}>Bloquear</span>
        {bloqueavel && <Bloqueadores info={info} />}
      </span>
    </div>
  );
}

function Coluna({ c }: { c: CharacterInfo }) {
  const b = c.bloqueia[0];
  return (
    <div data-testid={`col-${c.id}`} style={{ position: "relative", width: 214, height: 400, flex: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(6) }} />
      <div style={{ position: "absolute", inset: 3, background: "#33261d", clipPath: notch(6) }} />
      <div style={{ position: "absolute", left: 9, right: 9, top: 3, height: 3, background: "#d9a028" }} />

      {/* retrato maior em moldura de bronze + selo do poder */}
      <div style={{ position: "absolute", left: 38, top: 12, width: 138, height: 192 }}>
        <div style={{ position: "absolute", inset: 0, background: "#140c08" }} />
        <div style={{ position: "absolute", inset: 3, background: "#b8793a" }} />
        <div style={{ position: "absolute", inset: 6, background: CARD_BY_ID[c.id].cor }} />
        <PxImg src={`${ART}/${c.id}/neutro.png`} w={132} h={186} style={{ position: "absolute", left: 3, top: 3 }} alt={c.nome} />
        <div style={{ position: "absolute", right: -22, bottom: -12 }}>
          <Disc d={48} outline="#2a1a05" ring="#d9a028" face="#2b1f1c">
            <PxImg src={icon(c.acao ? c.acao.action : "bloquear")} w={32} h={32} />
          </Disc>
        </div>
      </div>

      <div style={{ position: "absolute", left: 10, right: 10, top: 212, textAlign: "center", fontFamily: CINZEL, fontWeight: 800, fontSize: 16, color: COLORS.turn, whiteSpace: "nowrap" }}>{c.nome}</div>

      {/* uma linha de ação */}
      <div style={{ position: "absolute", left: 12, right: 12, top: 238, height: 60, overflow: "hidden" }}>
        {c.acao ? (
          <>
            <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 14, color: COLORS.text, height: 18 }}>{c.acao.label}</div>
            <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: "14px", color: "#d8cdb8" }}>{c.acao.efeito}</div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 14, color: COLORS.dim, height: 18 }}>Sem ação de turno</div>
            <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: "14px", color: "#b3a88f" }}>Só defende: protege contra o Assassinato.</div>
          </>
        )}
      </div>

      <div style={{ position: "absolute", left: 12, top: 300, height: 58 }}>{c.acao ? <Flags info={c.acao} /> : null}</div>

      {/* o que este personagem bloqueia */}
      <div style={{ position: "absolute", left: 12, right: 12, top: 360, height: 34, display: "flex", alignItems: "center", gap: 8, opacity: b ? 1 : 0.5 }} data-flag="bloqueia">
        <PxImg src={icon("bloquear")} w={32} h={32} />
        <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: "14px", color: "#e8dcc0" }}>
          {b ? (
            <>
              <b>Bloqueia {b.label}</b>
              <br />
              <span style={{ color: COLORS.dim }}>{b.quem === "qualquer" ? "qualquer jogador" : "só o alvo"}</span>
            </>
          ) : (
            "Não bloqueia nada"
          )}
        </div>
      </div>
    </div>
  );
}

function AcaoGeral({ a, top }: { a: ActionInfo; top: number }) {
  return (
    <div data-testid={`geral-${a.action}`} style={{ position: "absolute", left: 0, top, width: 490, height: 48, display: "flex", alignItems: "center", gap: 10 }}>
      <Disc d={48} outline="#2a1a05" ring={a.action === "golpe" ? "#b3392b" : "#d9a028"} face="#2b1f1c">
        <PxImg src={icon(a.action)} w={32} h={32} />
      </Disc>
      <div style={{ width: 215, flex: "none" }}>
        <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 14, color: COLORS.text }}>{a.label}</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: "13px", color: "#d8cdb8" }}>{a.efeito}</div>
      </div>
      <Flags info={a} inline />
    </div>
  );
}

// Regras curtas (~60 palavras). Texto NOVO do mockup: fiel ao game-rules.md, mas ainda não
// existe em cheatsheet.ts (lá só há RULES_SUMMARY, mais longo).
const REGRAS: Array<{ id: string; icone: ReactNode; texto: string }> = [
  { id: "objetivo", icone: <PxImg src={`${ART}/verso.sm.png`} w={20} h={29} />, texto: "Seja o último com influência (carta virada para baixo)." },
  { id: "blefe", icone: <PxImg src={icon("mascara")} w={32} h={32} />, texto: "Ação ou bloqueio de personagem pode ser blefe: só mostra a carta quem for contestado." },
  { id: "contestar", icone: <Sprite rows={EXCLAMA_ROWS} palette={EXCLAMA_PAL} px={2} />, texto: "Mentiu e foi pego, ou contestou e errou: perde 1 influência." },
  { id: "golpe", icone: <PxImg src={icon("golpe")} w={32} h={32} />, texto: "Com 10 ou mais moedas, só o Golpe de Estado." },
  { id: "passar", icone: <PxImg src={icon("passar")} w={32} h={32} />, texto: "Passar é definitivo naquela jogada. Tempo esgotado: o jogo escolhe o mais seguro." },
];

function Regras() {
  return (
    <div data-testid="colinha-regras" style={{ position: "absolute", left: 0, top: 0, width: 600 }}>
      <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: COLORS.dim, textTransform: "uppercase", height: 20 }}>Regras rápidas</div>
      {REGRAS.map((g, i) => (
        <div key={g.id} data-regra={g.id} style={{ position: "absolute", left: 0, top: 20 + i * 30, width: 600, height: 30, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, display: "grid", placeItems: "center", flex: "none" }}>{g.icone}</div>
          <span style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: "15px", color: "#e8dcc0" }}>{g.texto}</span>
        </div>
      ))}
    </div>
  );
}

function Peca() {
  return (
    <div className="col-up" data-testid="colinha-peca" style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 720 }}>
      <Slab l={50} t={20} w={1180} h={680} tile={WOOD} size="192px 96px" edge="#24130a" light="#b57a40" shade="#3f2210" n={10} />
      <Slab l={62} t={32} w={1156} h={656} tile={LEATHER_INNER} size="80px 80px" edge="#120a0a" light="#3a2422" shade="#150d0e" n={8}>
        <div aria-hidden style={{ position: "absolute", inset: 8, border: "2px solid rgba(217,160,40,0.45)" }} />
      </Slab>

      {/* cabeçalho */}
      <div style={{ position: "absolute", left: 80, top: 48, width: 700, height: 40, display: "flex", alignItems: "center", gap: 12 }}>
        <Rects list={COROA} w={18} h={10} px={2} />
        <h2 style={{ margin: 0, fontFamily: CINZEL, fontWeight: 900, fontSize: 26, color: COLORS.turn, textShadow: "0 2px 0 #000" }}>Colinha</h2>
        <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.dim }}>o jogo continua rodando enquanto você lê</span>
      </div>
      <button type="button" className="col-btn" data-testid="colinha-fechar" aria-label="Fechar a colinha (Esc)" style={{ position: "absolute", left: 1146, top: 44, width: 44, height: 44 }}>
        <span style={{ position: "absolute", inset: 0, background: "#140c08", clipPath: notch(4) }} />
        <span style={{ position: "absolute", inset: 3, background: "#46506b", clipPath: notch(4) }} />
        <span style={{ position: "absolute", left: 14, top: 14 }}>
          <Rects list={CRUZ.map((s) => ({ ...s, c: "#fff6dc" }))} w={8} h={8} px={2} />
        </span>
        <kbd style={{ position: "absolute", left: -34, top: 14, padding: "0 5px", height: 16, font: `700 10px/14px ${SANS}`, color: "#1a1a2e", background: "#e8dcc0", border: "2px solid #14101a", boxShadow: "0 2px 0 #14101a" }}>Esc</kbd>
      </button>

      {/* 5 personagens */}
      <div data-testid="colinha-personagens" style={{ position: "absolute", left: 80, top: 96, display: "flex", gap: 10 }}>
        {SHEET.characters.map((c) => (
          <Coluna key={c.id} c={c} />
        ))}
      </div>

      {/* rodapé: ações livres (esquerda) e regras (direita) */}
      <div data-testid="colinha-gerais" style={{ position: "absolute", left: 80, top: 502 }}>
        <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: COLORS.dim, textTransform: "uppercase", height: 20 }}>Sem personagem</div>
        <div style={{ position: "relative", width: 490, height: 160 }}>
          {SHEET.generalActions.map((a, i) => (
            <AcaoGeral key={a.action} a={a} top={i * 50} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 600, top: 502, width: 600, height: 176 }}>
        <Regras />
      </div>
    </div>
  );
}

export default function ColinhaMock({ res }: { res: 1280 | 1920 }) {
  const [aberta, setAberta] = useState(0);
  const k = res / 1280;
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-testid="reabrir"
        onClick={() => setAberta((n) => n + 1)}
        style={{ margin: "0 0 10px", padding: "6px 12px", fontSize: 13, color: "#1a1a2e", background: COLORS.gold, border: `2px solid ${COLORS.gold}`, cursor: "pointer" }}
      >
        Reabrir (repete a animação)
      </button>
      <div
        data-testid="stage"
        data-res={res}
        style={{ position: "relative", width: res, height: (res * 9) / 16, overflow: "hidden", background: "#0e0c1a", boxShadow: "0 0 0 2px #46506b" }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 720, transform: `scale(${k})`, transformOrigin: "0 0", overflow: "hidden" }}>
          <Fundo />
          <Peca key={aberta} />
        </div>
      </div>
    </>
  );
}
