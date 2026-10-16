// Faixa de status da rodada: retrato de quem tem a vez + o que está acontecendo agora.
// Renderizada por PORTAL no centro do cabeçalho da sala (<RoundStatusSlot />): é a única
// faixa livre que não encolhe a mesa nem briga com os assentos de cima, o Erário, a carta
// da jogada ou o feed de Intrigas. O texto vem de deriveRoundStatus (função pura, testada).
"use client";

import { type CSSProperties, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { GameView } from "@/src/types/game";
import { assignAvatars, avatarUrl, CINZEL, COLORS } from "./helpers";
import { deriveRoundStatus } from "./status";

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

export default function TurnBanner({ view, myId }: { view: GameView; myId: string }) {
  const host = useSyncExternalStore(subscribe, getSlot, getServerSlot);
  if (!host) return null;

  const s = deriveRoundStatus(view, myId);
  const idx = view.players.findIndex((p) => p.id === s.turnPlayerId);
  const avatar = idx >= 0 ? assignAvatars(view.players.map((p) => p.id))[idx] : null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-testid="round-status"
      data-phase={view.phase}
      data-turn-id={s.turnPlayerId ?? ""}
      data-mine={s.mine ? "sim" : undefined}
      title={`${s.headline}. ${s.detail}`}
      style={{
        ...banner,
        borderColor: s.mine ? COLORS.turn : "rgba(240,165,0,0.35)",
        boxShadow: s.mine ? "0 0 0 1px rgba(255,216,102,0.35), 0 0 14px rgba(255,216,102,0.35)" : "none",
      }}
    >
      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(avatar)}
          alt=""
          draggable={false}
          data-testid="round-status-portrait"
          onError={(e) => (e.currentTarget.style.display = "none")}
          style={portrait}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div data-testid="round-status-headline" style={{ ...headline, color: s.mine ? COLORS.turn : COLORS.text }}>
          {s.headline}
        </div>
        <div data-testid="round-status-detail" style={detail}>
          {s.detail}
        </div>
      </div>
    </div>,
    host,
  );
}

const slot: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
};
const banner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  maxWidth: "100%",
  height: 38,
  padding: "0 16px 0 5px",
  borderRadius: 999,
  border: "1px solid",
  background: "rgba(20,17,34,0.65)",
  transition: "box-shadow 160ms ease, border-color 160ms ease",
};
const portrait: CSSProperties = {
  flex: "none",
  width: 24,
  height: 34,
  objectFit: "cover",
  borderRadius: 5,
  border: `1.5px solid ${COLORS.gold}`,
  imageRendering: "pixelated",
};
const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const headline: CSSProperties = {
  ...ellipsis,
  fontFamily: CINZEL,
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.15,
};
const detail: CSSProperties = { ...ellipsis, fontSize: 12, lineHeight: 1.2, color: COLORS.dim };
