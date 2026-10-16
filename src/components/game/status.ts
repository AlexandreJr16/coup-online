// Status da rodada, em texto: de quem é a vez e o que está acontecendo agora.
// Função PURA sobre o GameView (só dados públicos: nunca olha carta oculta), para ser
// testada sem React. Alimenta a faixa do cabeçalho (TurnBanner). Os nomes dos jogadores
// viram "você" para quem está olhando (myId); para espectador, sempre o nome.

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

export function deriveRoundStatus(view: GameView, myId: string): RoundStatus {
  const nameOf = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "?";
  const who = (id: string | null) => (id !== null && id === myId ? "você" : nameOf(id));
  const Who = (id: string | null) => {
    const w = who(id);
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

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
