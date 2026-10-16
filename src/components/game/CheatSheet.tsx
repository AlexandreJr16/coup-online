// Colinha das cartas e do jogo: botão "?" + painel com os personagens, ações e regras.
// O conteúdo vem de buildCheatSheet() (cheatsheet.ts), derivado do catálogo de cartas.
//
// NÃO pausa nada: os timers são do servidor e o jogo segue rodando enquanto a pessoa lê.
// Teclado: `?` abre/fecha; `Esc` fecha. O Esc é tratado em CAPTURA e interrompe a
// propagação, para não cancelar por baixo a mira de uma ação (GameBoard escuta Esc na
// bolha da window). Atalhos do jogo (Espaço/C/B) continuam funcionando, exceto Espaço/Enter
// em botão DENTRO do painel: aí é "ativar o botão", não "passar a reação".
"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Card from "./Card";
import {
  buildCheatSheet,
  type ActionInfo,
  type BlockScope,
  type CharacterInfo,
} from "./cheatsheet";
import { ACTION_META, type ActionCategory, categoryColor, CINZEL, COLORS } from "./helpers";

const SHEET = buildCheatSheet();

// Cores de categoria que são escuras demais para TEXTO sobre o painel escuro.
const LEGIVEL: Partial<Record<ActionCategory, string>> = { coup: COLORS.text, neutral: "#aab4d6" };

const quemTxt = (q: BlockScope) => (q === "qualquer" ? "qualquer jogador" : "só o alvo");

function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

export function CheatSheetButton() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Teclado global (captura): `?` abre/fecha, Esc fecha, Tab fica preso no painel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) {
        if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        e.stopPropagation(); // não deixa o Esc cancelar a mira do GameBoard por baixo
        setOpen(false);
      } else if (e.key === "Tab") {
        e.preventDefault(); // o único elemento focável do painel é o botão de fechar
        closeRef.current?.focus();
      } else if (
        (e.key === " " || e.key === "Enter") &&
        e.target instanceof HTMLElement &&
        dialogRef.current?.contains(e.target) &&
        e.target.closest("button")
      ) {
        e.stopPropagation(); // ativar o botão do painel não pode virar "Passar" na mesa
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Foco: ao abrir vai para o painel; ao fechar volta para o botão "?" (só se o foco
  // se perdeu junto com o painel; nunca na montagem da página).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpen.current && btnRef.current && document.activeElement === document.body) {
      btnRef.current.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="corner-btn"
        data-testid="cheatsheet-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Colinha das cartas e regras"
        title="Colinha das cartas e regras (?)"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            data-testid="cheatsheet-backdrop"
            style={backdrop}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="cheatsheet"
              className="panel-salon"
              style={dialog}
            >
              <div style={head}>
                <h2 id={titleId} style={title}>
                  Colinha
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  className="corner-btn"
                  data-testid="cheatsheet-close"
                  aria-label="Fechar a colinha"
                  onClick={() => setOpen(false)}
                  style={{ width: 32, height: 32, fontSize: 15 }}
                >
                  ✕
                </button>
              </div>
              <CheatSheetBody />
              <p style={foot}>Esc ou ? para fechar · o jogo continua rodando enquanto você lê.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Corpo da colinha (usado também pela página de revisão /dev/colinha). */
export function CheatSheetBody() {
  return (
    <div data-testid="cheatsheet-body">
      <h3 style={h3}>Personagens</h3>
      <div style={grid}>
        {SHEET.characters.map((c) => (
          <CharacterTile key={c.id} c={c} />
        ))}
      </div>

      <h3 style={h3}>Ações sempre disponíveis</h3>
      <ul style={list}>
        {SHEET.generalActions.map((a) => (
          <li key={a.action} style={row} data-action={a.action}>
            <ActionLine a={a} />
          </li>
        ))}
      </ul>

      <h3 style={h3}>Regras rápidas</h3>
      <ul style={{ ...list, gap: 6 }}>
        {SHEET.rules.map((r) => (
          <li key={r} style={{ ...row, color: COLORS.text }}>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CharacterTile({ c }: { c: CharacterInfo }) {
  return (
    <div style={tile} data-character={c.id}>
      <Card character={c.id} size="sm" />
      <div style={{ minWidth: 0 }}>
        <div style={charName}>{c.nome}</div>
        {c.acao ? (
          <div style={line}>
            <ActionLine a={c.acao} />
          </div>
        ) : (
          <div style={{ ...line, color: COLORS.dim }}>Sem ação própria.</div>
        )}
        {c.bloqueia.map((b) => (
          <div key={b.action} style={chip}>
            Bloqueia {b.label} <span style={{ color: COLORS.dim }}>({quemTxt(b.quem)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionLine({ a }: { a: ActionInfo }) {
  const cor = categoryColor(ACTION_META[a.action].category);
  return (
    <>
      <b style={{ color: LEGIVEL[ACTION_META[a.action].category] ?? cor }}>{a.label}</b>
      {a.custo != null && <span style={{ color: COLORS.dim }}> ({a.custo} moedas)</span>}
      <span>: {a.efeito}</span>
      <div style={tags}>
        <span style={tag}>{a.contestavel ? "Pode ser contestada" : "Não pode ser contestada"}</span>
        <span style={tag}>
          {a.bloqueadaPor.length === 0
            ? "Não pode ser bloqueada"
            : `Bloqueada por ${a.bloqueadaPor.map((b) => b.nome).join(" ou ")} (${quemTxt(a.bloqueadaPor[0].quem)})`}
        </span>
      </div>
    </>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200, // acima do feed (20) e do toast (7); o filtro CRT (9999) fica por cima
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(8,6,16,0.72)",
};
const dialog: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 780,
  maxHeight: "calc(100dvh - 32px)",
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(240,165,0,0.55) transparent",
  padding: "18px 22px 14px",
  color: COLORS.text,
  fontSize: 13.5,
  lineHeight: 1.45,
};
const head: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const title: CSSProperties = { margin: 0, fontFamily: CINZEL, fontSize: 24, fontWeight: 900, color: COLORS.gold };
const h3: CSSProperties = {
  margin: "16px 0 8px",
  fontFamily: CINZEL,
  fontSize: 14,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: COLORS.dim,
};
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 };
const tile: CSSProperties = {
  display: "flex",
  gap: 10,
  padding: 10,
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(240,165,0,0.22)",
};
const charName: CSSProperties = { fontFamily: CINZEL, fontWeight: 800, fontSize: 15, color: COLORS.turn };
const line: CSSProperties = { marginTop: 2 };
const chip: CSSProperties = { marginTop: 4, fontSize: 12.5, color: COLORS.text };
const tags: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 };
const tag: CSSProperties = {
  padding: "1px 8px",
  fontSize: 11.5,
  color: COLORS.dim,
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 999,
};
const list: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 };
const row: CSSProperties = { padding: "0 2px" };
const foot: CSSProperties = { margin: "14px 0 0", fontSize: 12, color: COLORS.dim, textAlign: "center" };
