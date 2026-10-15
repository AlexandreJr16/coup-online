// Tipos de domínio da engine do Coup. Espelham game-rules.md.
// O estado vive no SERVIDOR (fonte da verdade). O cliente recebe uma VIEW
// filtrada (ver viewForPlayer): nunca enxerga cartas face-down dos outros nem o
// baralho — regra arquitetural inegociável (agents.md).

export type Character =
  | "duque"
  | "assassino"
  | "capitao"
  | "embaixador"
  | "condessa";

export const ALL_CHARACTERS: readonly Character[] = [
  "duque",
  "assassino",
  "capitao",
  "embaixador",
  "condessa",
];

// Ações possíveis no turno do jogador.
//  imediatas: renda, golpe
//  globais:   ajuda_externa, taxas, trocar
//  targeted:  assassinar, extorquir
export type ActionType =
  | "renda"
  | "ajuda_externa"
  | "golpe"
  | "taxas"
  | "assassinar"
  | "extorquir"
  | "trocar";

export interface Card {
  character: Character;
  revealed: boolean; // true = virada para cima; não conta mais como influência
}

export interface PlayerState {
  id: string;
  name: string;
  coins: number;
  // Sempre 2 slots. Influência = cartas com revealed=false. Cartas reveladas
  // ficam no slot (face-up) e fora do baralho — não voltam à Corte.
  cards: [Card, Card];
}

// Fases ESTÁVEIS (a engine espera um evento externo: jogador ou timer).
// `proximo_turno` e `resolvendo_contestacao` do diagrama são transições
// instantâneas, não fases estáveis — por isso não aparecem aqui.
// `aguardando_troca` é a espera interativa da Troca (Embaixador escolhe cartas);
// extensão fiel do diagrama (o macro-fluxo só nomeava aguardando_revelacao).
export type Phase =
  | "aguardando_acao"
  | "janela_reacao_global"
  | "janela_reacao_vitima"
  | "janela_contestar_bloqueio"
  | "aguardando_revelacao"
  | "aguardando_troca"
  | "fim_de_jogo";

// Timers configuráveis (game-rules.md), em segundos. A engine NÃO conta o
// tempo: o servidor arma o timeout e envia o evento { type: "timeout" } quando
// a janela fecha (timer estourou OU todos os elegíveis passaram).
export interface GameConfig {
  globalReactionTime: number; // GLOBAL_REACTION_TIME (3–60, padrão 5)
  targetReactionTime: number; // TARGET_REACTION_TIME (5–120, padrão 15)
  challengeBlockTime: number; // CHALLENGE_BLOCK_TIME (3–60, padrão 5)
  turnTime: number; // TURN_TIME: declarar a ação do turno (15–180, padrão 45)
  choiceTime: number; // CHOICE_TIME: revelar carta / escolher troca (10–120, padrão 30)
}

// Bloqueio declarado durante uma janela de reação.
export interface BlockClaim {
  blockerId: string;
  character: Character; // personagem alegado (pode ser blefe)
}

// Ação em andamento durante as janelas de reação/contestação.
export interface PendingAction {
  action: ActionType;
  actorId: string;
  targetId: string | null;
  // Personagem alegado pela AÇÃO (null = ação geral, ex: ajuda_externa, que não
  // pode ser contestada — só bloqueada).
  claimedCharacter: Character | null;
  // Moedas pagas na declaração (assassinar=3, golpe=7). Só devolvidas se a AÇÃO
  // for desmascarada numa contestação; NÃO devolvidas em bloqueio bem-sucedido.
  paidCoins: number;
  block: BlockClaim | null;
  // Quem já "passou" na janela atual (abre zerada a cada janela). Passar é final:
  // quem passou não bloqueia nem contesta mais naquela janela.
  passedIds: string[];
}

// Efeitos aplicados pela resolução, em fila. `lose_influence` e `exchange` podem
// PAUSAR a fila pedindo input do jogador (revelar carta / escolher troca).
export type Effect =
  | { kind: "gain"; playerId: string; amount: number } // do Tesouro
  | { kind: "pay"; playerId: string; amount: number } // ao Tesouro
  | { kind: "steal"; fromId: string; toId: string; amount: number }
  | { kind: "lose_influence"; playerId: string }
  | { kind: "replace_card"; playerId: string; character: Character }
  | { kind: "exchange"; playerId: string };

