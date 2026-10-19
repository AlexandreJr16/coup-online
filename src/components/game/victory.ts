// Peças puras da tela de vitória: o atalho da revanche e o desenho da chuva de moedas.

/** Teto de moedas na tela ao mesmo tempo (custo de animação previsível em PC fraco). */
export const TETO_PARTICULAS = 24;
export const PARTICULAS_PADRAO = 16;

export interface Particula {
  esquerda: number; // % da largura
  desvio: number; // px de deslocamento lateral durante a queda
  duracao: number; // s
  atraso: number; // s (negativo: já começa "no meio" da queda)
  giro: number; // s por volta do giro da moeda
}

/**
 * Posição, velocidade e atraso determinísticos por índice (sem Math.random: o mesmo HTML sai
 * no servidor e no cliente, sem erro de hidratação). `n` é limitado a [0, TETO_PARTICULAS].
 */
export function particulas(n: number = PARTICULAS_PADRAO): Particula[] {
  const total = Math.max(0, Math.min(TETO_PARTICULAS, Math.floor(Number.isFinite(n) ? n : 0)));
  return Array.from({ length: total }, (_, i) => ({
    esquerda: 2 + ((i * 37 + i * i * 11) % 94),
    desvio: (((i * 13) % 9) - 4) * 14,
    duracao: 3 + (i % 5) * 0.5,
    atraso: -((i % 7) * 0.55),
    giro: 0.6 + (i % 3) * 0.2,
  }));
}

/** O que o atalho precisa saber do evento de teclado e do elemento em foco. */
export interface TeclaInfo {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** tag do elemento em foco, em minúsculas ("body", "button", "input"...) */
  alvoTag: string;
  alvoEditavel: boolean; // contentEditable
  /** o alvo está dentro de um diálogo (ex.: a colinha de regras) */
  alvoEmDialogo: boolean;
  /** existe algum diálogo modal aberto na página */
  temModalAberto: boolean;
}

/**
 * Enter ou R pedem a revanche. Espaço NÃO (na mesa é Passar). Não dispara: digitando num
 * campo, com Ctrl/Meta/Alt, repetindo a tecla, com outro botão/link focado (Enter nele deve
 * ativar ELE), ou com um diálogo modal aberto por cima.
 */
export function teclaPedeRevanche(t: TeclaInfo): boolean {
  if (t.repeat || t.ctrlKey || t.metaKey || t.altKey || t.defaultPrevented) return false;
  if (t.temModalAberto || t.alvoEmDialogo) return false;
  if (t.alvoEditavel || ["input", "textarea", "select"].includes(t.alvoTag)) return false;
  const k = t.key.toLowerCase();
  if (k === "r") return true;
  if (k === "enter") {
    // Enter num botão/link qualquer ativa esse botão; no botão de revanche o clique nativo
    // já pede a revanche (tratar aqui pediria duas vezes).
    return !["button", "a", "summary"].includes(t.alvoTag);
  }
  return false;
}
