// Preferência de efeitos (VIDA_E_BLEFE 15; DEC-07 recomendação: 3 níveis). Lógica pura;
// o armazenamento é injetado e protegido (localStorage pode lançar ou vir vazio).
import { duracaoDaCena } from "./cena";
import { PULAR_CARIMBO_MS, type Cena } from "./types";

export type EfeitosPref = "completo" | "reduzido" | "desligado";
export type ModoDeReproducao = "completo" | "estatico" | "nenhum";

export const CHAVE_EFEITOS = "coup:efeitos";
const VALIDAS: readonly EfeitosPref[] = ["completo", "reduzido", "desligado"];

export function parsePref(raw: string | null | undefined): EfeitosPref {
  return VALIDAS.includes(raw as EfeitosPref) ? (raw as EfeitosPref) : "completo";
}

export function lerPref(storage: Pick<Storage, "getItem"> | undefined): EfeitosPref {
  try {
    return parsePref(storage?.getItem(CHAVE_EFEITOS));
  } catch {
    return "completo";
  }
}

export function salvarPref(storage: Pick<Storage, "setItem"> | undefined, pref: EfeitosPref): void {
  try {
    storage?.setItem(CHAVE_EFEITOS, pref);
  } catch {
    /* sem storage (janela privada): a preferência vale só nesta sessão */
  }
}

/** `desligado` = só estado persistente; `reduzido` ou preferência do sistema = carimbo estático. */
export function modoDeReproducao(pref: EfeitosPref, movimentoReduzidoDoSistema: boolean): ModoDeReproducao {
  if (pref === "desligado") return "nenhum";
  if (pref === "reduzido" || movimentoReduzidoDoSistema) return "estatico";
  return "completo";
}

/**
 * Adapta uma cena ao modo. `nenhum` = null (a UI mostra só o estado final). `estatico` =
 * só os beats `final` (carimbo/estado de chegada), sem movimento, sem hold e sem pular.
 */
export function adaptarCena(cena: Cena, modo: ModoDeReproducao): Cena | null {
  if (modo === "completo") return cena;
  if (modo === "nenhum") return null;
  const finais = cena.beats.filter((b) => b.final);
  if (finais.length === 0) return null;
  const dur = Math.min(PULAR_CARIMBO_MS, duracaoDaCena(cena));
  // só o ÚLTIMO beat final (o estado de chegada): vários finais juntos tocariam o som em dobro
  const ultimo = finais[finais.length - 1];
  return {
    id: cena.id,
    prioridade: cena.prioridade,
    duracaoMax: dur,
    beats: [{ ...ultimo, em: 0, dur, pulavel: false, param: { ...ultimo.param, estatico: 1 } }],
  };
}
