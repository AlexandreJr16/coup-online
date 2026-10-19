// Status da rodada, em texto: de quem é a vez e o que está acontecendo agora.
// Função PURA sobre o GameView (só dados públicos: nunca olha carta oculta), para ser
// testada sem React. Alimenta a faixa do cabeçalho (TurnBanner). Os nomes dos jogadores
// viram "você" para quem está olhando (myId); para espectador, sempre o nome.

import { TIMEOUT_WARNING_SECONDS } from "@/src/lib/game/config";
import type { GameView } from "@/src/types/game";
import { ACTION_META, CHAR_LABEL, reactionOptions, reactorIds } from "./helpers";

export interface RoundStatus {
  /** Quem tem a vez (dono do retrato); null no fim do jogo. */
  turnPlayerId: string | null;
  /** Linha principal: "Vez de Ana", "Bia bloqueou Extorquir com Regatão". */
  headline: string;
  /** Linha secundária: o que a mesa espera e de quem. */
  detail: string;
  /** Quem a mesa está esperando agora (revelar, trocar, reagir sem ter passado). */
  waitingOnIds: string[];
  /** Quem já passou nesta janela de reação. */
  passedIds: string[];
  /** A vez é de quem está olhando? */
  mine: boolean;
}

/** "a, b ou c" */
function joinOu(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ou ${items[items.length - 1]}`;
}

/** "a, b e c" */
function joinE(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

// Nome para exibir: "você" para quem está olhando (`Who` com a inicial maiúscula).
function namers(view: GameView, myId: string) {
  const nameOf = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "?";
  const who = (id: string | null) => (id !== null && id === myId ? "você" : nameOf(id));
  const Who = (id: string | null) => {
    const w = who(id);
    return w.charAt(0).toUpperCase() + w.slice(1);
  };
  return { nameOf, who, Who };
}

export function deriveRoundStatus(view: GameView, myId: string): RoundStatus {
  const { nameOf, who, Who } = namers(view, myId);

  const p = view.pending;
  const passedIds = p?.passedIds ?? [];
  const turnPlayerId = view.currentPlayerId;
  const base = { turnPlayerId, passedIds, mine: turnPlayerId !== null && turnPlayerId === myId };

  switch (view.phase) {
    case "aguardando_acao": {
      const cur = view.players.find((x) => x.id === turnPlayerId);
      const mustCoup = (cur?.coins ?? 0) >= 10;
      return {
        ...base,
        headline: base.mine ? "Sua vez" : `Vez de ${nameOf(turnPlayerId)}`,
        detail: mustCoup
          ? `Golpe de Estado obrigatório (${cur!.coins} moedas)`
          : base.mine
            ? "Escolha uma ação"
            : "Escolhendo uma ação",
        waitingOnIds: turnPlayerId ? [turnPlayerId] : [],
      };
    }

    case "janela_reacao_global":
    case "janela_reacao_vitima":
    case "janela_contestar_bloqueio": {
      if (!p) return { ...base, headline: "Jogada em andamento", detail: "", waitingOnIds: [] };
      const blocking = view.phase === "janela_contestar_bloqueio" && p.block;
      const label = ACTION_META[p.action].label;

      let headline: string;
      if (blocking) {
        headline = `${Who(p.block!.blockerId)} bloqueou ${label} com ${CHAR_LABEL[p.block!.character]}`;
      } else {
        const claim = p.claimedCharacter ? ` (${CHAR_LABEL[p.claimedCharacter]})` : "";
        const target = p.targetId ? ` contra ${who(p.targetId)}` : "";
        headline = `${Who(p.actorId)} declarou ${label}${target}${claim}`;
      }

      // Quem ainda precisa reagir, agrupado pelo que cada um PODE fazer (o alvo, por
      // exemplo, pode bloquear; os demais só contestar). Mantém a ordem da mesa.
      const waiting = reactorIds(view).filter((id) => !passedIds.includes(id));
      const groups: { verbs: string[]; ids: string[] }[] = [];
      for (const id of waiting) {
        const o = reactionOptions(view, id);
        const verbs = [
          ...(o.canChallenge ? [blocking ? "contestar o bloqueio" : "contestar"] : []),
          ...(o.blocks.length > 0 ? ["bloquear"] : []),
          "passar",
        ];
        const key = verbs.join("|");
        const g = groups.find((x) => x.verbs.join("|") === key);
        if (g) g.ids.push(id);
        else groups.push({ verbs, ids: [id] });
      }
      // Quem pode mais coisas vem primeiro na frase (ex.: o alvo, que pode bloquear).
      groups.sort((a, b) => b.verbs.length - a.verbs.length);

      const detail =
        groups.length === 0
          ? "Todos reagiram: resolvendo a jogada"
          : `Aguardando ${groups.map((g) => `${joinE(g.ids.map(who))}: ${joinOu(g.verbs)}`).join(" · ")}`;
      return { ...base, headline, detail, waitingOnIds: waiting };
    }

    case "aguardando_revelacao": {
      const id = view.mustRevealPlayerId;
      const mine = id !== null && id === myId;
      return {
        ...base,
        headline: `${Who(id)} perdeu uma influência`,
        detail: mine ? "Escolha qual carta revelar" : "Escolhendo qual carta revelar",
        waitingOnIds: id ? [id] : [],
      };
    }

    case "aguardando_troca": {
      return {
        ...base,
        headline: `${Who(turnPlayerId)} está trocando cartas`,
        detail: base.mine ? "Escolha quais cartas manter" : "Escolhendo quais cartas manter",
        waitingOnIds: turnPlayerId ? [turnPlayerId] : [],
      };
    }

    case "fim_de_jogo": {
      const w = view.winnerId;
      return {
        turnPlayerId: null,
        passedIds: [],
        mine: false,
        headline: w ? `${Who(w)} venceu!` : "Fim de jogo",
        detail: "Partida encerrada",
        waitingOnIds: [],
      };
    }
  }
}

/**
 * Aviso dos últimos segundos de uma fase de DECISÃO: o que o servidor vai jogar pelo
 * jogador se o tempo acabar (game-rules.md "Quando o tempo estoura"). null fora dessas
 * fases e enquanto ainda sobra tempo. Janelas de reação não avisam: nelas "passar" já
 * resolve e o estouro só fecha a janela.
 */
export function timeoutWarning(view: GameView, myId: string, secondsLeft: number): string | null {
  const timer = view.timer;
  if (!timer || secondsLeft > TIMEOUT_WARNING_SECONDS) return null;
  const { Who } = namers(view, myId);
  const n = Math.max(1, Math.ceil(secondsLeft));

  switch (timer.phase) {
    case "aguardando_acao": {
      const cur = view.players.find((p) => p.id === view.currentPlayerId);
      const quem = Who(view.currentPlayerId);
      return (cur?.coins ?? 0) >= 10
        ? `${quem} dá Golpe em alguém sorteado em ${n}…`
        : `${quem} joga Renda em ${n}…`;
    }
    case "aguardando_revelacao":
      return `${Who(view.mustRevealPlayerId)} revela uma carta sorteada em ${n}…`;
    case "aguardando_troca":
      return `${Who(view.currentPlayerId)} mantém as próprias cartas em ${n}…`;
    default:
      return null;
  }
}

/**
 * Legenda de UMA linha no centro da mesa (P08.S1): o aviso dos últimos segundos toma o lugar do
 * detalhe; sem detalhe, vale a manchete. Só dados públicos, como o resto deste arquivo.
 */
export function centerCaption(
  view: GameView,
  myId: string,
  secondsLeft: number,
): { text: string; warning: boolean } {
  const warning = timeoutWarning(view, myId, secondsLeft);
  if (warning) return { text: warning, warning: true };
  const s = deriveRoundStatus(view, myId);
  return { text: s.detail || s.headline, warning: false };
}

/**
 * Balão sobre o assento de quem agiu (P08.S3): "Assassinar → Bia" enquanto a jogada está em
 * andamento. Sem jogada pendente, não há balão.
 */
export function actionBalloon(view: GameView): { actorId: string; text: string } | null {
  const p = view.pending;
  if (!p) return null;
  const alvo = p.targetId ? view.players.find((x) => x.id === p.targetId)?.name : null;
  const label = ACTION_META[p.action].label;
  return { actorId: p.actorId, text: alvo ? `${label} → ${alvo}` : label };
}
