// Feed de Intrigas: registro em "pergaminho" das últimas jogadas/contestações,
// derivado do stream de game_state (ver useGameEvents). Ajuda a dedução — memória
// de quem alegou o quê, o núcleo do Coup. Painel recolhível numa faixa à direita
// da mesa (o GameBoard desloca o palco para os assentos não ficarem cobertos).
"use client";

import type { CSSProperties } from "react";

import { IconButton } from "../ui/IconButton";
import { PixelPanel } from "../ui/PixelPanel";
import { U } from "./escalaMesa";
import { type IconName, iconUrl } from "./helpers";
import type { GameLogEntry } from "./useGameEvents";

const ICON: Record<GameLogEntry["kind"], IconName> = {
  action: "mascara",
  block: "bloquear",
  challenge: "contestar",
  reveal: "olho",
  eliminate: "errado",
  winner: "trofeu",
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
      <IconButton
        data-feed
        icone="olho"
        rotulo="Mostrar intrigas"
        onClick={() => onOpenChange(true)}
        style={collapsedBtn}
      />
    );
  }

  return (
    <PixelPanel data-feed titulo="Intrigas" style={panel}>
      <button onClick={() => onOpenChange(false)} title="Recolher" aria-label="Recolher" style={closeBtn}>
        ×
      </button>
      <div style={body}>
        {entries.length === 0 ? (
          <span style={{ opacity: 0.7, fontSize: U(12) }}>Sem intrigas ainda…</span>
        ) : (
          entries.map((e) => (
            <div key={e.id} style={entry}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconUrl(ICON[e.kind]) ?? undefined} alt="" aria-hidden style={{ width: U(16), height: U(16), flex: "none", imageRendering: "pixelated" }} />
              <span>{e.text}</span>
            </div>
          ))
        )}
      </div>
    </PixelPanel>
  );
}

const panel: CSSProperties = {
  position: "absolute",
  top: U(10),
  right: U(10),
  zIndex: 20,
  width: U(216),
  maxHeight: "78%",
};
const body: CSSProperties = {
  maxHeight: "60vh",
  overflowY: "auto",
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
};
const closeBtn: CSSProperties = {
  position: "absolute",
  top: U(2),
  right: U(6),
  border: "none",
  background: "transparent",
  color: "inherit",
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
};
