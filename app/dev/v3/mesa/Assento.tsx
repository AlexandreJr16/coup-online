// Assento da mesa nova: retrato (anel, selos, moldura) + placa de nome + cartas + pilha de fichas.
// Informação onde o olho já está (princípio 8): quem age ganha o balão da jogada em cima do
// retrato; quem a mesa espera ganha pontinho pulsante; quem passou ganha ✔.
/* eslint-disable @next/next/no-img-element -- pixel art: next/image reamostra e borra os pixels */
import type { ActionType, Character } from "@/src/types/game";
import { ACTION_META, artUrl, backUrl, iconUrl } from "@/src/components/game/helpers";
import { PAL_RABICHO, PAL_SETA, SPRITE_RABICHO, SPRITE_SETA, PAL } from "./bitmaps";
import type { JogadorCena } from "./cena";
import { estiloVars, U } from "./escala";
import { Fichas, type ModoZero } from "./Fichas";
import Pix from "./Pix";
import Retrato, { ameacaPorMoedas, type Relogio } from "./Retrato";

export const ASSENTO_W = 176;
export const ASSENTO_H = 124;
/** Distância do centro do retrato à borda esquerda do assento (82/2 + 0). */
export const RETRATO_CX = 41;

function CartaMini({ perdida }: { perdida?: Character }) {
  const src = perdida ? (artUrl(perdida, "neutro", "sm") ?? backUrl("sm")) : backUrl("sm");
  return (
    <div
      data-testid={perdida ? "carta-perdida" : "carta-viva"}
      style={{ position: "relative", width: U(40), height: U(56), boxShadow: `0 0 0 ${U(2)} #14101a` }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          filter: perdida ? "grayscale(0.7) brightness(0.55)" : undefined,
        }}
      />
      {perdida && (
        <svg
          viewBox="0 0 40 56"
          shapeRendering="crispEdges"
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <g fill="none">
            <polyline points="40,0 31,10 33,19 24,26 26,36" stroke="#14101a" strokeWidth={2} />
            <polyline points="40,0 31,10 33,19 24,26 26,36" stroke="#e8d9b0" strokeWidth={1} transform="translate(1,0)" opacity={0.7} />
          </g>
        </svg>
      )}
    </div>
  );
}

export function Cartas({ influencias, perdidas }: { influencias: 0 | 1 | 2; perdidas: Character[] }) {
  const vivas = Array.from({ length: influencias }, (_, i) => <CartaMini key={`v${i}`} />);
  const mortas = perdidas.map((c, i) => <CartaMini key={`p${i}`} perdida={c} />);
  return (
    <div style={{ display: "flex", gap: U(6) }} data-testid="cartas">
      {mortas}
      {vivas}
    </div>
  );
}

/** Placa de nome em caixa pixel; o pontinho pulsante marca quem a mesa ainda espera. */
export function Placa({ nome, eu, vez, aguardado, ausente }: { nome: string; eu?: boolean; vez?: boolean; aguardado?: boolean; ausente?: boolean }) {
  return (
    <div
      className="m3-caixa m3-placa"
      data-testid="placa-nome"
      style={{
        ...estiloVars({ "--m3-borda": vez ? PAL.ouro : "#14101a", "--m3-fundo": "#2d2019" }),
        marginTop: U(-8),
        width: U(82),
        opacity: ausente ? 0.5 : 1,
      }}
    >
      <div className="m3-caixa-in m3-placa-in" style={{ color: eu ? "#ffd866" : "#f0f0f0" }}>
        {aguardado && <span aria-label="a mesa espera por este jogador" role="img" className="m3-anima m3-ponto" data-testid="marca-espera" />}
        <span className="m3-placa-nome">{eu ? "Você" : nome}</span>
      </div>
    </div>
  );
}

export function Balao({ acao, alvo }: { acao: ActionType; alvo?: JogadorCena }) {
  const icone = iconUrl(acao, "sm");
  return (
    <div
      data-testid="balao-jogada"
      data-acao={acao}
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
      }}
    >
      <div className="m3-caixa" style={estiloVars({ "--m3-borda": "#14101a", "--m3-fundo": PAL.pergaminho })}>
        <div className="m3-caixa-in m3-balao-in">
          {icone && <img src={icone} alt="" draggable={false} style={{ width: U(32), height: U(32), display: "block" }} />}
          <span className="m3-balao-texto">{ACTION_META[acao].label}</span>
          {alvo && (
            <>
              <Pix rows={SPRITE_SETA} paleta={PAL_SETA} />
              <img
                src={`/art/imperio/avatares/${alvo.avatar}.png`}
                alt={`Alvo: ${alvo.nome}`}
                draggable={false}
                style={{ width: U(23), height: U(32), objectFit: "cover", boxShadow: `0 0 0 ${U(2)} #14101a`, display: "block" }}
              />
            </>
          )}
        </div>
      </div>
      <Pix rows={SPRITE_RABICHO} paleta={PAL_RABICHO} style={{ marginTop: U(-2), position: "relative", zIndex: 1 }} />
    </div>
  );
}

export interface AssentoProps {
  jogador: JogadorCena;
  posicao?: { cx: number; y: number }; // centro x e topo y, em unidades base (1280x720)
  vez?: boolean;
  balao?: { acao: ActionType; alvo?: JogadorCena };
  relogio?: Relogio;
  passou?: boolean;
  aguardado?: boolean;
  zero?: ModoZero;
}

export default function Assento({ jogador, posicao, vez, balao, relogio, passou, aguardado, zero }: AssentoProps) {
  const { id, nome, avatar, moedas, influencias, perdidas, ausente, eu } = jogador;
  return (
    <div
      className="m3-assento"
      data-testid={`assento-${id}`}
      data-vez={vez ? "sim" : undefined}
      style={{
        width: U(ASSENTO_W),
        height: U(ASSENTO_H),
        ...(posicao
          ? { position: "absolute", left: U(posicao.cx - ASSENTO_W / 2), top: U(posicao.y) }
          : { position: "relative" }),
      }}
    >
      {balao && <Balao {...balao} />}
      <div style={{ display: "flex", gap: U(6), alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: U(82) }}>
          <Retrato
            avatar={avatar}
            nome={nome}
            influencias={influencias}
            ausente={ausente}
            relogio={relogio}
            ameaca={ameacaPorMoedas(moedas)}
            passou={passou}
            medalhao={vez}
          />
          <Placa nome={nome} eu={eu} vez={vez} aguardado={aguardado} ausente={ausente} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: U(4), opacity: ausente ? 0.55 : 1 }}>
          <Cartas influencias={influencias} perdidas={perdidas} />
          <Fichas idJogador={id} quantidade={moedas} zero={zero} />
        </div>
      </div>
    </div>
  );
}
