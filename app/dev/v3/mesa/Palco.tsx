// O palco: um div de tamanho EXATO (1280x720 ou 1920x1080) com a mesa nova num único estado de
// jogo. Tudo é medido em `u` (ver escala.ts); as posições abaixo são em unidades base 1280x720.
/* eslint-disable @next/next/no-img-element -- pixel art: next/image reamostra e borra os pixels */
import { backUrl, iconUrl, TABLE_BG_URL } from "@/src/components/game/helpers";
import Assento, { RETRATO_CX } from "./Assento";
import { Baralho, Erario, Legenda } from "./Centro";
import type { Cena, JogadorCena } from "./cena";
import { estiloEscala, RESOLUCOES, U, type Resolucao } from "./escala";

const DOCK_TOPO = 576;

function Cabecalho({ sala }: { sala: string }) {
  return (
    <header className="m3-cabecalho" data-testid="cabecalho">
      <div className="m3-logo" aria-label="logo (placeholder)">
        COUP
      </div>
      <span className="m3-cabecalho-sala">Sala {sala}</span>
      <div style={{ flex: 1 }} />
      {["?", "S", "X"].map((t) => (
        <span key={t} className="m3-botao-hud" aria-hidden>
          {t}
        </span>
      ))}
    </header>
  );
}

function Historico({ cena }: { cena: Cena }) {
  return (
    <aside className="m3-historico" data-testid="historico-intrigas" aria-label="Histórico de intrigas">
      <div className="m3-historico-titulo">Intrigas</div>
      {cena.historico.map((e, i) => {
        const src = iconUrl(e.icone, "sm");
        return (
          <div key={i} className="m3-historico-linha" data-atual={e.atual ? "sim" : undefined}>
            {src && <img src={src} alt="" draggable={false} style={{ width: U(16), height: U(16) }} />}
            <span>{e.texto}</span>
          </div>
        );
      })}
    </aside>
  );
}

function Dock() {
  return (
    <div className="m3-dock" data-testid="dock-placeholder" style={{ top: U(DOCK_TOPO) }}>
      <div className="m3-dock-selos" aria-hidden>
        <i /><i /><i />
      </div>
      <div className="m3-dock-mao" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <img key={i} src={backUrl("lg")} alt="" draggable={false} style={{ width: U(66), height: U(96) }} />
        ))}
      </div>
      <span className="m3-dock-nota">dock: mockup próprio em P03.S3</span>
    </div>
  );
}

/** Linha pontilhada do balão até o alvo (coordenadas base; o SVG escala sozinho). */
function LinhaAlvo({ cena }: { cena: Cena }) {
  if (!cena.alvoId) return null;
  const ator = cena.posicoes[cena.atorId];
  const alvo = cena.posicoes[cena.alvoId];
  const x1 = ator.cx - 88 + RETRATO_CX;
  const y1 = ator.y - 30;
  const x2 = alvo.cx - 88 + RETRATO_CX;
  const y2 = alvo.y + 55;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  // a ponta para um pouco antes do retrato (os assentos ficam por cima da linha)
  const recuo = 70;
  const px = x2 - (dx / len) * recuo;
  const py = y2 - (dy / len) * recuo;
  return (
    <svg
      data-testid="linha-alvo"
      viewBox="0 0 1280 720"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <line x1={x1} y1={y1} x2={px} y2={py} stroke="#14101a" strokeWidth={7} strokeDasharray="6 8" />
      <line x1={x1} y1={y1} x2={px} y2={py} stroke="#e03a2c" strokeWidth={4} strokeDasharray="6 8" />
      <rect x={px - 6} y={py - 6} width={12} height={12} fill="#e03a2c" stroke="#14101a" strokeWidth={2} />
    </svg>
  );
}

export default function Palco({ cena, resolucao }: { cena: Cena; resolucao: Resolucao }) {
  const { u, largura, altura } = RESOLUCOES[resolucao];
  const porId = (id: string | null): JogadorCena | undefined => cena.jogadores.find((j) => j.id === id);
  return (
    <div className="m3-palco-rolagem">
      <div
        className="m3-palco"
        data-testid="palco"
        data-resolucao={resolucao}
        data-jogadores={cena.n}
        data-acao={cena.acao}
        style={{ ...estiloEscala(u), width: largura, height: altura }}
      >
        <div className="m3-fundo" style={{ backgroundImage: `url(${TABLE_BG_URL})` }} aria-hidden />
        <div className="m3-fundo-escuro" aria-hidden />
        <div className="m3-mesa" aria-hidden />
        <Cabecalho sala="K7QX" />
        <Historico cena={cena} />

        <div className="m3-centro-item" style={{ left: U(452), top: U(250) }}>
          <Erario quantidade={cena.erario} />
        </div>
        <div className="m3-centro-item" style={{ left: U(838), top: U(238) }}>
          <Baralho cartas={cena.baralho} />
        </div>
        <div className="m3-centro-item" style={{ left: U(640), top: U(392) }}>
          <Legenda texto={cena.legenda} />
        </div>

        <LinhaAlvo cena={cena} />

        {cena.jogadores.map((j) => {
          const eAtor = j.id === cena.atorId;
          return (
            <Assento
              key={j.id}
              jogador={j}
              posicao={cena.posicoes[j.id]}
              vez={eAtor}
              balao={eAtor ? { acao: cena.acao, alvo: porId(cena.alvoId) } : undefined}
              relogio={cena.aguardando[j.id]}
              aguardado={j.id in cena.aguardando}
              passou={cena.passaramIds.includes(j.id)}
            />
          );
        })}

        <Dock />

        {/* Leitores de tela: o texto saiu do cabeçalho, mas continua acessível (B5) */}
        <div role="status" className="m3-sr" data-testid="status-oculto">
          {cena.legenda}
        </div>
      </div>
    </div>
  );
}
