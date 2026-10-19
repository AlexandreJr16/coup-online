// Feed de Intrigas: as últimas jogadas e contestações, derivadas do stream de game_state (ver
// useGameEvents). Ajuda a dedução — memória de quem alegou o quê, o núcleo do Coup. Porte do
// mockup aprovado (P03.S2): lista compacta no canto de cima à direita do palco, com ícone pixel
// por tipo; mostra só as últimas linhas para nunca descer sobre o assento da direita.
"use client";

import { IconButton } from "../ui/IconButton";
import { F, U } from "./escalaMesa";
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

/** Linhas visíveis: o painel termina antes do assento lateral (y = 222 no palco). */
export const LINHAS_FEED = 6;

export default function IntrigueFeed({
  log,
  open,
  onOpenChange,
}: {
  log: GameLogEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const entries = [...log].slice(-LINHAS_FEED).reverse(); // mais recentes no topo

  if (!open) {
    return (
      <IconButton
        data-feed
        icone="olho"
        rotulo="Mostrar intrigas"
        onClick={() => onOpenChange(true)}
        style={{ position: "absolute", top: U(6), right: U(12), zIndex: 10 }}
      />
    );
  }

  return (
    <aside data-feed className="m3-historico" aria-label="Histórico de intrigas">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="m3-historico-titulo">Intrigas</span>
        <button
          onClick={() => onOpenChange(false)}
          title="Recolher"
          aria-label="Recolher"
          style={{ border: "none", background: "transparent", color: "#9aa0a6", cursor: "pointer", padding: 0, fontSize: F(14), lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="m3-historico-linha">Sem intrigas ainda…</div>
      ) : (
        entries.map((e, i) => (
          <div key={e.id} className="m3-historico-linha" data-atual={i === 0 ? "sim" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconUrl(ICON[e.kind]) ?? undefined} alt="" aria-hidden style={{ width: U(16), height: U(16), flex: "none", imageRendering: "pixelated" }} />
            <span>{e.text}</span>
          </div>
        ))
      )}
    </aside>
  );
}
