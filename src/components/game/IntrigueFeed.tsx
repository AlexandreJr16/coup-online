// Feed de Intrigas: registro em "pergaminho" das últimas jogadas/contestações,
// derivado do stream de game_state (ver useGameEvents). Ajuda a dedução — memória
// de quem alegou o quê, o núcleo do Coup. Overlay recolhível à direita da mesa
// (não encolhe o tabuleiro).
"use client";

import { type CSSProperties, useState } from "react";

import type { GameLogEntry } from "./useGameEvents";

const CINZEL = "var(--font-cinzel), Georgia, serif";

const ICON: Record<GameLogEntry["kind"], string> = {
  action: "⚔️",
  block: "🛡️",
  reveal: "🗡️",
  eliminate: "☠️",
  winner: "🏆",
};

export default function IntrigueFeed({ log }: { log: GameLogEntry[] }) {
  const [open, setOpen] = useState(true);
  const entries = [...log].slice(-14).reverse(); // mais recentes no topo

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Mostrar intrigas"
        style={collapsedBtn}
      >
        📜
      </button>
    );
  }

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontFamily: CINZEL, fontWeight: 700, letterSpacing: 0.5 }}>
          📜 Intrigas
        </span>
        <button onClick={() => setOpen(false)} title="Recolher" style={closeBtn}>
          ×
        </button>
      </div>
      <div style={body}>
        {entries.length === 0 ? (
          <span style={{ color: "#7a6a4d", fontSize: 12, fontStyle: "italic" }}>
            Sem intrigas ainda…
          </span>
        ) : (
          entries.map((e) => (
            <div key={e.id} style={entry}>
              <span style={{ flex: "none" }}>{ICON[e.kind]}</span>
              <span>{e.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const parchment = "linear-gradient(160deg, #e9dcbf, #d8c59a)";

const panel: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 20,
  width: 216,
  maxHeight: "78%",
  display: "flex",
  flexDirection: "column",
  background: parchment,
  color: "#3a2c18",
  border: "1px solid #b8923f",
  borderRadius: 10,
  boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
  overflow: "hidden",
};
const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "7px 10px",
  borderBottom: "1px solid rgba(110,80,30,0.35)",
  background: "rgba(110,80,30,0.12)",
  fontSize: 14,
};
const body: CSSProperties = {
  overflowY: "auto",
  padding: "6px 8px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const entry: CSSProperties = {
  display: "flex",
  gap: 6,
  fontSize: 12.5,
  lineHeight: 1.25,
  paddingBottom: 4,
  borderBottom: "1px dashed rgba(110,80,30,0.25)",
};
const closeBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#6e501e",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};
const collapsedBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 20,
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #b8923f",
  background: parchment,
  cursor: "pointer",
  fontSize: 18,
  boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
};
