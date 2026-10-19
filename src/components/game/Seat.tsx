// Um lugar na mesa (porte do mockup aprovado, P03.S2): retrato com moldura (racha com 1 influência
// perdida e estilhaça no exílio), placa do nome, cartas e pilha de fichas à direita, balão da
// jogada em cima. Caixa de 176x124 unidades; quem posiciona é a Table (coordenadas do palco).
// Tudo aqui é público: moedas, cartas reveladas e quem a mesa espera.
"use client";

import type { CSSProperties } from "react";

import type { PublicPlayer } from "@/src/types/game";
import Card from "./Card";
import { ChipPile } from "./ChipPile";
import { CoinDelta, useCountUp } from "./CoinFx";
import { U } from "./escalaMesa";
import { iconUrl } from "./helpers";
import { PAL, PAL_RABICHO, PAL_SETA, SPRITE_RABICHO, SPRITE_SETA } from "./mesa/bitmaps";
import Pix from "./mesa/Pix";
import Retrato, { ameacaPorMoedas } from "./mesa/Retrato";
import type { Balao } from "./status";

export const ASSENTO_W = 176;
export const ASSENTO_H = 124;
/** Centro do retrato medido da borda esquerda do assento. */
export const RETRATO_CX = 41;

const vars = (v: Record<string, string>) => v as CSSProperties;

function BalaoJogada({ balao, alvo }: { balao: Balao; alvo?: { nome: string; avatar?: string } }) {
  const icone = iconUrl(balao.icone, "sm");
  return (
    <div
      data-testid="claim-plate"
      data-seat-balloon
      style={{
        position: "absolute",
        left: U(RETRATO_CX),
        bottom: `calc(100% + ${U(2)})`,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 5,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      <div className="m3-caixa" style={vars({ "--m3-borda": "#14101a", "--m3-fundo": PAL.pergaminho })}>
        <div className="m3-caixa-in m3-balao-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {icone && <img src={icone} alt="" draggable={false} style={{ width: U(28), height: U(28), display: "block" }} />}
          <span className="m3-balao-texto">{balao.texto}</span>
          {alvo && (
            <>
              <Pix rows={SPRITE_SETA} paleta={PAL_SETA} />
              {alvo.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/art/imperio/avatares/${alvo.avatar}.png`}
                  alt={`Alvo: ${alvo.nome}`}
                  draggable={false}
                  style={{ width: U(20), height: U(28), objectFit: "cover", boxShadow: `0 0 0 ${U(2)} #14101a`, display: "block" }}
                />
              ) : (
                <span className="m3-balao-texto">{alvo.nome}</span>
              )}
            </>
          )}
        </div>
      </div>
      <Pix rows={SPRITE_RABICHO} paleta={PAL_RABICHO} style={{ marginTop: U(-2), position: "relative", zIndex: 1 }} />
    </div>
  );
}

export default function Seat({
  player,
  isCurrent,
  isMe,
  selectable,
  onSelect,
  dim = false,
  urgent = false,
  passed = false,
  balloon,
  balloonTarget,
  custoFantasma = 0,
  style,
  coinDelta = 0,
  deltaKey = 0,
  avatar,
}: {
  player: PublicPlayer;
  isCurrent: boolean;
  isMe: boolean;
  selectable: boolean; // alvo possível da ação escolhida (mira pulsando)
  onSelect?: () => void;
  dim?: boolean; // escurece quem não está na vez
  urgent?: boolean; // a mesa espera por este jogador (pontinho na placa)
  passed?: boolean; // já passou nesta janela de reação (✔)
  balloon?: Balao; // jogada em andamento deste jogador
  balloonTarget?: { nome: string; avatar?: string };
  custoFantasma?: number; // custo da ação em foco: fichas fantasma na pilha de quem olha (P07.S6)
  style?: CSSProperties;
  coinDelta?: number; // variação de moedas na última transição (Economia viva)
  deltaKey?: number; // re-dispara a animação do "+N/−N"
  avatar?: string; // slug do retrato pixel art
}) {
  const { name, coins, cards, eliminated } = player;
  const shownCoins = useCountUp(coins);
  const vivas = cards.filter((c) => !c.revealed).length;
  const influencias = (eliminated ? 0 : Math.min(2, vivas)) as 0 | 1 | 2;

  return (
    <div
      data-seat={name}
      data-seat-id={player.id}
      data-coins={coins}
      data-target={selectable ? "sim" : undefined}
      data-vez={isCurrent ? "sim" : undefined}
      onClick={selectable ? onSelect : undefined}
      style={{
        position: "absolute",
        width: U(ASSENTO_W),
        height: U(ASSENTO_H),
        cursor: selectable ? "pointer" : "default",
        opacity: dim && !eliminated ? 0.78 : 1,
        transition: "opacity 220ms ease",
        ...style,
      }}
    >
      {balloon && <BalaoJogada balao={balloon} alvo={balloonTarget} />}
      <div style={{ display: "flex", gap: U(6), alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: U(82) }}>
          <div
            data-avatar={avatar}
            className={selectable ? "target-pulse" : undefined}
            style={{ position: "relative", outline: selectable ? `${U(3)} solid #e03a2c` : undefined }}
          >
            {avatar ? (
              <Retrato
                avatar={avatar}
                nome={name}
                influencias={influencias}
                ameaca={eliminated ? "nenhuma" : ameacaPorMoedas(coins)}
                passou={passed && !eliminated}
                medalhao={isCurrent && !eliminated}
              />
            ) : (
              <div style={{ width: U(82), height: U(110) }} />
            )}
          </div>
          <div
            className="m3-caixa m3-placa"
            data-testid="placa-nome"
            style={{
              ...vars({ "--m3-borda": isCurrent ? PAL.ouro : "#14101a", "--m3-fundo": "#2d2019" }),
              marginTop: U(-8),
              width: U(82),
            }}
          >
            <div className="m3-caixa-in m3-placa-in" style={{ color: isMe ? "#ffd866" : "#f0f0f0" }}>
              {urgent && !eliminated && (
                <span aria-label="a mesa espera por este jogador" role="img" className="m3-anima m3-ponto" data-testid="marca-espera" />
              )}
              <span className="m3-placa-nome" title={name}>
                {isMe ? "Você" : name}
              </span>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: U(4) }}>
          {/* Cartas: versos (influências vivas) e as perdidas viradas, dessaturadas. */}
          <div style={{ display: "flex", gap: U(6) }}>
            {cards.map((c, i) => (
              <div key={i} data-card style={{ display: "flex" }}>
                <Card flip size="sm" character={c.revealed ? c.character : null} revealed={c.revealed} />
              </div>
            ))}
          </div>
          <ChipPile count={coins} shown={shownCoins} ownerId={player.id} custo={isMe ? custoFantasma : 0} tombada={eliminated} />
          <CoinDelta delta={coinDelta} deltaKey={deltaKey} />
        </div>
      </div>
    </div>
  );
}
