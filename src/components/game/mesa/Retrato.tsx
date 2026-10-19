// Retrato do assento: moldura 64x92 (3 px de borda), camadas de dano por cima (rachada /
// estilhaçada), anel de relógio, selos de ameaça, ✔ de quem passou, zZz de ausente e medalhão
// da vez. Retratos continuam NEUTROS (princípio 3): todo estado vem de overlay CSS/SVG.
/* eslint-disable @next/next/no-img-element -- pixel art: next/image reamostra e borra os pixels */
import { avatarUrl } from "@/src/components/game/helpers";
import {
  PAL_ALVO,
  PAL_CANHAO,
  PAL_CURATIVO,
  PAL_MEDALHAO,
  PAL_PASSOU,
  PAL_ZZZ,
  SPRITE_ALVO,
  SPRITE_CANHAO,
  SPRITE_CURATIVO,
  SPRITE_MEDALHAO,
  SPRITE_PASSOU,
  SPRITE_ZZZ,
  spriteDigitos,
  PAL,
} from "./bitmaps";
import { U } from "../escalaMesa";
import Pix from "./Pix";

export type Ameaca = "nenhuma" | "canhao" | "alvo";

/** Moedas -> selo de ameaça (informação pública). 7-9: pode dar Golpe; 10+: Golpe obrigatório. */
export function ameacaPorMoedas(moedas: number): Ameaca {
  if (moedas >= 10) return "alvo";
  if (moedas >= 7) return "canhao";
  return "nenhuma";
}

export interface Relogio {
  pct: number; // 0..100 do tempo que ainda resta
  segundos: number; // segundos restantes (inteiro)
}
export const LIMITE_URGENTE = 5;

const COR_ANEL = PAL.ouro;
const COR_ANEL_URGENTE = PAL.vermelho;

// Rachaduras desenhadas no sistema de coordenadas da moldura (70x98, borda incluída).
const RACHA_CANTO_SE: string[] = ["0,0 6,5 8,12 15,16 16,25", "8,12 4,21", "15,16 22,15"];
const RACHA_CANTO_ID: string[] = ["70,98 63,92 61,84 53,80 52,70", "61,84 66,76", "53,80 46,81"];
const RACHA_EXTRA: string[] = [
  "70,0 62,6 58,14 49,18 46,29",
  "58,14 66,20",
  "0,98 7,91 10,83 18,79 20,68",
  "10,83 3,76",
  "35,30 30,42 36,50 31,62 35,72",
  "36,50 44,54",
];
const ESTILHACOS: string[] = [
  "0,0 14,0 9,7 4,13 0,12",
  "70,0 70,15 63,10 58,3",
  "0,98 0,84 7,89 12,98",
  "70,98 56,98 61,91 68,86",
  "28,18 40,22 38,32 27,30",
  "40,60 53,57 56,68 44,72",
];

function Racha({ linhas, claro = true }: { linhas: string[]; claro?: boolean }) {
  return (
    <>
      {linhas.map((l, i) => (
        <g key={i} fill="none" strokeLinejoin="miter">
          <polyline points={l} stroke="#14101a" strokeWidth={2} />
          {claro && <polyline points={l} stroke="#e8d9b0" strokeWidth={1} transform="translate(1,0)" opacity={0.7} />}
        </g>
      ))}
    </>
  );
}

/** Camadas de integridade: 2 = nenhuma, 1 = rachada + curativo, 0 = estilhaçada. */
function CamadasDano({ influencias }: { influencias: 0 | 1 | 2 }) {
  if (influencias === 2) return null;
  const estilhacada = influencias === 0;
  return (
    <svg
      viewBox="0 0 70 98"
      shapeRendering="crispEdges"
      aria-hidden
      data-testid={estilhacada ? "camada-estilhacos" : "camada-rachadura"}
      style={{ position: "absolute", left: U(-3), top: U(-3), width: U(70), height: U(98), pointerEvents: "none" }}
    >
      {estilhacada && (
        <g fill="#0f0a12" opacity={0.78}>
          {ESTILHACOS.map((p, i) => (
            <polygon key={i} points={p} />
          ))}
        </g>
      )}
      <Racha linhas={RACHA_CANTO_SE} />
      <Racha linhas={RACHA_CANTO_ID} />
      {estilhacada && <Racha linhas={RACHA_EXTRA} />}
    </svg>
  );
}

