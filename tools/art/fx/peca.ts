// Contrato de uma peça de FX: um nome, os quadros da animação e, quando fizer sentido, a
// versão `.sm` (mesma quantidade de quadros). Geradores de grupo devolvem `Peca[]`.
import type { Tela } from "./canvas";

export interface Peca {
  grupo: string;
  /** kebab-case sem acento: vira a pasta `<grupo>/<nome>/`. */
  nome: string;
  quadros: readonly Tela[];
  /** Miniatura para a carta pequena (40x56) etc.; mesma quantidade de quadros. */
  sm?: readonly Tela[];
  /** Onde a peça entra e como posicionar (aparece na folha de contato e no LEIAME). */
  uso: string;
}

export interface Arquivo {
  /** Caminho relativo à raiz de saída: `<grupo>/<nome>/<quadro>.png` ou `.sm.png`. */
  caminho: string;
  bytes: Buffer;
}

/** Arquivos PNG de uma peça: quadros numerados a partir de 1 (`1.png`, `2.png`...). */
export function arquivosDaPeca(p: Peca): Arquivo[] {
  const dir = `${p.grupo}/${p.nome}`;
  if (p.quadros.length === 0) throw new Error(`${dir}: sem quadros`);
  const { w, h } = p.quadros[0];
  p.quadros.forEach((q, i) => {
    if (q.w !== w || q.h !== h) throw new Error(`${dir}: o quadro ${i + 1} tem ${q.w}x${q.h}, esperado ${w}x${h}`);
  });
  if (p.sm && p.sm.length !== p.quadros.length) throw new Error(`${dir}: sm tem ${p.sm.length} quadros, esperado ${p.quadros.length}`);
  const saida: Arquivo[] = p.quadros.map((q, i) => ({ caminho: `${dir}/${i + 1}.png`, bytes: q.png() }));
  p.sm?.forEach((q, i) => saida.push({ caminho: `${dir}/${i + 1}.sm.png`, bytes: q.png() }));
  return saida;
}
