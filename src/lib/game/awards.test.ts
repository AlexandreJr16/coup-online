// Prêmios x arte: cada prêmio aponta para um ícone pixel que existe (nada de emoji do sistema
// na tela de fim de partida). A lógica de quem ganha continua em engine.stats.test.ts.
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { ICONS_AVAILABLE, iconUrl } from "../../components/game/helpers";
import type { PlayerStats } from "../../types/game";
import { computeAwards, ICONE_DO_PREMIO, type AwardId } from "./awards";

const IDS: AwardId[] = ["mentiroso", "desconfiado", "olho_de_lince", "carrasco", "ricaco"];

test("todo prêmio tem ícone em ICONS_AVAILABLE e o arquivo existe (sm e lg)", () => {
  for (const id of IDS) {
    const icone = ICONE_DO_PREMIO[id];
    assert.ok(icone, `prêmio ${id} sem ícone`);
    assert.ok(ICONS_AVAILABLE.includes(icone), `${id}: ícone ${icone} fora de ICONS_AVAILABLE`);
    for (const size of ["sm", "lg"] as const) {
      const url = iconUrl(icone, size);
      assert.ok(url, `${id}: iconUrl(${icone}, ${size}) nulo`);
      assert.ok(existsSync(join(process.cwd(), "public", url)), `${id}: falta public${url}`);
    }
  }
  assert.deepEqual(Object.keys(ICONE_DO_PREMIO).sort(), [...IDS].sort()); // nenhum prêmio fora da lista
});

test("computeAwards devolve cada prêmio com o ícone do seu id (sem campo de emoji)", () => {
  const stat = (s: Partial<PlayerStats>): PlayerStats => ({
    challengesMade: 0, challengesRight: 0, bluffsCaught: 0, blocks: 0, kills: 0, maxCoins: 2, influenceLost: 0, ...s,
  });
  const awards = computeAwards(
    {
      p1: stat({ bluffsCaught: 2, challengesMade: 4, challengesRight: 3, kills: 2, maxCoins: 9 }),
      p2: stat({ challengesMade: 1 }),
    },
    { p1: "Ana", p2: "Bia" },
  );
  assert.deepEqual(awards.map((a) => a.id).sort(), [...IDS].sort(), "todos os cinco prêmios devem sair neste cenário");
  for (const a of awards) {
    assert.equal(a.icone, ICONE_DO_PREMIO[a.id]);
    assert.equal("emoji" in a, false);
  }
});
