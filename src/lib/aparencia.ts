// Preferências de aparência do jogador (P27, DEC-11/DEC-14, F-10): fonte, estilo do kit e dock.
// Lógica PURA: sem DOM e sem relógio; o storage é injetado e protegido (localStorage pode
// lançar ou vir vazio). Mesmo padrão de `src/components/game/fx/prefs.ts`.

export const FONTES_PREF = ["pixelify", "silkscreen", "vt323", "press"] as const;
export const ESTILOS_PREF = ["A", "B"] as const;
export const DOCKS_PREF = ["mesa", "cavalete", "bandeja"] as const;

export type FontePref = (typeof FONTES_PREF)[number];
/** A = madeira e latão (padrão); B = pergaminho e tinta. */
export type EstiloPref = (typeof ESTILOS_PREF)[number];
/** Barra de baixo da mesa: mão sobre a mesa (padrão), cavalete ou bandeja de couro. */
export type DockPref = (typeof DOCKS_PREF)[number];

export interface Aparencia {
  fonte: FontePref;
  estilo: EstiloPref;
  dock: DockPref;
}

export const APARENCIA_PADRAO: Aparencia = { fonte: "pixelify", estilo: "A", dock: "mesa" };

export const CHAVE_APARENCIA = "coup:aparencia";

/** Valor só vale se for exatamente uma das opções (sem herdar do protótipo: "toString" etc.). */
function escolher<T extends string>(opcoes: readonly T[], valor: unknown, padrao: T): T {
  return typeof valor === "string" && (opcoes as readonly string[]).includes(valor) ? (valor as T) : padrao;
}

/** Tolerante: JSON inválido, não-objeto ou valor desconhecido caem no padrão, campo a campo. */
export function parseAparencia(raw: string | null | undefined): Aparencia {
  let obj: unknown;
  try {
    obj = raw ? JSON.parse(raw) : null;
  } catch {
    obj = null;
  }
  const o: Record<string, unknown> =
    typeof obj === "object" && obj !== null && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
  return {
    fonte: escolher(FONTES_PREF, o.fonte, APARENCIA_PADRAO.fonte),
    estilo: escolher(ESTILOS_PREF, o.estilo, APARENCIA_PADRAO.estilo),
    dock: escolher(DOCKS_PREF, o.dock, APARENCIA_PADRAO.dock),
  };
}

export function lerAparencia(storage: Pick<Storage, "getItem"> | undefined): Aparencia {
  try {
    return parseAparencia(storage?.getItem(CHAVE_APARENCIA));
  } catch {
    return { ...APARENCIA_PADRAO };
  }
}

export function salvarAparencia(storage: Pick<Storage, "setItem"> | undefined, a: Aparencia): void {
  try {
    storage?.setItem(CHAVE_APARENCIA, JSON.stringify(a));
  } catch {
    /* sem storage (janela privada): a preferência vale só nesta sessão */
  }
}

export type AtributosDoTema = {
  "data-estilo": EstiloPref;
  "data-fonte": FontePref;
  "data-dock": DockPref;
};

/** Atributos do <html> que o CSS (`:root[data-estilo=...]`, `[data-fonte=...]`) lê. */
export function atributosDoTema(a: Aparencia): AtributosDoTema {
  return { "data-estilo": a.estilo, "data-fonte": a.fonte, "data-dock": a.dock };
}

/** Escreve os atributos num elemento (o <html>). Aceita qualquer coisa com `setAttribute`. */
export function aplicarAtributos(el: Pick<Element, "setAttribute">, a: Aparencia): void {
  for (const [k, v] of Object.entries(atributosDoTema(a))) el.setAttribute(k, v);
}

/**
 * Script inline do <head>: roda ANTES da hidratação e troca os `data-*` do <html> pela
 * preferência salva, para a primeira pintura já sair com o tema certo (sem flash). Mesma
 * regra do `parseAparencia` (o teste confere as duas). Autocontido: nada de import aqui.
 */
export const SCRIPT_TEMA = `(function(){try{
var P=${JSON.stringify(APARENCIA_PADRAO)};
var O={fonte:${JSON.stringify(FONTES_PREF)},estilo:${JSON.stringify(ESTILOS_PREF)},dock:${JSON.stringify(DOCKS_PREF)}};
var o={};
try{var j=JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE_APARENCIA)}));
if(j&&typeof j==="object"&&!Array.isArray(j))o=j;}catch(e){}
function v(k){return typeof o[k]==="string"&&O[k].indexOf(o[k])>=0?o[k]:P[k];}
var h=document.documentElement;
h.setAttribute("data-estilo",v("estilo"));
h.setAttribute("data-fonte",v("fonte"));
h.setAttribute("data-dock",v("dock"));
}catch(e){}})();`;
