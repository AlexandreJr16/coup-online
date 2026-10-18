// Projeção pública do GameView (VIDA_E_BLEFE 2.1). Módulo seguro para o NAVEGADOR: sem
// `node:*`. O harness de teste (leak.ts) reexporta e prova a propriedade.
import type { GameView } from "@/src/types/game";

declare const publicBrand: unique symbol;

/**
 * View sem nenhuma informação oculta. O `tsc` impede passar um `GameView` cru por
 * acidente; o brand NÃO é barreira contra quem force o tipo (`as`): a garantia real é
 * `toPublicView` + `assertNoLeak`.
 */
export type PublicView = GameView & { readonly [publicBrand]: true };

/**
 * Projeção pública, por LISTA DO QUE MANTER (falha fechado): cada nível é montado campo a
 * campo, então um campo novo no `GameView` dá erro de tipo aqui e nunca passa em silêncio.
 * Zera toda carta virada para baixo (inclusive a mão do observador) e o pool da troca.
 */
export function toPublicView(view: GameView): PublicView {
  const pub: GameView = {
    phase: view.phase,
    matchNumber: view.matchNumber,
    lastChallenge: view.lastChallenge
      ? {
          n: view.lastChallenge.n,
          challengerId: view.lastChallenge.challengerId,
          accusedId: view.lastChallenge.accusedId,
          claimed: view.lastChallenge.claimed,
          accusedHadCard: view.lastChallenge.accusedHadCard,
          kind: view.lastChallenge.kind,
        }
      : null,
    stats: Object.fromEntries(
      Object.entries(view.stats).map(([id, st]) => [
        id,
        {
          challengesMade: st.challengesMade,
          challengesRight: st.challengesRight,
          bluffsCaught: st.bluffsCaught,
          blocks: st.blocks,
          kills: st.kills,
          maxCoins: st.maxCoins,
          influenceLost: st.influenceLost,
        },
      ]),
    ),
    players: view.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      eliminated: p.eliminated,
      cards: p.cards.map((c) => (c.revealed ? { revealed: true, character: c.character } : { revealed: false, character: null })),
    })),
    currentPlayerId: view.currentPlayerId,
    deckCount: view.deckCount,
    treasury: view.treasury,
    config: {
      globalReactionTime: view.config.globalReactionTime,
      targetReactionTime: view.config.targetReactionTime,
      challengeBlockTime: view.config.challengeBlockTime,
      turnTime: view.config.turnTime,
      choiceTime: view.config.choiceTime,
    },
    pending: view.pending
      ? {
          action: view.pending.action,
          actorId: view.pending.actorId,
          targetId: view.pending.targetId,
          claimedCharacter: view.pending.claimedCharacter,
          block: view.pending.block
            ? { blockerId: view.pending.block.blockerId, character: view.pending.block.character }
            : null,
          passedIds: [...view.pending.passedIds],
        }
      : null,
    mustRevealPlayerId: view.mustRevealPlayerId,
    exchange: null,
    winnerId: view.winnerId,
    timer: view.timer
      ? { phase: view.timer.phase, seconds: view.timer.seconds, remainingMs: view.timer.remainingMs }
      : null,
  };
  return pub as PublicView;
}
