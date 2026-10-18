// Validação pura de cenas: pega erro de quem escreve cenas novas (tempos, teto, beat final).
import { DURACAO_TETO_MS, type Cena, type Prioridade } from "./types";

/** Teto de duração por prioridade (VIDA_E_BLEFE 2.3): frequente é curta, rara pode ir a ~3 s. */
export const TETO_POR_PRIORIDADE: Record<Prioridade, number> = { 0: 600, 1: 1200, 2: 1500, 3: DURACAO_TETO_MS };

export function validarCena(c: Cena): string[] {
  const erros: string[] = [];
  const e = (m: string) => erros.push(`${c.id}: ${m}`);
  if (!c.id) erros.push("cena sem id");
  const finito = (n: number | undefined) => n === undefined || Number.isFinite(n);
  if (!finito(c.duracaoMax) || !finito(c.segurarDesfechoAte) || c.beats.some((b) => !finito(b.em) || !finito(b.dur))) {
    e("tempo não finito (NaN/Infinity)");
    return erros; // as demais checagens perdem o sentido
  }
  if (c.beats.length === 0) e("sem beats");
  const teto = TETO_POR_PRIORIDADE[c.prioridade];
  if (c.duracaoMax <= 0 || c.duracaoMax > teto) e(`duracaoMax fora de (0, ${teto}] para prioridade ${c.prioridade}: ${c.duracaoMax}`);
  c.beats.forEach((b, i) => {
    if (b.em < 0) e(`beat ${i} começa antes de 0`);
    if (b.dur <= 0) e(`beat ${i} sem duração`);
    if (b.em + b.dur > c.duracaoMax) e(`beat ${i} termina em ${b.em + b.dur} > duracaoMax ${c.duracaoMax}`);
  });
  if (c.beats.some((b) => b.pulavel) && !c.beats.some((b) => b.final)) e("tem beat pulável mas nenhum beat final");
  if (c.prioridade === 3 && !c.beats.some((b) => b.final)) e("cena de prioridade 3 precisa de um beat final (para pular)");
  if (c.segurarDesfechoAte !== undefined) {
    if (c.segurarDesfechoAte < 0 || c.segurarDesfechoAte > c.duracaoMax) e(`segurarDesfechoAte fora da cena: ${c.segurarDesfechoAte}`);
    else if (c.segurarDesfechoAte > saltoDePular(c)) e(`segurarDesfechoAte (${c.segurarDesfechoAte}) passa do beat final (${saltoDePular(c)}): pular mostraria o desfecho cedo`);
  }
  return erros;
}

/** Instante (ms desde o início) para onde "pular" salta: fim do último beat `final`. */
export function saltoDePular(c: Cena): number {
  const finais = c.beats.filter((b) => b.final);
  if (finais.length === 0) return c.duracaoMax;
  return Math.min(c.duracaoMax, Math.max(...finais.map((b) => b.em + b.dur)));
}

/** A cena aceita "pular"? Só se algum beat for marcado `pulavel`. */
export const ehPulavel = (c: Cena): boolean => c.beats.some((b) => b.pulavel);

/** Duração efetiva: o fim do último beat (a cena nunca passa de `duracaoMax`). */
export function duracaoDaCena(c: Cena): number {
  return Math.min(c.duracaoMax, Math.max(0, ...c.beats.map((b) => b.em + b.dur)));
}
