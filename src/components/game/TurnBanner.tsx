// Região de status da rodada para leitor de tela (visualmente oculta, P08.S2). O texto visível
// vive na mesa (legenda do centro, balão e marcas nos assentos). Renderizada por PORTAL no
// cabeçalho da sala (<RoundStatusSlot />); o texto vem de deriveRoundStatus (função pura, testada).
"use client";

import { type CSSProperties, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { GameView } from "@/src/types/game";
import { deriveRoundStatus, timeoutWarning } from "./status";

export const ROUND_STATUS_SLOT_ID = "round-status-slot";

/** Lugar onde a faixa aparece: ocupa o miolo do cabeçalho (entre o título e os botões). */
export function RoundStatusSlot() {
  return <div id={ROUND_STATUS_SLOT_ID} data-testid="round-status-slot" style={slot} />;
}

// O slot vive no DOM do cabeçalho (fora do React deste componente): lido como "store
// externo". No servidor e na hidratação é null; logo após montar, vira o elemento.
const subscribe = () => () => {};
const getSlot = () => document.getElementById(ROUND_STATUS_SLOT_ID);
const getServerSlot = () => null;

export default function TurnBanner({
  view,
  myId,
  secondsLeft,
}: {
  view: GameView;
  myId: string;
  secondsLeft: number; // relógio do cliente ancorado no servidor (GameBoard)
}) {
  const host = useSyncExternalStore(subscribe, getSlot, getServerSlot);
  if (!host) return null;

  const s = deriveRoundStatus(view, myId);
  const warning = timeoutWarning(view, myId, secondsLeft);

  // P08.S2: o texto saiu da vista (a informação está na mesa); sobra a região para leitor de tela.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-testid="round-status"
      data-phase={view.phase}
      data-turn-id={s.turnPlayerId ?? ""}
      data-mine={s.mine ? "sim" : undefined}
      data-warning={warning ? "sim" : undefined}
      style={oculto}
    >
      <div data-testid="round-status-headline">{s.headline}</div>
      <div data-testid="round-status-detail">{warning ?? s.detail}</div>
    </div>,
    host,
  );
}

const slot: CSSProperties = { flex: 1, minWidth: 0 };
// Visualmente oculto, mas lido por leitor de tela (e com innerText para os testes).
const oculto: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};
