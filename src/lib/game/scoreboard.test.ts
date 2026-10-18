// Testes do placar da noite e dos títulos acumulados (funções puras).
import { test } from "node:test";
import assert from "node:assert/strict";

import type { PlayerStats } from "../../types/game";
import { computeTitles, emptyScoreboard, recordMatch, toScorePayload } from "./scoreboard";

const zero: PlayerStats = {
  challengesMade: 0,
  challengesRight: 0,
  bluffsCaught: 0,
  blocks: 0,
  kills: 0,
  maxCoins: 2,
  influenceLost: 0,
};
const st = (o: Partial<PlayerStats> = {}): PlayerStats => ({ ...zero, ...o });
const mesa = [
  { id: "a", name: "Ana" },
  { id: "b", name: "Bia" },
  { id: "c", name: "Caio" },
];

test("placar vazio: nenhuma partida, nenhuma linha, nenhum título", () => {
  const p = toScorePayload(emptyScoreboard());
  assert.deepEqual(p, { matches: 0, lastWinnerId: null, rows: [], titles: [] });
});

test("recordMatch soma vitória do vencedor e partida jogada de todos, sem mutar o placar antigo", () => {
  const b0 = emptyScoreboard();
  const b1 = recordMatch(b0, { winnerId: "b", players: mesa, stats: { a: st(), b: st(), c: st() } });
  assert.equal(b0.matches, 0);
  assert.deepEqual(b0.entries, {});
  assert.equal(b1.matches, 1);
  assert.equal(b1.lastWinnerId, "b");
  assert.equal(b1.entries.b.wins, 1);
  assert.equal(b1.entries.a.wins, 0);
  assert.ok(Object.values(b1.entries).every((e) => e.played === 1));
});

test("placar acumula entre partidas e ordena por vitórias (depois menos partidas, depois nome)", () => {
  let b = emptyScoreboard();
  b = recordMatch(b, { winnerId: "a", players: mesa, stats: { a: st(), b: st(), c: st() } });
  b = recordMatch(b, { winnerId: "c", players: mesa, stats: { a: st(), b: st(), c: st() } });
  b = recordMatch(b, { winnerId: "c", players: mesa, stats: { a: st(), b: st(), c: st() } });
  const p = toScorePayload(b);
  assert.equal(p.matches, 3);
  assert.deepEqual(p.rows.map((r) => [r.name, r.wins, r.played]), [
    ["Caio", 2, 3],
    ["Ana", 1, 3],
    ["Bia", 0, 3],
  ]);
  assert.equal(p.lastWinnerId, "c");
});

test("partida sem vencedor conta como jogada mas ninguém ganha", () => {
  const b = recordMatch(emptyScoreboard(), { winnerId: null, players: mesa, stats: { a: st(), b: st(), c: st() } });
  assert.equal(b.matches, 1);
  assert.ok(Object.values(b.entries).every((e) => e.wins === 0 && e.played === 1));
  assert.equal(toScorePayload(b).lastWinnerId, null);
});

test("jogador que entra depois (ex.: ex-espectador) mantém o histórico pelo id e só soma o que jogou", () => {
  let b = recordMatch(emptyScoreboard(), { winnerId: "a", players: mesa.slice(0, 2), stats: { a: st(), b: st() } });
  b = recordMatch(b, { winnerId: "c", players: mesa, stats: { a: st(), b: st(), c: st() } });
  assert.equal(b.entries.c.played, 1);
  assert.equal(b.entries.c.wins, 1);
  assert.equal(b.entries.a.played, 2);
});

test("nome mais recente vale para o mesmo id", () => {
  let b = recordMatch(emptyScoreboard(), { winnerId: "a", players: [{ id: "a", name: "Ana" }, { id: "b", name: "Bia" }], stats: { a: st(), b: st() } });
  b = recordMatch(b, { winnerId: "a", players: [{ id: "a", name: "Aninha" }, { id: "b", name: "Bia" }], stats: { a: st(), b: st() } });
  assert.equal(b.entries.a.name, "Aninha");
});

test("títulos: quem mais levou o prêmio na noite lidera ('Mentiroso da noite')", () => {
  let b = emptyScoreboard();
  // Bia é pega mentindo em 2 partidas; Caio em 1.
  b = recordMatch(b, { winnerId: "a", players: mesa, stats: { a: st(), b: st({ bluffsCaught: 3 }), c: st({ bluffsCaught: 1 }) } });
  b = recordMatch(b, { winnerId: "a", players: mesa, stats: { a: st(), b: st({ bluffsCaught: 1 }), c: st() } });
  b = recordMatch(b, { winnerId: "a", players: mesa, stats: { a: st(), b: st(), c: st({ bluffsCaught: 2 }) } });
  const mentiroso = computeTitles(b).find((t) => t.id === "mentiroso")!;
  assert.equal(mentiroso.titulo, "Mentiroso da noite");
  assert.equal(mentiroso.count, 2);
  assert.deepEqual(mentiroso.leaders, [{ id: "b", name: "Bia" }]);
});

test("títulos: empate divide a liderança e título que ninguém levou não aparece", () => {
  let b = emptyScoreboard();
  b = recordMatch(b, { winnerId: "a", players: mesa, stats: { a: st({ kills: 2 }), b: st(), c: st() } });
  b = recordMatch(b, { winnerId: "b", players: mesa, stats: { a: st(), b: st({ kills: 2 }), c: st() } });
  const t = computeTitles(b);
  const carrasco = t.find((x) => x.id === "carrasco")!;
  assert.deepEqual(carrasco.leaders.map((l) => l.name), ["Ana", "Bia"]);
  assert.equal(t.find((x) => x.id === "mentiroso"), undefined);
  assert.equal(t.find((x) => x.id === "ricaco"), undefined);
});

test("títulos ignoram stats de quem não estava na mesa", () => {
  const b = recordMatch(emptyScoreboard(), { winnerId: "a", players: mesa.slice(0, 2), stats: { a: st(), b: st(), fantasma: st({ kills: 9 }) } });
  assert.equal(computeTitles(b).find((x) => x.id === "carrasco"), undefined);
  assert.equal(b.entries.fantasma, undefined);
});

test("payload do placar não carrega nenhum campo de carta", () => {
  const b = recordMatch(emptyScoreboard(), { winnerId: "a", players: mesa, stats: { a: st({ kills: 1 }), b: st(), c: st() } });
  const json = JSON.stringify(toScorePayload(b));
  for (const proibido of ["cards", "character", "duque", "assassino", "capitao", "embaixador", "condessa"]) {
    assert.ok(!json.includes(proibido), `não deveria conter ${proibido}`);
  }
});
