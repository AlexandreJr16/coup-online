// Paleta mestra para o gerador de FX. Lê `tools/art/palette.json` (fonte única) e expõe
// apelidos legíveis (ouro, vermelho, lacre, prata, areia...) que apontam para ÍNDICES da
// paleta. Nada aqui inventa cor: se o JSON mudar, os apelidos seguem os índices (revisar).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hexParaRgba, type Rgba } from "../png";

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Cor: apelido ("ouro"), hex exato da paleta ("#d9a028") ou índice (0..N-1). */
export type Cor = string | number;

function carregar(): readonly string[] {
  const bruto = JSON.parse(readFileSync(join(AQUI, "..", "palette.json"), "utf8")) as { colors: string[] };
  return bruto.colors.map((c) => c.toLowerCase());
}

export const HEX: readonly string[] = carregar();
export const RGBA: readonly Rgba[] = HEX.map((h) => hexParaRgba(h));

/** Índice reservado para "transparente" dentro das telas. */
export const TRANSPARENTE = 255;

function idx(hex: string): number {
  const i = HEX.indexOf(hex.toLowerCase());
  if (i < 0) throw new Error(`cor ${hex} não está na paleta mestra`);
  return i;
}

/** Apelido -> índice. Todos resolvem por hex (se a paleta perder a cor, falha na carga). */
export const APELIDOS: Readonly<Record<string, number>> = {
  // neutros arroxeados
  tinta: idx("#14101a"),
  noite: idx("#2b2236"),
  ameixa: idx("#4a3d5c"),
  cinza: idx("#7c6f8a"),
  prata: idx("#bdb0a6"),
  creme: idx("#f6ecd6"),
  branco: idx("#fffaf0"),
  // marrons e peles
  marromEscuro: idx("#3a2218"),
  marrom: idx("#5e3a26"),
  marromMedio: idx("#734630"),
  couro: idx("#a0643d"),
  cobre: idx("#c0583a"),
  pele: idx("#dba26c"),
  peleEscura: idx("#b87a48"),
  peleMedia: idx("#cd9358"),
  peleClara: idx("#efc89a"),
  areia: idx("#efc89a"),
  // vermelhos
  vinho: idx("#5c1620"),
  lacre: idx("#9a2a2a"),
  vermelho: idx("#d0453a"),
  coral: idx("#f08a5d"),
  laranja: idx("#e8743b"),
  // dourados
  ouroEscuro: idx("#8a5a14"),
  ouro: idx("#d9a028"),
  ouroClaro: idx("#f7d56a"),
  // verdes
  florestaEscuro: idx("#1f3a2a"),
  verde: idx("#2f6b45"),
  folha: idx("#6aa84f"),
  limao: idx("#b5d86a"),
  // azuis
  marinho: idx("#1a2a4a"),
  azul: idx("#2f5d9a"),
  ciano: idx("#4aa3c7"),
  gelo: idx("#a8dce0"),
  // roxos
  uva: idx("#3b1f52"),
  roxo: idx("#7b3f8f"),
  lilas: idx("#c58ad0"),
};

/** Resolve nome, hex ou índice para um índice válido da paleta (lança se não existir). */
export function indiceDe(cor: Cor): number {
  if (typeof cor === "number") {
    if (!Number.isInteger(cor) || cor < 0 || cor >= HEX.length) throw new RangeError(`índice de cor inválido: ${cor}`);
    return cor;
  }
  if (cor.startsWith("#")) return idx(cor);
  const i = APELIDOS[cor];
  if (i === undefined) throw new Error(`apelido de cor desconhecido: "${cor}"`);
  return i;
}
