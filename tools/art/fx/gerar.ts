// Registro dos grupos de FX e serialização. `fx.ts` (CLI) e os testes usam isto.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { gerarCarta } from "./grupos/carta";
import { gerarDano } from "./grupos/dano";
import { gerarDuelo } from "./grupos/duelo";
import { arquivosDaPeca, type Arquivo, type Peca } from "./peca";

/**
 * Grupos gerados. Para acrescentar um (bloqueio, tempo, ameaca, acao, exilio, plateia, emotes,
 * particulas, coroa): crie `grupos/<nome>.ts` exportando `gerarX(): Peca[]` e registre aqui.
 */
export const GRUPOS: Readonly<Record<string, () => Peca[]>> = {
  dano: gerarDano,
  carta: gerarCarta,
  duelo: gerarDuelo,
};

export function gerarGrupo(nome: string): Peca[] {
  const g = GRUPOS[nome];
  if (!g) throw new Error(`grupo desconhecido: "${nome}". Disponíveis: ${Object.keys(GRUPOS).join(", ")}`);
  return g();
}

export function gerarTudo(): Peca[] {
  return Object.keys(GRUPOS).flatMap((g) => gerarGrupo(g));
}

export function arquivosDe(pecas: readonly Peca[]): Arquivo[] {
  return pecas.flatMap((p) => arquivosDaPeca(p));
}

/** Grava os arquivos em `raiz` (cria pastas). Devolve os caminhos relativos gravados. */
export function gravar(raiz: string, pecas: readonly Peca[]): string[] {
  const arquivos = arquivosDe(pecas);
  for (const a of arquivos) {
    const destino = join(raiz, a.caminho);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, a.bytes);
  }
  return arquivos.map((a) => a.caminho);
}
