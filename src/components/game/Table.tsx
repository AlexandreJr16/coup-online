// Mesa de salão vista de cima: elipse de veludo com aro de madeira e os jogadores em volta.
// O jogador local fica sempre embaixo-centro (rotaciona a lista). Marca o turno
// e acende os alvos selecionáveis quando uma ação targeted pede alvo.
"use client";

import { useEffect, useRef } from "react";

import type { PublicPlayer } from "@/src/types/game";
import { ChipPile } from "./ChipPile";
import { useCountUp } from "./CoinFx";
import { TREASURY_ID } from "./fichas";
import Card from "./Card";
import { U } from "./escalaMesa";
import { centerOf, flyIn, reducedMotion } from "./motion";
import { assignAvatars, CINZEL, COLORS, seatLayout, seatStyle } from "./helpers";
import Seat from "./Seat";

export default function Table({
  players,
  currentPlayerId,
  myId,
  treasury,
  deckCount,
  coinDeltas,
  deltaKey = 0,
  selectableTargetIds = [],
  onSelectTarget,
  dimOthers = false,
  dealIn = false,
  urgentIds = [],
  passedIds = [],
}: {
  players: PublicPlayer[];
  currentPlayerId: string | null;
  myId: string;
  treasury?: number; // Tesouro Central (Economia viva)
  deckCount?: number; // cartas no baralho da Corte
  coinDeltas?: Record<string, number>;
  deltaKey?: number;
  selectableTargetIds?: string[];
  onSelectTarget?: (id: string) => void;
  dimOthers?: boolean; // turno de alguém: escurece os demais assentos
  dealIn?: boolean; // partida nova: as cartas dos assentos voam do baralho ao montar
  urgentIds?: string[]; // jogadores que a mesa está esperando
  passedIds?: string[]; // quem já passou na janela de reação
}) {
  // Rotaciona para o local virar índice 0 (assento de baixo).
  const meIndex = Math.max(0, players.findIndex((p) => p.id === myId));
  const ordered = [...players.slice(meIndex), ...players.slice(0, meIndex)];
  const layout = seatLayout(ordered.length);
  // Retratos pela ordem ORIGINAL da lista (igual em todos os clientes), não pela rotação local.
  const avatarSlugs = assignAvatars(players.map((p) => p.id));
  const avatarByPlayer = new Map(players.map((p, i) => [p.id, avatarSlugs[i]]));
  const shownTreasury = useCountUp(treasury ?? 0);

  // Distribuição inicial: cada carta dos assentos voa do baralho até o seu lugar.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dealIn || reducedMotion()) return;
    const el = root.current;
    const deck = el?.querySelector("[data-deck]");
    if (!el || !deck) return;
    const from = centerOf(deck);
    el.querySelectorAll<HTMLElement>("[data-seat] [data-card]").forEach((c, i) => flyIn(c, from, { delay: i * 85 }));
    el.setAttribute("data-dealt", "1");
    // só na montagem: cada partida nova remonta o tabuleiro (key={matchNumber}).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={root}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: U(420),
        background: "transparent", // o fundo vem do TableBackdrop (cenário do tema)
        borderRadius: U(12),
        overflow: "hidden",
      }}
    >
      {/* Mesa de veludo: aro de madeira + filete dourado + veludo bordô com trama e vinheta */}
      <div aria-hidden className="table-rim" />
      <div aria-hidden className="table-velvet" />

        {/* Tesouro Central no centro do veludo (Economia viva) */}
        {typeof treasury === "number" && (
          <div
            data-erario
            style={{
              position: "absolute",
              left: "30%",
              top: "56%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              alignItems: "center",
              gap: U(8),
              padding: `${U(6)} ${U(14)}`,
              borderRadius: 999,
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${COLORS.gold}55`,
              boxShadow: `0 ${U(4)} ${U(14)} rgba(0,0,0,0.4)`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontFamily: CINZEL, fontWeight: 700, color: COLORS.text, fontSize: U(13) }}>
              Erário
            </span>
            <ChipPile count={treasury} shown={shownTreasury} ownerId={TREASURY_ID} bau height={30} />
          </div>
        )}

        {/* Baralho da Corte (origem das animações de distribuir/comprar) */}
        {typeof deckCount === "number" && (
          <div
            data-deck
            style={{ position: "absolute", left: "70%", top: "56%", transform: "translate(-50%, -50%)", textAlign: "center" }}
          >
            <div style={{ position: "relative", width: U(52), height: U(66) }}>
              {[2, 1, 0].map((i) => (
                <Card key={i} faceDown size="sm" style={{ position: "absolute", left: U(i * 3), top: U(-i * 2), width: U(40), height: U(56) }} />
              ))}
            </div>
            <div style={{ marginTop: U(4), fontSize: U(12), color: COLORS.dim, fontFamily: CINZEL }}>Corte · {deckCount}</div>
          </div>
        )}

        {ordered.map((p, i) => (
          <Seat
            key={p.id}
            player={p}
            isCurrent={p.id === currentPlayerId}
            isMe={p.id === myId}
            coinDelta={coinDeltas?.[p.id] ?? 0}
            deltaKey={deltaKey}
            selectable={selectableTargetIds.includes(p.id)}
            onSelect={onSelectTarget ? () => onSelectTarget(p.id) : undefined}
            dim={dimOthers && p.id !== currentPlayerId}
            urgent={urgentIds.includes(p.id)}
            passed={passedIds.includes(p.id)}
            avatar={avatarByPlayer.get(p.id)}
            style={seatStyle(layout[i])}
          />
        ))}
    </div>
  );
}
