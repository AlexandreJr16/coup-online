// Descrição PURA do que a aba de Aparência mostra (P27.S4): quais opções existem, qual está
// escolhida e quais ainda não têm visual. O componente `AparenciaPanel` só desenha isto.
// As famílias e escalas das fontes espelham `--fonte-ui` e `--fe` de app/globals.css (um teste
// confere os dois lados). Sem DOM e sem React.
import {
  DOCKS_PREF,
  ESTILOS_PREF,
  FONTES_PREF,
  type Aparencia,
  type DockPref,
  type EstiloPref,
  type FontePref,
} from "@/src/lib/aparencia";

/** Frase de amostra mostrada em cada opção de fonte. */
export const AMOSTRA_FONTE = "Barão do Café, ação";

export interface Opcao<T extends string> {
  valor: T;
  nome: string;
  selecionada: boolean;
  /** só salva a preferência; o visual dessa opção ainda não existe (mostra "em breve") */
  emBreve: boolean;
}

export interface OpcaoFonte extends Opcao<FontePref> {
  /** valor de `font-family` (mesmo de `--fonte-ui` no CSS) */
  familia: string;
  /** fator de escala (mesmo de `--fe` no CSS): compensa a altura de x de cada fonte */
  escala: number;
  padrao: boolean;
}

export interface DescricaoDoPainel {
  fonte: OpcaoFonte[];
  estilo: Opcao<EstiloPref>[];
  dock: Opcao<DockPref>[];
}

export type GrupoDoPainel = keyof DescricaoDoPainel;
export const GRUPOS_DO_PAINEL: readonly GrupoDoPainel[] = ["fonte", "estilo", "dock"];

export const ROTULO_DO_GRUPO: Record<GrupoDoPainel, string> = {
  fonte: "Fonte",
  estilo: "Estilo",
  dock: "Barra de baixo",
};

const FONTES: Record<FontePref, { nome: string; familia: string; escala: number }> = {
  pixelify: { nome: "Pixelify Sans", familia: 'var(--font-pixelify), "Courier New", monospace', escala: 1 },
  silkscreen: { nome: "Silkscreen", familia: 'var(--font-silkscreen), "Courier New", monospace', escala: 0.9 },
  vt323: { nome: "VT323", familia: 'var(--font-vt323), "Courier New", monospace', escala: 1.35 },
  press: { nome: "Press Start 2P", familia: 'var(--font-press), "Courier New", monospace', escala: 0.62 },
};
const NOME_ESTILO: Record<EstiloPref, string> = { A: "Madeira e latão", B: "Pergaminho e tinta" };
const NOME_DOCK: Record<DockPref, string> = { mesa: "Mão sobre a mesa", cavalete: "Cavalete", bandeja: "Bandeja de couro" };

/** Docks que já têm visual na mesa. As outras só salvam a preferência até o P09. */
export const DOCKS_COM_VISUAL: readonly DockPref[] = ["mesa"];

export function descreverPainel(atual: Aparencia): DescricaoDoPainel {
  return {
    fonte: FONTES_PREF.map((v) => ({
      valor: v,
      nome: FONTES[v].nome,
      familia: FONTES[v].familia,
      escala: FONTES[v].escala,
      padrao: v === "pixelify",
      selecionada: atual.fonte === v,
      emBreve: false,
    })),
    estilo: ESTILOS_PREF.map((v) => ({ valor: v, nome: `${v}: ${NOME_ESTILO[v]}`, selecionada: atual.estilo === v, emBreve: false })),
    dock: DOCKS_PREF.map((v) => ({
      valor: v,
      nome: NOME_DOCK[v],
      selecionada: atual.dock === v,
      emBreve: !DOCKS_COM_VISUAL.includes(v),
    })),
  };
}

const VALORES: Record<GrupoDoPainel, readonly string[]> = { fonte: FONTES_PREF, estilo: ESTILOS_PREF, dock: DOCKS_PREF };

/**
 * Clique numa opção -> o trecho a salvar (`Partial<Aparencia>`), ou `null` se o valor não
 * existe naquele grupo ou já é o atual (nada a fazer, nada a gravar).
 */
export function escolhaDoPainel(atual: Aparencia, grupo: GrupoDoPainel, valor: string): Partial<Aparencia> | null {
  if (!VALORES[grupo].includes(valor)) return null;
  if (atual[grupo] === valor) return null;
  return { [grupo]: valor };
}