// Última contestação resolvida. Pública: todos veem quem contestou quem e se o
// acusado tinha a carta (no jogo físico a carta é mostrada na mesa).
export interface LastChallenge {
  n: number; // contador crescente; o cliente dispara o selo quando muda
  challengerId: string;
  accusedId: string; // quem fez a ação (kind "action") ou o bloqueio (kind "block")
  claimed: Character; // personagem alegado
  accusedHadCard: boolean; // true = estava falando a verdade
  kind: "action" | "block";
}

// Cartas em jogo durante uma Troca (Embaixador). Privadas ao ator.
export interface ExchangePool {
  playerId: string;
  pool: Character[]; // cartas face-down atuais do ator + 2 sacadas da Corte
  keepCount: number; // quantas devem permanecer face-down
}

export interface GameState {
  phase: Phase;
  // Sobe a cada vez que uma fase/janela NOVA abre (mesmo repetindo o nome da fase).
  // O servidor usa para rearmar o timer só quando a janela muda — um "Passar" que
  // não fecha a janela não pode reiniciar o relógio.
  phaseSeq: number;
  matchNumber: number; // nº da partida na sala (sobe a cada revanche)
  lastChallenge: LastChallenge | null; // última contestação (pública)
  players: PlayerState[];
  order: string[]; // ordem de turno (ids)
  currentPlayerIndex: number; // índice em `order` do jogador da vez
  deck: Character[]; // Baralho da Corte (oculto do cliente)
  treasury: number; // Tesouro Central
  config: GameConfig;
  pending: PendingAction | null; // ação em andamento nas janelas
  resolution: Effect[]; // fila de efeitos restantes (resolução pausável)
  mustRevealPlayerId: string | null; // quem deve revelar (aguardando_revelacao)
  exchange: ExchangePool | null; // troca em andamento (aguardando_troca)
  winnerId: string | null; // definido em fim_de_jogo
}

// ── Eventos de entrada da engine ────────────────────────────────────────────
export type GameEvent =
  | { type: "action"; playerId: string; action: ActionType; targetId?: string }
  | { type: "block"; playerId: string; character: Character }
  | { type: "challenge"; playerId: string }
  | { type: "pass"; playerId: string } // "deixo passar": não bloqueio nem contesto
  | { type: "timeout" } // janela/turno estourou (servidor); aplica a jogada segura
  | { type: "reveal"; playerId: string; cardIndex: number }
  | { type: "exchange_choose"; playerId: string; keep: Character[] };

export interface EngineResult {
  state: GameState; // novo estado (ou o mesmo, inalterado, em caso de erro)
  error: string | null; // mensagem se o evento foi inválido
}

// ── View filtrada enviada ao cliente ────────────────────────────────────────
export interface PublicCard {
  revealed: boolean;
  character: Character | null; // null = oculto (carta face-down de outro jogador)
}

export interface PublicPlayer {
  id: string;
  name: string;
  coins: number;
  eliminated: boolean;
  cards: PublicCard[];
}

export interface GameView {
  phase: Phase;
  matchNumber: number;
  lastChallenge: LastChallenge | null;
  players: PublicPlayer[];
  currentPlayerId: string | null;
  deckCount: number; // tamanho do baralho, sem revelar as cartas
  treasury: number;
  config: GameConfig;
  pending: {
    action: ActionType;
    actorId: string;
    targetId: string | null;
    claimedCharacter: Character | null;
    block: BlockClaim | null;
    passedIds: string[]; // quem já passou nesta janela (público)
  } | null;
  mustRevealPlayerId: string | null;
  exchange: { pool: Character[] } | null; // não-nulo só para o ator da troca
  winnerId: string | null;
  // Fase com timer ativo. `seconds` = duração total (denominador da barra);
  // `remainingMs` = quanto falta AGORA segundo o servidor (o cliente soma ao seu
  // relógio local ao receber a view — evita deriva e não reinicia a cada evento).
  timer: { phase: Phase; seconds: number; remainingMs: number } | null;
}
