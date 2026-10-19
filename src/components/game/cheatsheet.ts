// Conteúdo da colinha (botão "?"): função pura, sem React.
// Tudo que é de carta/ação vem do catálogo (cards.ts) e de helpers.ts (ACTION_META,
// legalBlockChars, requiredCharacter): nenhum nome, custo ou regra de bloqueio é
// escrito à mão aqui. Só o resumo geral do jogo (RULES_SUMMARY) é texto próprio e
// deve ser mantido fiel ao game-rules.md.

import { CARDS, type CardId } from "@/src/lib/game/cards";
import type { ActionType } from "@/src/types/game";
import { ACTION_META, type IconName, legalBlockChars, requiredCharacter } from "./helpers";

// Quem pode bloquear uma ação: `qualquer` (ex.: Ajuda Externa) ou só a `vitima`.
export type BlockScope = "qualquer" | "vitima";

export interface BlockerInfo {
  characterId: CardId;
  nome: string;
  quem: BlockScope;
}

export interface ActionInfo {
  action: ActionType;
  label: string;
  efeito: string;
  custo: number | null;
  /** Precisa de alvo (clicar no jogador)? */
  alvo: boolean;
  /** Pode ser contestada? (só ações de personagem; Renda, Ajuda Externa e Golpe não.) */
  contestavel: boolean;
  bloqueadaPor: BlockerInfo[];
}

export interface CharacterInfo {
  id: CardId;
  nome: string;
  /** Ação de turno do personagem; null = sem ação própria (Benzedeira). */
  acao: ActionInfo | null;
  /** O que este personagem bloqueia. */
  bloqueia: { action: ActionType; label: string; quem: BlockScope }[];
}

export interface CheatSheet {
  characters: CharacterInfo[];
  /** Ações sempre disponíveis, sem alegar personagem. */
  generalActions: ActionInfo[];
  rules: string[];
}

// Ações gerais, na ordem em que aparecem: as que não dependem de personagem.
const GENERAL_ORDER: ActionType[] = ["renda", "ajuda_externa", "golpe"];

// Resumo geral. Fiel ao game-rules.md; sem números de tempo (são configuráveis no lobby).
export const RULES_SUMMARY: readonly string[] = [
  "Objetivo: ser o último jogador com influência. Cada carta virada para baixo é uma influência.",
  "No seu turno, escolha uma ação. Ações de personagem podem ser blefe: você só mostra a carta se for contestado.",
  "Contestar: qualquer jogador pode contestar uma ação de personagem ou um bloqueio. Quem mentiu perde 1 influência. Quem contestou errado também perde 1, e o contestado troca a carta que provou por outra da Corte.",
  "Bloquear: alguns personagens bloqueiam certas ações (veja o quadro). O bloqueio também pode ser contestado.",
  "Com 10 ou mais moedas no começo do turno, o Golpe de Estado é obrigatório.",
  "Quem fica sem influência é exilado e devolve as moedas ao Tesouro.",
  "Passar: nas janelas de reação, 'Passar' é definitivo para você naquela jogada.",
  "Se o tempo acabar, o jogo decide pelo caminho mais seguro: Renda no turno (Golpe com 10+ moedas), carta sorteada ao revelar, e a janela de reação simplesmente fecha.",
];

// Regras curtas da peça da colinha (P22): no máximo 5 linhas, ~60 palavras, uma por assunto, cada
// uma com um ícone. Texto próprio (não passa por buildCheatSheet) e fiel ao game-rules.md: o
// teste `RULES_CARD cita fatos do game-rules.md` confere os números lendo o próprio arquivo.
export interface RegraCurta {
  id: "comeco" | "moedas" | "golpe" | "contestar" | "passar";
  icone: IconName;
  texto: string;
}

export const RULES_CARD: readonly RegraCurta[] = [
  { id: "comeco", icone: "coroa", texto: "Cada um começa com 2 moedas e 2 influências. Sem influência, você é exilado." },
  { id: "moedas", icone: "moeda", texto: "Renda dá +1 moeda e Ajuda Externa dá +2. Nenhuma das duas pode ser contestada." },
  { id: "golpe", icone: "golpe", texto: "Golpe de Estado custa 7 e não falha. Com 10 ou mais moedas, é obrigatório." },
  {
    id: "contestar",
    icone: "contestar",
    texto: "Todos podem contestar. Blefou e foi pego, ou contestou e errou: perde 1 influência.",
  },
  { id: "passar", icone: "passar", texto: "Passar é final naquela janela. Se o tempo estoura, o jogo escolhe por você." },
];

// Quem pode bloquear `action`, derivado do catálogo + da regra de UI (legalBlockChars):
// pergunta "um não-alvo pode?" (→ qualquer um) e "o alvo pode?" (→ só a vítima).
function blockersOf(action: ActionType): BlockerInfo[] {
  const ANY = "__qualquer__";
  const anyone = legalBlockChars(action, null, ANY);
  const victim = legalBlockChars(action, ANY, ANY);
  const chars = anyone.length > 0 ? anyone : victim;
  const quem: BlockScope = anyone.length > 0 ? "qualquer" : "vitima";
  return chars.map((id) => ({
    characterId: id,
    nome: CARDS.find((c) => c.id === id)!.nome,
    quem,
  }));
}

function actionInfo(action: ActionType): ActionInfo {
  const m = ACTION_META[action];
  return {
    action,
    label: m.label,
    efeito: m.efeito,
    custo: m.coinCost ?? null,
    alvo: m.needsTarget,
    contestavel: requiredCharacter(action) !== null,
    bloqueadaPor: blockersOf(action),
  };
}

export function buildCheatSheet(): CheatSheet {
  return {
    characters: CARDS.map((c) => ({
      id: c.id,
      nome: c.nome,
      acao: c.acao ? actionInfo(c.acao) : null,
      bloqueia: c.bloqueia.map((a) => ({
        action: a,
        label: ACTION_META[a].label,
        quem: blockersOf(a)[0]?.quem ?? "vitima",
      })),
    })),
    generalActions: GENERAL_ORDER.map(actionInfo),
    rules: [...RULES_SUMMARY],
  };
}
