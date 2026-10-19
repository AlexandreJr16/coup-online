// Regressão de vazamento do lote da mesa nova (v3.1, auditoria de 19/10): legenda do centro,
// balão da jogada, marca de espera, fichas fantasma, aviso de Golpe e monte do baralho não podem
// mudar quando só muda o que está oculto (mão alheia; verdade vs blefe na contestação).
import { test } from "node:test";

import { viewForPlayer } from "@/src/lib/game/engine";
import type { GameView } from "@/src/types/game";
import { assertNoLeak } from "./fx/leak";
import { avisoDeGolpe, pilhaComFantasma } from "./fichas";
import { deckLayers } from "./helpers";
import { actionBalloon, centerCaption, deriveRoundStatus } from "./status";
import { challengePair, makeView, playersN, withHand, withPending } from "./test-utils";

const ui = (me: string) => (v: GameView) => ({
  legenda: [0, 3, 30].map((s) => centerCaption(v, me, s)),
  balao: actionBalloon(v),
  espera: deriveRoundStatus(v, me).waitingOnIds,
  fichas: v.players.map((p) => [pilhaComFantasma(p.coins, 3), avisoDeGolpe(p.coins)]),
  baralho: deckLayers(v.deckCount),
});

for (const action of ["taxas", "trocar"] as const) {
  test(`mesa nova não vaza verdade vs blefe (${action}, visto por p1)`, () => {
    const par = challengePair({ action });
    assertNoLeak(ui("p1"), viewForPlayer(par.afterAction.truth, "p1"), viewForPlayer(par.afterAction.bluff, "p1"));
  });
}

for (const me of ["p1", "p2", "p3"]) {
  test(`mesa nova não vaza a mão de p3 (visto por ${me})`, () => {
    const base = withPending(makeView({ players: playersN(3) }), { actorId: "p3", action: "taxas", claimedCharacter: "duque" });
    assertNoLeak(ui(me), withHand(base, "p3", ["duque", "condessa"]), withHand(base, "p3", ["capitao", "condessa"]));
  });
}
