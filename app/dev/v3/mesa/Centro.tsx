// Centro da mesa: Erário (monte + baú que enche por faixa), baralho da Corte por faixa e a
// legenda curta de uma linha. Nada de banner no cabeçalho: o texto vive aqui (DEC-15, opção B).
/* eslint-disable @next/next/no-img-element -- pixel art: next/image reamostra e borra os pixels */
import { backUrl } from "@/src/components/game/helpers";
import { PAL_AMPULHETA, SPRITE_AMPULHETA } from "./bitmaps";
import { estiloVars, U } from "./escala";
import { Bau, Monte } from "./Fichas";
import { faixaBaralho, nivelErario, type FaixaBaralho } from "./fichas";
import Pix from "./Pix";

/** Quantas cartas aparecem empilhadas em cada faixa do baralho. */
const CAMADAS: Record<FaixaBaralho, number> = { cheio: 6, medio: 4, pouco: 2, ultima: 1, vazio: 0 };
export const ROTULO_BARALHO: Record<FaixaBaralho, string> = {
  cheio: "cheio (16+)",
  medio: "médio (9-15)",
  pouco: "pouco (2-8)",
  ultima: "última carta",
  vazio: "vazio",
};

export function Baralho({ cartas, mostrarNumero = true }: { cartas: number; mostrarNumero?: boolean }) {
  const faixa = faixaBaralho(cartas);
  const camadas = CAMADAS[faixa];
  const passo = 3; // deslocamento de cada carta empilhada (px de tela em u)
  return (
    <div data-testid="baralho" data-faixa={faixa} data-cartas={cartas} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: U(6) }}>
      <div style={{ position: "relative", width: U(40 + 6 * passo), height: U(56 + 6 * passo) }}>
        {camadas === 0 && (
          <div style={{ position: "absolute", left: 0, bottom: 0, width: U(40), height: U(56), border: `${U(2)} dashed #6b6470` }} />
        )}
        {Array.from({ length: camadas }, (_, i) => (
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
        {faixa === "ultima" && (
          <span className="m3-selo-ultima" data-testid="selo-ultima">
            última
          </span>
        )}
      </div>
      {mostrarNumero && <span className="m3-numero">{cartas}</span>}
    </div>
  );
}

/** Erário: monte (faixa 11-15, 16-25, 26+) ao lado de um baú que enche por faixa. */
export function Erario({ quantidade, mostrarNumero = true }: { quantidade: number; mostrarNumero?: boolean }) {
  const nivel = nivelErario(quantidade);
  return (
    <div
      data-testid="erario"
      data-nivel={nivel}
      data-qtd={quantidade}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: U(6) }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: U(10), height: U(76) }}>
        {nivel !== 0 && <Monte nivel={nivel} v={0} />}
        <Bau nivel={nivel} />
      </div>
      {mostrarNumero && <span className="m3-numero">{quantidade}</span>}
      <span className="m3-rotulo-mesa">Erário</span>
    </div>
  );
}

/** Legenda curta (uma linha) com a ampulheta de "a mesa espera". */
export function Legenda({ texto }: { texto: string }) {
  return (
    <div
      className="m3-caixa"
      data-testid="legenda-mesa"
      style={estiloVars({ "--m3-borda": "#14101a", "--m3-fundo": "#241a2c" })}
    >
      <div className="m3-caixa-in m3-legenda-in">
        <Pix rows={SPRITE_AMPULHETA} paleta={PAL_AMPULHETA} />
        <span>{texto}</span>
      </div>
    </div>
  );
}
