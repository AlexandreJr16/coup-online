// Mesa de salão vista de cima (porte do mockup aprovado, P03.S2): mesa em estádio e TUDO
// posicionado em coordenadas do palco (1280x536 unidades, ver escalaMesa.PALCO). Como o layout é o
// mesmo em qualquer tela (só o fator --mu muda), nenhuma peça cruza outra em resolução nenhuma.
// O jogador local fica sempre embaixo-centro (rotaciona a lista).
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

import type { PublicPlayer } from "@/src/types/game";
import { useCountUp } from "./CoinFx";
import { U } from "./escalaMesa";
import { baseSprite, bauSprite } from "./fichas";
import { assignAvatars, backUrl, deckLayers } from "./helpers";
import { PAL_AMPULHETA, SPRITE_AMPULHETA } from "./mesa/bitmaps";
import Pix from "./mesa/Pix";
import { centerOf, flyIn, reducedMotion } from "./motion";
import Seat, { ASSENTO_W } from "./Seat";
import type { Balao } from "./status";

type Vaga = { cx: number; y: number };
// Vagas do palco (centro x e topo y do assento, em unidades). B = você, embaixo.
const B: Vaga = { cx: 640, y: 410 };
const T: Vaga = { cx: 640, y: 60 };
const TL: Vaga = { cx: 380, y: 60 };
const TR: Vaga = { cx: 900, y: 60 };
const L: Vaga = { cx: 168, y: 222 };
const R: Vaga = { cx: 1112, y: 222 };
/** Vagas por número de jogadores, a partir de você e em sentido horário. */
export const VAGAS: Record<number, Vaga[]> = {
  2: [B, T],
  3: [B, TL, TR],
  4: [B, L, T, R],
  5: [B, L, TL, TR, R],
  6: [B, L, TL, T, TR, R],
};
export const vagas = (n: number): Vaga[] => VAGAS[Math.min(6, Math.max(2, n))];

const vars = (v: Record<string, string>) => v as CSSProperties;

function Erario({ quantidade, shown }: { quantidade: number; shown: number }) {
  const monte = baseSprite(quantidade);
  return (
    <div
      data-erario
      data-qtd={quantidade}
      style={{ position: "absolute", left: U(452), top: U(200), transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: U(4) }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: U(10), height: U(64) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {monte && <img src={monte} alt="" aria-hidden style={{ height: U(quantidade > 10 ? 64 : 52), imageRendering: "pixelated", display: "block" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bauSprite(quantidade)} alt="" aria-hidden style={{ height: U(52), imageRendering: "pixelated", display: "block" }} />
      </div>
      <span className="m3-numero">{shown}</span>
      <span className="m3-rotulo-mesa">Erário</span>
    </div>
  );
}

function Baralho({ cartas }: { cartas: number }) {
  const camadas = deckLayers(cartas);
  const passo = 3;
  return (
    <div
      data-deck
      data-cartas={cartas}
      style={{ position: "absolute", left: U(838), top: U(198), transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: U(4) }}
    >
      <div style={{ position: "relative", width: U(40 + 3 * passo), height: U(56 + 3 * passo) }}>
        {camadas === 0 && (
          <div style={{ position: "absolute", left: 0, bottom: 0, width: U(40), height: U(56), border: `${U(2)} dashed #6b6470` }} />
        )}
        {Array.from({ length: camadas }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={backUrl("sm")}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: U(i * passo),
              bottom: U(i * passo),
              width: U(40),
              height: U(56),
              boxShadow: `0 0 0 ${U(2)} #14101a`,
              filter: i < camadas - 1 ? "brightness(0.8)" : undefined,
            }}
          />
        ))}
      </div>
      <span className="m3-numero">{cartas}</span>
      <span className="m3-rotulo-mesa">Corte</span>
    </div>
  );
}

/** Legenda de uma linha (P08.S1): o que a mesa espera agora e o aviso dos últimos segundos. */
function Legenda({ text, warning }: { text: string; warning: boolean }) {
  return (
    <div
      data-testid="center-caption"
      data-warning={warning ? "sim" : undefined}
      style={{ position: "absolute", left: U(640), top: U(318), transform: "translateX(-50%)", width: "max-content", maxWidth: U(620), zIndex: 2, pointerEvents: "none" }}
    >
      <div className="m3-caixa" style={vars({ "--m3-borda": warning ? "#e03a2c" : "#14101a", "--m3-fundo": "#241a2c" })}>
        <div className="m3-caixa-in m3-legenda-in" style={{ color: warning ? "#ff8f80" : undefined }}>
          <Pix rows={SPRITE_AMPULHETA} paleta={PAL_AMPULHETA} />
          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textAlign: "center" }}>{text}</span>
        </div>
      </div>
    </div>
  );
}

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
  caption,
  balloon,
  custoFantasma = 0,
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
  caption?: { text: string; warning: boolean }; // legenda do centro (P08.S1)
  balloon?: Balao | null; // balão da jogada (P08.S3)
  custoFantasma?: number; // custo da ação em foco do jogador local (P07.S6)
}) {
  // Rotaciona para o local virar índice 0 (assento de baixo).
  const meIndex = Math.max(0, players.findIndex((p) => p.id === myId));
  const ordered = [...players.slice(meIndex), ...players.slice(0, meIndex)];
  const layout = vagas(ordered.length);
  // Retratos pela ordem ORIGINAL da lista (igual em todos os clientes), não pela rotação local.
  const avatarSlugs = assignAvatars(players.map((p) => p.id));
  const avatarByPlayer = new Map(players.map((p, i) => [p.id, avatarSlugs[i]]));
  const shownTreasury = useCountUp(treasury ?? 0);
  const alvo = balloon?.alvoId ? players.find((p) => p.id === balloon.alvoId) : undefined;

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
    <div ref={root} data-mesa style={{ position: "absolute", inset: 0 }}>
      <div aria-hidden className="m3-mesa" />

      {typeof treasury === "number" && <Erario quantidade={treasury} shown={shownTreasury} />}
      {typeof deckCount === "number" && <Baralho cartas={deckCount} />}
      {caption && <Legenda text={caption.text} warning={caption.warning} />}

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
          balloon={balloon?.actorId === p.id ? balloon : undefined}
          balloonTarget={balloon?.actorId === p.id && alvo ? { nome: alvo.name, avatar: avatarByPlayer.get(alvo.id) } : undefined}
          custoFantasma={p.id === myId ? custoFantasma : 0}
          avatar={avatarByPlayer.get(p.id)}
          style={{ left: U(layout[i].cx - ASSENTO_W / 2), top: U(layout[i].y) }}
        />
      ))}
    </div>
  );
}
