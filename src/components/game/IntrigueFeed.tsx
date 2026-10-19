// Feed de Intrigas: registro em "pergaminho" das últimas jogadas/contestações,
// derivado do stream de game_state (ver useGameEvents). Ajuda a dedução — memória
// de quem alegou o quê, o núcleo do Coup. Painel recolhível numa faixa à direita
// da mesa (o GameBoard desloca o palco para os assentos não ficarem cobertos).
"use client";

import type { CSSProperties } from "react";

import { U } from "./escalaMesa";
import { CINZEL } from "./helpers";
import type { GameLogEntry } from "./useGameEvents";

const ICON: Record<GameLogEntry["kind"], string> = {
  action: "⚔️",
  block: "🛡️",
  challenge: "❗",
  reveal: "🗡️",
  eliminate: "☠️",
  winner: "🏆",
};

export default function IntrigueFeed({
  log,
  open,
  onOpenChange,
}: {
  log: GameLogEntry[];
  open: boolean; // o GameBoard reserva uma faixa para o painel quando aberto
  onOpenChange: (open: boolean) => void;
}) {
  const entries = [...log].slice(-14).reverse(); // mais recentes no topo

  if (!open) {
    return (
      <button
        data-feed
        onClick={() => onOpenChange(true)}
        title="Mostrar intrigas"
        style={collapsedBtn}
      >
        📜
      </button>
    );
  }

  return (
    <div data-feed style={panel}>
      <div style={header}>
        <span style={{ fontFamily: CINZEL, fontWeight: 700, letterSpacing: 0.5 }}>
          📜 Intrigas
        </span>
        <button onClick={() => onOpenChange(false)} title="Recolher" style={closeBtn}>
          ×
        </button>
      </div>
      <div style={body}>
        {entries.length === 0 ? (
          <span style={{ color: "#7a6a4d", fontSize: U(12), fontStyle: "italic" }}>
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
  top: U(10),
  right: U(10),
  zIndex: 20,
  width: U(216),
  maxHeight: "78%",
  display: "flex",
  flexDirection: "column",
  background: parchment,
  color: "#3a2c18",
  border: "1px solid #b8923f",
  borderRadius: U(10),
  boxShadow: `0 ${U(10)} ${U(28)} rgba(0,0,0,0.45)`,
  overflow: "hidden",
};
const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${U(7)} ${U(10)}`,
  borderBottom: "1px solid rgba(110,80,30,0.35)",
  background: "rgba(110,80,30,0.12)",
  fontSize: U(14),
};
const body: CSSProperties = {
  overflowY: "auto",
  padding: `${U(6)} ${U(8)}`,
  display: "flex",
  flexDirection: "column",
  gap: U(4),
};
const entry: CSSProperties = {
  display: "flex",
  gap: U(6),
  fontSize: U(12.5),
  lineHeight: 1.25,
  paddingBottom: U(4),
  borderBottom: "1px dashed rgba(110,80,30,0.25)",
};
const closeBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#6e501e",
  fontSize: U(18),
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};
const collapsedBtn: CSSProperties = {
  position: "absolute",
  top: U(10),
  right: U(10),
  zIndex: 20,
  width: U(38),
  height: U(38),
  borderRadius: U(10),
  border: "1px solid #b8923f",
  background: parchment,
  cursor: "pointer",
  fontSize: U(18),
  boxShadow: `0 ${U(6)} ${U(16)} rgba(0,0,0,0.4)`,
};
