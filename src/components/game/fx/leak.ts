// Harness do teste de vazamento (P02.S3, VIDA_E_BLEFE 2.1 e 16.3).
// Regra: nenhuma animação/cena/evento pode depender de informação oculta. O diretor de
// cena só recebe `PublicView`; este módulo gera essa projeção e prova a propriedade.
import assert from "node:assert/strict";
import { isDeepStrictEqual, types } from "node:util";
import type { Character, GameView } from "@/src/types/game";

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

function isPlainData(x: unknown): boolean {
  if (x === null || typeof x === "string" || typeof x === "boolean") return true;
  if (typeof x === "number") return Number.isFinite(x) && !Object.is(x, -0);
  if (typeof x !== "object" || types.isProxy(x)) return false;
  if (Array.isArray(x)) {
    if (Object.getPrototypeOf(x) !== Array.prototype) return false;
    const keys = Reflect.ownKeys(x);
    // só os índices 0..n-1 (sem buracos) e `length`
    if (keys.length !== x.length + 1 || !keys.every((k, i) => k === (i < x.length ? String(i) : "length"))) return false;
    return x.every((_, i) => {
      const d = Object.getOwnPropertyDescriptor(x, i);
      return d !== undefined && "value" in d && isPlainData(d.value);
    });
  }
  if (Object.getPrototypeOf(x) !== Object.prototype) return false;
  if (Object.getOwnPropertySymbols(x).length > 0) return false;
  const descs = Object.getOwnPropertyDescriptors(x);
  return Object.values(descs).every((d) => d.enumerable && "value" in d && isPlainData(d.value));
}

const PERSONAGENS: Character[] = ["duque", "assassino", "capitao", "embaixador", "condessa"];

/**
 * Variantes do oculto: cada slot virado para baixo QUE TEM CARTA (a mão do observador; nas
 * views reais os demais já vêm `null`) recebe cada personagem (um por vez), as
 * duas cartas de cada jogador viram iguais, e o pool da troca assume formas diferentes.
 * Pega funções que só reagem a certas cartas (ex.: `includes("embaixador")`).
 */
function hiddenVariants(v: GameView): GameView[] {
  const out: GameView[] = [];
  v.players.forEach((p, pi) => {
    p.cards.forEach((c, ci) => {
      if (c.revealed || c.character === null) return; // numa view real só a mão do observador tem carta
      for (const ch of PERSONAGENS) {
        const w = structuredClone(v);
        w.players[pi].cards[ci] = { revealed: false, character: ch };
        out.push(w);
      }
    });
    if (p.cards.every((c) => !c.revealed && c.character !== null)) {
      for (const ch of PERSONAGENS) {
        const w = structuredClone(v);
        w.players[pi].cards = w.players[pi].cards.map(() => ({ revealed: false, character: ch }));
        out.push(w);
      }
    }
  });
  for (const pool of [null, [], ["duque"], ["embaixador", "condessa"]] as Array<Character[] | null>) {
    out.push({ ...structuredClone(v), exchange: pool ? { pool } : null });
  }
  return out;
}

function deepFreeze<T>(x: T): T {
  if (x !== null && typeof x === "object") {
    Object.values(x).forEach(deepFreeze);
    Object.freeze(x);
  }
  return x;
}

const fresh = (v: GameView): GameView => deepFreeze(structuredClone(v));

/**
 * Prova que `f` não depende de dado oculto. Detecta leitura de QUALQUER dado oculto sem
 * depender do par `a`/`b`: para cada view (as duas e todas as variantes do oculto, ver
 * `hiddenVariants`) exige `f(v)` igual a `f(toPublicView(v))`. Além disso:
 *  - `a` e `b` devem diferir só no oculto (pré-condições anti-teste-vácuo);
 *  - `f` roda sobre cópias congeladas (mutação da entrada falha);
 *  - a saída precisa ser dado simples (objetos e arrays puros, sem Proxy, classe, buraco,
 *    propriedade extra em array, -0, não enumerável, Set/Map/gerador/closure);
 *  - a comparação é `isDeepStrictEqual` E `JSON.stringify` (a ordem das chaves conta);
 *  - exceção lançada por `f` é reportada como falha de `f` (pode depender do oculto).
 * Limitação aceita: `Object.freeze`/`writable:false` na saída é um canal de 1 bit (a saída pode
 * conter pedaços da entrada, que está congelada). `f` deve ser PURA e determinística: memo de módulo e aleatoriedade são invisíveis a um
 * teste de caixa-preta e fazem o teste acusar falsamente.
 */
export function assertNoLeak<T>(f: (v: GameView) => T, a: GameView, b: GameView): void {
  assert.notDeepEqual(a, b, "pré-condição: as views precisam diferir em algo oculto (senão o teste é vácuo)");
  assert.deepEqual(toPublicView(a), toPublicView(b), "pré-condição: as views diferem em dado PÚBLICO");
  const run = (v: GameView): T => {
    let out: T;
    try {
      out = f(fresh(v));
    } catch (e) {
      assert.fail(`f lançou (pode depender do oculto): ${String(e)}`);
    }
    assert.ok(isPlainData(out), "a saída de f precisa ser dado simples (sem Set/Map/gerador/classe/closure/Proxy/-0)");
    return out;
  };
  const same = (x: T, y: T): boolean => isDeepStrictEqual(x, y) && JSON.stringify(x) === JSON.stringify(y);
  for (const v of [a, b, ...hiddenVariants(a), ...hiddenVariants(b)]) {
    assert.ok(same(run(v), run(toPublicView(v))), "VAZAMENTO: a saída muda quando o dado oculto é removido");
  }
  assert.ok(same(run(a), run(b)), "VAZAMENTO: a saída depende de informação oculta");
}