function AnelRelogio({ relogio }: { relogio: Relogio }) {
  const urgente = relogio.segundos <= LIMITE_URGENTE;
  const cor = urgente ? COR_ANEL_URGENTE : COR_ANEL;
  const pct = Math.max(0, Math.min(100, relogio.pct));
  return (
    <svg
      viewBox="0 0 82 110"
      shapeRendering="crispEdges"
      aria-hidden
      data-testid="anel-relogio"
      data-urgente={urgente ? "sim" : "nao"}
      data-pct={Math.round(pct)}
      className={urgente ? "m3-anima m3-urgente" : undefined}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <rect x={2.5} y={2.5} width={77} height={105} fill="none" stroke="#14101a" strokeOpacity={0.65} strokeWidth={3} />
      <rect
        x={2.5}
        y={2.5}
        width={77}
        height={105}
        fill="none"
        stroke={cor}
        strokeWidth={3}
        pathLength={100}
        strokeDasharray={`${pct} 100`}
      />
    </svg>
  );
}

export interface RetratoProps {
  avatar: string;
  nome: string;
  influencias: 0 | 1 | 2;
  ausente?: boolean;
  relogio?: Relogio;
  ameaca?: Ameaca;
  passou?: boolean;
  medalhao?: boolean;
}

export default function Retrato({ avatar, nome, influencias, ausente, relogio, ameaca = "nenhuma", passou, medalhao }: RetratoProps) {
  const estilhacada = influencias === 0;
  const filtro = ausente
    ? "grayscale(1) brightness(0.8)"
    : estilhacada
      ? "grayscale(1) brightness(0.7)"
      : influencias === 1
        ? "saturate(0.85)"
        : undefined;
  const urgente = relogio !== undefined && relogio.segundos <= LIMITE_URGENTE;
  return (
    <div
      data-testid="retrato"
      data-integridade={influencias}
      data-ausente={ausente ? "sim" : undefined}
      style={{ position: "relative", width: U(82), height: U(110), flex: "none" }}
    >
      {/* Moldura: 70x98 com 3 px de borda e contorno duro de 2 px (sem blur) */}
      <div
        style={{
          position: "absolute",
          left: U(6),
          top: U(6),
          width: U(70),
          height: U(98),
          border: `${U(3)} solid ${estilhacada ? "#6b4a2a" : PAL.ouro}`,
          boxShadow: `0 0 0 ${U(2)} #14101a`,
          background: "#2a1d33",
          opacity: ausente ? 0.7 : 1,
        }}
      >
        <img
          src={avatarUrl(avatar)}
          alt={`Retrato de ${nome}`}
          draggable={false}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", filter: filtro }}
        />
        {influencias === 1 && (
          <Pix rows={SPRITE_CURATIVO} paleta={PAL_CURATIVO} style={{ position: "absolute", left: U(30), top: U(22) }} />
        )}
        <CamadasDano influencias={influencias} />
        {ameaca === "alvo" && (
          <div aria-hidden className="m3-anima m3-alvo-colchetes" data-testid="alvo-colchetes">
            <i /><i /><i /><i />
          </div>
        )}
        {urgente && relogio && (
          <Pix
            rows={spriteDigitos(relogio.segundos)}
            paleta={{ o: "#14101a", x: PAL.branco }}
            px={5}
            rotulo={`${relogio.segundos} segundos`}
            testid="digitos-relogio"
            style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          />
        )}
      </div>

      {relogio && <AnelRelogio relogio={relogio} />}

      {medalhao && (
        <Pix
          rows={SPRITE_MEDALHAO}
          paleta={PAL_MEDALHAO}
          rotulo="Medalhão da vez"
          testid="medalhao"
          style={{ position: "absolute", left: U(-26), top: U(10) }}
        />
      )}
      {ameaca === "canhao" && (
        <Pix
          rows={SPRITE_CANHAO}
          paleta={PAL_CANHAO}
          rotulo="Pode dar Golpe de Estado"
          testid="selo-canhao"
          style={{ position: "absolute", right: U(-14), top: U(-4) }}
        />
      )}
      {ameaca === "alvo" && (
        <Pix
          rows={SPRITE_ALVO}
          paleta={PAL_ALVO}
          rotulo="Golpe de Estado obrigatório"
          testid="selo-alvo"
          className="m3-anima m3-pisca"
          style={{ position: "absolute", right: U(-14), top: U(-8) }}
        />
      )}
      {passou && (
        <Pix
          rows={SPRITE_PASSOU}
          paleta={PAL_PASSOU}
          rotulo="Passou"
          testid="marca-passou"
          style={{ position: "absolute", right: U(-10), bottom: U(10) }}
        />
      )}
      {ausente && (
        <Pix
          rows={SPRITE_ZZZ}
          paleta={PAL_ZZZ}
          rotulo="Ausente"
          testid="marca-ausente"
          className="m3-anima m3-zz"
          style={{ position: "absolute", right: U(-18), top: U(4) }}
        />
      )}
    </div>
  );
}
