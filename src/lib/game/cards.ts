// Catálogo de cartas — fonte ÚNICA da verdade de tudo que é específico de carta
// (nome, cor, ícone, ação concedida, o que bloqueia, dica, cópias no baralho).
// Consumido SÓ pela UI: a engine continua usando o type Character / deck.ts.
// Regra do projeto: nenhum componente de UI hard-coda nome/lista/quantidade de
// carta — tudo vem daqui. Pensado para expansões futuras (basta adicionar itens).

import type { ActionType, Character } from "../../types/game";

export interface CardDef {
  id: Character;
  nome: string;
  cor: string; // cor base (DESIGN.md "Cartas — Visual")
  icone: string;
  acao: ActionType | null; // ação de turno concedida (Condessa não tem)
  bloqueia: readonly ActionType[]; // ações que este personagem pode bloquear
  dica: string; // hint curto exibido no HandView
  copiasNoBaralho: number; // só para exibição na UI; a engine tem seu próprio deck
}

// `as const satisfies` preserva os literais (ids) para o guard de exaustividade
// abaixo, ao mesmo tempo que valida cada item contra CardDef.
export const CARDS = [
  {
    id: "duque",
    nome: "Duque",
    cor: "#7b2d8b",
    icone: "👑",
    acao: "taxas",
    bloqueia: ["ajuda_externa"],
    dica: "Taxas +3",
    copiasNoBaralho: 5,
  },
  {
    id: "assassino",
    nome: "Assassino",
    cor: "#1a1a1a",
    icone: "🗡️",
    acao: "assassinar",
    bloqueia: [],
    dica: "Assassinar",
    copiasNoBaralho: 5,
  },
  {
    id: "capitao",
    nome: "Capitão",
    cor: "#1a4a8a",
    icone: "⚓",
    acao: "extorquir",
    bloqueia: ["extorquir"],
    dica: "Extorquir",
    copiasNoBaralho: 5,
  },
  {
    id: "embaixador",
    nome: "Embaixador",
    cor: "#2d6a4f",
    icone: "🕊️",
    acao: "trocar",
    bloqueia: ["extorquir"],
    dica: "Trocar",
    copiasNoBaralho: 5,
  },
  {
    id: "condessa",
    nome: "Condessa",
    cor: "#8b1a1a",
    icone: "💎",
    acao: null,
    bloqueia: ["assassinar"],
    dica: "Bloqueia Assassinato",
    copiasNoBaralho: 5,
  },
] as const satisfies readonly CardDef[];

export type CardId = (typeof CARDS)[number]["id"];

// Guard de compilação: se um Character novo entrar em types/game.ts sem ganhar
// definição aqui, _Missing deixa de ser `never` e esta linha passa a não compilar.
type _Missing = Exclude<Character, CardId>;
const _exhaustive: [_Missing] extends [never] ? true : ["faltou CardDef para", _Missing] = true;
void _exhaustive;

const byId = {} as Record<Character, CardDef>;
for (const c of CARDS) byId[c.id] = c;
export const CARD_BY_ID: Record<Character, CardDef> = byId;
