// Montagem de tiras de quadros e folha de contato (revisão visual do Alexandre).
// Tudo puro: devolve `Tela`; quem chama decide onde gravar.
import { Tela } from "./canvas";
import { larguraTexto, texto } from "./fonte";
import type { Peca } from "./peca";

/** Quadros lado a lado, alinhados pelo topo, com `espaco` px transparentes entre eles. */
export function tira(quadros: readonly Tela[], espaco = 2): Tela {
  if (quadros.length === 0) throw new Error("tira sem quadros");
  const w = quadros.reduce((s, q) => s + q.w, 0) + espaco * (quadros.length - 1);
  const h = Math.max(...quadros.map((q) => q.h));
  const t = new Tela(w, h);
  let x = 0;
  for (const q of quadros) {
    t.carimbar(q, x, 0);
    x += q.w + espaco;
  }
  return t;
}

export interface OpcoesFolha {
  /** Largura máxima (em pixels lógicos) antes de quebrar linha. */
  larguraMax?: number;
  /** Cor de fundo da célula: xadrez noite/ameixa deixa ver a transparência. */
  fundo?: "xadrez" | "liso";
  /** Peças-fundo opcionais (ex.: um retrato) colocadas sob cada quadro; devolve a tela já composta. */
  base?: (quadro: Tela) => Tela;
}

function xadrez(w: number, h: number, passo = 4): Tela {
  const t = new Tela(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) t.set(x, y, (Math.floor(x / passo) + Math.floor(y / passo)) % 2 === 0 ? "noite" : "ameixa");
  return t;
}

/**
 * Folha de contato: cada peça vira uma "célula" com rótulo (grupo/nome, em micro-fonte) e a tira
 * dos quadros (e, abaixo, da tira .sm). As células fluem em linhas até `larguraMax`.
 */
export function folhaDeContato(pecas: readonly Peca[], opcoes: OpcoesFolha = {}): Tela {
  const larguraMax = opcoes.larguraMax ?? 360;
  const PAD = 4;
  const celulas = pecas.map((p) => {
    const rotulo = `${p.grupo}/${p.nome}`.toUpperCase();
    const comBase = (q: Tela): Tela => (opcoes.base ? opcoes.base(q) : q);
    const quadros = tira(p.quadros.map(comBase), 3);
    const sm = p.sm ? tira(p.sm.map(comBase), 3) : null;
    const w = Math.max(quadros.w, sm?.w ?? 0, larguraTexto(rotulo)) + PAD * 2;
    const h = PAD + 7 + 3 + quadros.h + (sm ? 3 + sm.h : 0) + PAD;
    return { rotulo, quadros, sm, w, h };
  });
  // Linhas: quebra gulosa.
  const linhas: Array<typeof celulas> = [[]];
  let usado = 0;
  for (const c of celulas) {
    if (usado > 0 && usado + c.w > larguraMax) {
      linhas.push([]);
      usado = 0;
    }
    linhas[linhas.length - 1].push(c);
    usado += c.w + 2;
  }
  const larguraTotal = Math.max(...linhas.map((l) => l.reduce((s, c) => s + c.w + 2, 0))) + 2;
  const alturas = linhas.map((l) => Math.max(...l.map((c) => c.h)) + 2);
  const folha = new Tela(larguraTotal, alturas.reduce((s, a) => s + a, 0) + 2);
  folha.retangulo(0, 0, folha.w, folha.h, "tinta");
  let y = 2;
  linhas.forEach((l, li) => {
    let x = 2;
    for (const c of l) {
      if (opcoes.fundo === "liso") folha.retangulo(x, y, c.w, c.h, "noite");
      else folha.carimbar(xadrez(c.w, c.h), x, y);
      texto(folha, c.rotulo, x + PAD, y + PAD, "creme");
      folha.carimbar(c.quadros, x + PAD, y + PAD + 7 + 3);
      if (c.sm) folha.carimbar(c.sm, x + PAD, y + PAD + 7 + 3 + c.quadros.h + 3);
      x += c.w + 2;
    }
    y += alturas[li];
  });
  return folha;
}
