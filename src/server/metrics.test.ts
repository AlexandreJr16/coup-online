// Testes da montagem das linhas de log de medição (R7/F7): funções puras.
import { test } from "node:test";
import assert from "node:assert/strict";

import { consoleMetrics, matchEndEntry, matchStartEntry, rematchEntry } from "./metrics";

const T0 = Date.UTC(2026, 9, 18, 20, 0, 0);

test("match_start: evt, sala, nº da partida e nº de jogadores", () => {
  assert.deepEqual(matchStartEntry({ roomId: "ABCDE", match: 1, players: 4, nowMs: T0 }), {
    evt: "match_start",
    ts: "2026-10-18T20:00:00.000Z",
    roomId: "ABCDE",
    match: 1,
    players: 4,
  });
});

test("match_end: vencedor, nº da partida, jogadores e duração", () => {
  const e = matchEndEntry({
    roomId: "ABCDE",
    match: 3,
    players: 4,
    winnerId: "w1",
    winnerName: "Ana",
    startedAtMs: T0,
    nowMs: T0 + 95_000,
  });
  assert.equal(e.evt, "match_end");
  assert.deepEqual(
    { match: e.match, players: e.players, winnerId: e.winnerId, winnerName: e.winnerName },
    { match: 3, players: 4, winnerId: "w1", winnerName: "Ana" },
  );
  assert.equal((e as { durationMs: number }).durationMs, 95_000);
});

test("match_end: sem início conhecido a duração é 0 (nunca negativa)", () => {
  const e = matchEndEntry({ roomId: "R", match: 1, players: 2, winnerId: null, winnerName: null, startedAtMs: null, nowMs: T0 });
  assert.equal((e as { durationMs: number }).durationMs, 0);
  const f = matchEndEntry({ roomId: "R", match: 1, players: 2, winnerId: null, winnerName: null, startedAtMs: T0 + 5, nowMs: T0 });
  assert.equal((f as { durationMs: number }).durationMs, 0);
});

test("rematch_request: conta as revanches da sala (partida - 1)", () => {
  const e = rematchEntry({ roomId: "R", match: 4, players: 3, nowMs: T0 });
  assert.equal(e.evt, "rematch_request");
  assert.equal((e as { rematches: number }).rematches, 3);
});

test("consoleMetrics escreve UMA linha JSON parseável com o campo evt", () => {
  const linhas: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => void linhas.push(args.join(" "));
  try {
    consoleMetrics(matchStartEntry({ roomId: "R", match: 1, players: 2, nowMs: T0 }));
  } finally {
    console.log = orig;
  }
  assert.equal(linhas.length, 1);
  assert.ok(!linhas[0].includes("\n"));
  assert.equal(JSON.parse(linhas[0]).evt, "match_start");
});
