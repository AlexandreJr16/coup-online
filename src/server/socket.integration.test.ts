// Testes de INTEGRAÇÃO do servidor de jogo: Socket.IO real em memória (sem Next) e
// clientes socket.io-client de verdade. Cobre sala, presença/reconexão, timers,
// "Passar", contestação pública, revanche e o filtro de cartas por socket.
// Os tempos do servidor são multiplicados por TIME_SCALE para o teste não esperar.
// Rodar: npm test

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";

import { computeAwards } from "../lib/game/awards";
import { attachGameSocket, type GameIO } from "./socket";
import type { ActionType, Character, GameConfig, GameView } from "../types/game";
import type {
  ClientToServerEvents,
  GameActionAck,
  JoinRoomAck,
  Player,
  Role,
  ScorePayload,
  ServerToClientEvents,
} from "../types/socket";
import type { MetricsEntry } from "./metrics";

const TIME_SCALE = 0.1; // 15s de turno = 1,5s; 5s de janela = 0,5s; graça de 20s = 2s

let httpServer: HttpServer;
let io: GameIO;
let url: string;
const open: Client[] = [];
const logs: MetricsEntry[] = []; // linhas de medição (JSON) que o servidor escreveria no stdout
let clock = Date.now(); // relógio injetado no servidor: o teste controla a duração da partida

before(async () => {
  httpServer = createServer();
  io = new Server(httpServer);
  attachGameSocket(io, { timeScale: TIME_SCALE, log: (e) => logs.push(e), now: () => clock });
  await new Promise<void>((r) => httpServer.listen(0, r));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  for (const c of open) c.socket.close();
  await io.close();
});

// ── Cliente de teste ─────────────────────────────────────────────────────────
type S = Socket<ServerToClientEvents, ClientToServerEvents>;
interface Client {
  socket: S;
  name: string;
  id: string;
  token: string;
  view: GameView | null;
  states: GameView[]; // TODAS as views recebidas (para varrer vazamentos)
  players: Player[];
  spectators: Player[];
  scores: ScorePayload[]; // TODOS os room:score recebidos
  role: Role | "";
  join(room: string, token?: string): Promise<JoinRoomAck>;
  leave(): void;
  start(config?: Partial<GameConfig>): Promise<GameActionAck>;
  action(action: ActionType, targetId?: string): Promise<GameActionAck>;
  block(character: Character): Promise<GameActionAck>;
  challenge(): Promise<GameActionAck>;
  pass(): Promise<GameActionAck>;
  autopass(enabled: boolean): Promise<GameActionAck>;
  reveal(cardIndex: number): Promise<GameActionAck>;
  rematch(): Promise<GameActionAck>;
}

function client(name: string): Client {
  const socket: S = connect(url, { transports: ["websocket"], forceNew: true });
  const c: Client = {
    socket,
    name,
    id: "",
    token: "",
    view: null,
    states: [],
    players: [],
    spectators: [],
    scores: [],
    role: "",
    join: (room, token) =>
      new Promise((res) =>
        socket.emit("room:join", { roomId: room, name, token }, (ack) => {
          if (ack.ok) {
            c.id = ack.you.id;
            c.token = ack.you.token;
            c.role = ack.role;
            c.players = ack.players;
            c.spectators = ack.spectators;
          }
          res(ack);
        }),
      ),
    leave: () => socket.emit("room:leave"),
    start: (config) => new Promise((res) => socket.emit("game_start", { config }, res)),
    action: (action, targetId) =>
      new Promise((res) => socket.emit("game_action", { action, targetId }, res)),
    block: (character) => new Promise((res) => socket.emit("game_block", { character }, res)),
    challenge: () => new Promise((res) => socket.emit("game_challenge", res)),
    pass: () => new Promise((res) => socket.emit("game_pass", res)),
    autopass: (enabled) => new Promise((res) => socket.emit("game_autopass", { enabled }, res)),
    reveal: (cardIndex) => new Promise((res) => socket.emit("game_reveal", { cardIndex }, res)),
    rematch: () => new Promise((res) => socket.emit("game_rematch", res)),
  };
  socket.on("game_state", (v) => {
    c.view = v;
    c.states.push(v);
  });
  socket.on("room:players", (p) => (c.players = p));
  socket.on("room:spectators", (sp) => (c.spectators = sp));
  socket.on("room:score", (sc) => c.scores.push(sc));
  open.push(c);
  return c;
}

let seq = 0;
const roomId = () => `IT${(seq++).toString().padStart(3, "0")}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond: () => boolean, ms = 3000, what = "condição"): Promise<void> {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout esperando: ${what}`);
    await sleep(10);
  }
}

// Sala com N jogadores já dentro (o 1º é o host).
async function lobby(names: string[]): Promise<{ room: string; cs: Client[] }> {
  const room = roomId();
  const cs = names.map(client);
  for (const c of cs) {
    const ack = await c.join(room);
    assert.equal(ack.ok, true);
  }
  return { room, cs };
}

async function startedGame(names: string[], config: Partial<GameConfig> = {}) {
  const { room, cs } = await lobby(names);
  assert.equal((await cs[0].start(config)).ok, true);
  await waitFor(() => cs.every((c) => c.view !== null), 3000, "view inicial");
  return { room, cs };
}

const me = (c: Client) => c.view!.players.find((p) => p.id === c.id)!;
const coinsOf = (c: Client, who: Client) => c.view!.players.find((p) => p.id === who.id)!.coins;

// ── Sala e identidade ────────────────────────────────────────────────────────
test("entrar numa sala devolve id estável e token secreto (que não vaza na lista)", async () => {
  const { cs } = await lobby(["Ana", "Bia"]);
  const [a] = cs;
  assert.notEqual(a.id, a.socket.id); // identidade ≠ socket.id
  assert.equal(a.token.length, 32);
  await waitFor(() => a.players.length === 2, 2000, "lista de jogadores");
  assert.ok(!JSON.stringify(a.players).includes(a.token));
});

test("payload inválido no room:join é recusado sem derrubar o servidor", async () => {
  const c = client("X");
  const ack = await new Promise<JoinRoomAck>((res) =>
    c.socket.emit("room:join", { roomId: 42, name: {} } as never, res),
  );
  assert.equal(ack.ok, false);
  const ok = await c.join(roomId()); // o servidor continua vivo
  assert.equal(ok.ok, true);
});

test("nome longo demais é recusado", async () => {
  const c = client("N".repeat(30));
  const ack = await c.join(roomId());
  assert.equal(ack.ok, false);
});

test("sair do lobby (room:leave) libera o assento na hora", async () => {
  const { cs } = await lobby(["Ana", "Bia", "Caio"]);
  await waitFor(() => cs[0].players.length === 3);
  cs[2].socket.emit("room:leave");
  await waitFor(() => cs[0].players.length === 2, 2000, "assento liberado");
});

test("lobby: quem cai perde o assento depois da graça, mas volta se reconectar a tempo", async () => {
  const { room, cs } = await lobby(["Ana", "Bia", "Caio"]);
  await waitFor(() => cs[0].players.length === 3);
  const [a, b] = cs;

  // Bia cai e volta com o token DENTRO da graça: mantém o assento.
  b.socket.close();
  await waitFor(() => a.players.find((p) => p.name === "Bia")?.connected === false);
  const b2 = client("Bia");
  const back = await b2.join(room, b.token);
  assert.equal(back.ok && back.you.id, b.id);

  // Caio cai e NÃO volta: some depois da graça (20s × escala).
  cs[2].socket.close();
  await waitFor(() => a.players.length === 2, 4000, "remoção após a graça");
  assert.ok(!a.players.some((p) => p.name === "Caio"));
});

// ── Início, config e privacidade ─────────────────────────────────────────────
test("só o host inicia e são necessários 2 jogadores", async () => {
  const { room, cs } = await lobby(["Ana"]);
  assert.equal((await cs[0].start()).ok, false); // sozinha
  const b = client("Bia");
  await b.join(room);
  assert.equal((await b.start()).ok, false); // não é host
  assert.equal((await cs[0].start()).ok, true);
});

test("config chega validada: texto vira padrão e valores absurdos são limitados", async () => {
  const { cs } = await startedGame(["Ana", "Bia"], {
    globalReactionTime: 3,
    turnTime: "abc" as unknown as number,
    choiceTime: 9999,
  });
  assert.equal(cs[0].view!.config.globalReactionTime, 3);
  assert.equal(cs[0].view!.config.turnTime, 45);
  assert.equal(cs[0].view!.config.choiceTime, 120);
  assert.equal(cs[0].view!.matchNumber, 1);
});

test("privacidade: ninguém vê as cartas ocultas dos outros", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  for (const viewer of cs) {
    for (const p of viewer.view!.players) {
      if (p.id === viewer.id) assert.ok(p.cards.every((k) => k.character !== null));
      else assert.ok(p.cards.every((k) => k.character === null), `${viewer.name} vê ${p.name}`);
    }
  }
});

test("estranho que chega com a partida em andamento entra como ESPECTADOR (não como jogador)", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const x = client("Intruso");
  const ack = await x.join(room);
  assert.equal(ack.ok, true);
  assert.equal(x.role, "spectator");
  assert.deepEqual(ack.ok && ack.players.map((p) => p.name), ["Ana", "Bia"], "a lista de jogadores não muda");
  await waitFor(() => cs[0].spectators.some((p) => p.id === x.id), 2000, "jogadores veem o espectador");
});

// ── Espectador ───────────────────────────────────────────────────────────────
// Coleta tudo que o espectador recebeu e garante que NENHUMA carta oculta nem a escolha
// da Troca vazou, em nenhuma das views (varre cada game_state do começo ao fim).
function assertNoHiddenLeak(c: Client, hiddenOwners: Client[] = []): void {
  assert.ok(c.states.length > 0, `${c.name} não recebeu nenhuma view`);
  for (const v of c.states) {
    assert.equal(v.exchange, null, `${c.name} recebeu a escolha da Troca`);
    for (const p of v.players) {
      if (hiddenOwners.some((h) => h.id === c.id && h.id === p.id)) continue; // a própria mão é dele
      for (const k of p.cards) {
        if (!k.revealed) assert.equal(k.character, null, `${c.name} viu carta oculta de ${p.name}`);
      }
    }
  }
}

test("espectador: entra no meio da partida e recebe só a view pública (nenhuma carta oculta)", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const vigia = client("Vigia");
  const ack = await vigia.join(room);
  assert.equal(ack.ok, true);
  assert.equal(vigia.role, "spectator");
  assert.ok(ack.ok && !ack.players.some((p) => p.id === vigia.id), "espectador não aparece como jogador");
  await waitFor(() => vigia.view !== null, 2000, "view do espectador");
  const v = vigia.view!;
  assert.equal(v.players.length, 2);
  assert.ok(v.players.every((p) => p.cards.every((k) => k.character === null)), "todas as cartas ocultas");
  assert.equal(v.exchange, null);
  assert.equal(v.phase, cs[0].view!.phase);

  // A partida anda e o espectador acompanha, sem nunca ver carta oculta.
  await cs[0].action("renda");
  await waitFor(() => vigia.view!.players.some((p) => p.coins === 3), 2000, "espectador viu a Renda");
  assertNoHiddenLeak(vigia);
  // Na 1ª view nada foi revelado nem alegado: o JSON inteiro não pode conter NENHUM personagem.
  assert.ok(!/"character":"/.test(JSON.stringify(vigia.states[0])), "a view inicial do espectador vaza personagem");
});

test("espectador: durante a TROCA não recebe as cartas compradas nem a escolha do ator", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const [a, b] = cs;
  const vigia = client("Vigia");
  await vigia.join(room);
  await waitFor(() => vigia.view !== null);
  assert.equal((await a.action("trocar")).ok, true);
  await waitFor(() => b.view!.phase === "janela_reacao_global");
  assert.equal((await b.pass()).ok, true);
  await waitFor(() => a.view!.phase === "aguardando_troca" && a.view!.exchange !== null, 3000, "Ana escolhendo a troca");
  assert.equal(a.view!.exchange!.pool.length, 4, "o ator vê as 4 cartas");
  await waitFor(() => vigia.view!.phase === "aguardando_troca");
  assert.equal(vigia.view!.exchange, null, "o espectador não vê o pool");
  assert.equal(b.view!.exchange, null, "nem o outro jogador");
  assertNoHiddenLeak(vigia);
});

test("espectador não age: ação, bloqueio, contestação, passar, revelar, passar automático e revanche são recusados", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const vigia = client("Vigia");
  await vigia.join(room);
  await waitFor(() => vigia.view !== null);
  const antes = JSON.stringify({ ph: cs[0].view!.phase, cur: cs[0].view!.currentPlayerId, c: cs[0].view!.players.map((p) => p.coins) });
  for (const ack of [
    await vigia.action("renda"),
    await vigia.action("taxas"),
    await vigia.block("duque"),
    await vigia.challenge(),
    await vigia.pass(),
    await vigia.reveal(0),
    await vigia.autopass(true),
    await vigia.rematch(),
    await vigia.start(),
  ]) {
    assert.equal(ack.ok, false, "espectador conseguiu agir");
  }
  await sleep(100);
  const depois = JSON.stringify({ ph: cs[0].view!.phase, cur: cs[0].view!.currentPlayerId, c: cs[0].view!.players.map((p) => p.coins) });
  assert.equal(depois, antes, "o estado da partida mudou por causa do espectador");
});

test("espectador: reconecta por token (mesmo id, continua espectador, sem duplicar)", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const v1 = client("Vigia");
  await v1.join(room);
  const id = v1.id;
  const token = v1.token;
  v1.socket.close();
  const v2 = client("Vigia");
  const ack = await v2.join(room, token);
  assert.equal(ack.ok, true);
  assert.equal(v2.role, "spectator");
  assert.equal(v2.id, id);
  await waitFor(() => v2.view !== null, 2000, "view após reconectar");
  await sleep(300);
  assert.equal(cs[0].spectators.filter((p) => p.id === id).length, 1, "não pode duplicar");
  // passada a graça (20s × 0,1), segue lá: voltou a tempo
  await sleep(2500);
  assert.ok(cs[0].spectators.some((p) => p.id === id && p.connected), "o espectador que voltou sumiu da lista");
});

test("espectador que cai e não volta sai da lista depois da graça (e não segura a sala)", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const vigia = client("Vigia");
  await vigia.join(room);
  await waitFor(() => cs[0].spectators.length === 1);
  vigia.socket.close();
  await waitFor(() => cs[0].spectators.every((p) => !p.connected), 2000, "marcado ausente");
  await waitFor(() => cs[0].spectators.length === 0, 4000, "removido após a graça");
  assert.equal(cs[0].players.length, 2, "os jogadores não foram afetados");
});

test("espectador sai de propósito: some na hora", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const vigia = client("Vigia");
  await vigia.join(room);
  await waitFor(() => cs[0].spectators.length === 1);
  vigia.leave();
  await waitFor(() => cs[0].spectators.length === 0, 1000, "saiu na hora");
});

test("sala cheia (6) no lobby: o 7º entra como espectador e a partida começa só com os 6", async () => {
  const { room, cs } = await lobby(["A", "B", "C", "D", "E", "F"]);
  const extra = client("Sobrando");
  const ack = await extra.join(room);
  assert.equal(ack.ok, true);
  assert.equal(extra.role, "spectator");
  assert.equal(extra.players.length, 6);
  assert.equal((await cs[0].start()).ok, true);
  await waitFor(() => cs.every((c) => c.view !== null) && extra.view !== null, 3000, "views");
  assert.equal(cs[0].view!.players.length, 6);
  assert.equal(extra.view!.players.length, 6);
  assert.ok(!extra.view!.players.some((p) => p.id === extra.id));
  assertNoHiddenLeak(extra);
});

test("lobby cheio abre vaga: o espectador sobe sozinho para jogador", async () => {
  const { room, cs } = await lobby(["A", "B", "C", "D", "E", "F"]);
  const extra = client("Sobrando");
  await extra.join(room);
  assert.equal(extra.role, "spectator");
  cs[5].leave(); // o último jogador sai de propósito
  await waitFor(() => extra.players.some((p) => p.id === extra.id), 2000, "espectador virou jogador");
  assert.equal(extra.spectators.length, 0);
  assert.equal(extra.players.length, 6);
  // e o token dele agora dá assento de jogador
  const again = client("Sobrando");
  const ack = await again.join(room, extra.token);
  assert.ok(ack.ok);
  assert.equal(again.role, "player");
  assert.equal(again.id, extra.id);
});

test("revanche: espectadores online viram jogadores e passam a ver a própria mão", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const vigia = client("Vigia");
  await vigia.join(room);
  await waitFor(() => vigia.view !== null);
  await playToEnd(cs);
  await waitFor(() => vigia.view!.phase === "fim_de_jogo", 2000, "espectador viu o fim");
  assertNoHiddenLeak(vigia);
  assert.equal((await vigia.rematch()).ok, false, "espectador não pede revanche");
  assert.equal((await cs[1].rematch()).ok, true);
  await waitFor(() => cs[0].view!.matchNumber === 2, 3000, "nova partida");
  await waitFor(() => vigia.players.some((p) => p.id === vigia.id), 2000, "espectador na lista de jogadores");
  await waitFor(() => vigia.view!.matchNumber === 2 && vigia.view!.players.length === 3, 3000, "view do ex-espectador");
  assert.equal(cs[0].view!.players.length, 3);
  assert.equal(vigia.spectators.length, 0);
  const mao = me(vigia).cards;
  assert.ok(mao.every((k) => k.character !== null), "agora ele vê a própria mão");
  for (const p of vigia.view!.players.filter((x) => x.id !== vigia.id)) {
    assert.ok(p.cards.every((k) => k.character === null), "mas não a dos outros");
  }
  // os outros jogadores também não veem a mão do novato
  assert.ok(cs[0].view!.players.filter((p) => p.id === vigia.id).every((p) => p.cards.every((k) => k.character === null)));
});

test("revanche com mais espectadores que vagas: respeita 6 jogadores, por ordem de chegada", async () => {
  const { room, cs } = await startedGame(["A", "B", "C", "D"]);
  const e1 = client("E1");
  const e2 = client("E2");
  const e3 = client("E3");
  for (const e of [e1, e2, e3]) {
    await e.join(room);
    await waitFor(() => e.view !== null);
  }
  await playToEnd(cs);
  assert.equal((await cs[0].rematch()).ok, true);
  await waitFor(() => cs[0].view!.matchNumber === 2, 3000, "nova partida");
  assert.equal(cs[0].view!.players.length, 6);
  const ids = cs[0].view!.players.map((p) => p.id);
  assert.ok(ids.includes(e1.id) && ids.includes(e2.id), "E1 e E2 chegaram primeiro");
  assert.ok(!ids.includes(e3.id), "E3 não cabe: segue espectador");
  await waitFor(() => e3.view!.matchNumber === 2, 3000, "E3 acompanha a nova partida");
  assert.ok(!e3.view!.players.some((p) => p.id === e3.id));
  assert.equal(e3.view!.players.length, 6);
  assertNoHiddenLeak(e3);
  await waitFor(() => e3.spectators.some((p) => p.id === e3.id), 2000, "E3 segue na lista de espectadores");
});


// ── Passar e relógio (F1/F3) ─────────────────────────────────────────────────
test("Passar: não reinicia o relógio e a janela fecha antes do tempo quando todos passam", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  const [a, b, c] = cs;
  const t0 = Date.now();
  assert.equal((await a.action("taxas")).ok, true);
  await waitFor(() => b.view!.phase === "janela_reacao_global");
  const before = b.view!.timer!.remainingMs;
  await sleep(150);
  assert.equal((await b.pass()).ok, true);
  await waitFor(() => b.view!.pending?.passedIds.includes(b.id) === true);
  assert.ok(b.view!.timer!.remainingMs < before - 100, "o relógio não pode reiniciar com um Passar");

  assert.equal((await b.pass()).ok, false, "passar duas vezes");
  assert.equal((await a.pass()).ok, false, "o ator não passa");
  assert.equal((await b.challenge()).ok, false, "quem passou não contesta");

  assert.equal((await c.pass()).ok, true);
  await waitFor(() => a.view!.phase === "aguardando_acao" && a.view!.currentPlayerId === b.id);
  assert.ok(Date.now() - t0 < 5 * 1000 * TIME_SCALE + 400, "fechou antes do timer da janela");
  assert.equal(coinsOf(a, a), 5); // Taxas resolveu
});

test("janela expira sozinha quando ninguém reage (timeout do servidor)", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  const [a] = cs;
  await a.action("taxas");
  await waitFor(() => a.view!.phase === "aguardando_acao" && coinsOf(a, a) === 5, 3000, "timeout da janela");
});

// ── Timeouts de turno (F2) ───────────────────────────────────────────────────
test("AFK: o turno estoura e o servidor joga Renda pelo jogador", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"], { turnTime: 15 });
  const [a, b] = cs;
  await waitFor(() => coinsOf(b, a) === 3, 4000, "Renda automática");
  assert.equal(b.view!.currentPlayerId, b.id);
});

// ── Reconexão (F4) ───────────────────────────────────────────────────────────
test("reconexão por token: mesmo assento, mesma mão, sem duplicar", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia", "Caio"]);
  const [a, b] = cs;
  const hand = JSON.stringify(me(b).cards);
  b.socket.close();
  await waitFor(() => a.players.find((p) => p.id === b.id)?.connected === false);
  const b2 = client("outro nome");
  const back = await b2.join(room, b.token);
  assert.equal(back.ok && back.you.id, b.id);
  await waitFor(() => b2.view !== null);
  assert.equal(JSON.stringify(b2.view!.players.find((p) => p.id === b.id)!.cards), hand);
  await waitFor(() => a.players.find((p) => p.id === b.id)?.connected === true, 2000, "Bia online de novo");
  assert.equal(a.players.length, 3); // sem duplicar o assento
});

test("sem token: reivindica o assento ausente pelo nome; não rouba o de quem está online", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const [a, b] = cs;
  const thief = client("Ana");
  // A Ana está online: o homônimo não rouba o assento dela, entra só como espectador.
  assert.equal((await thief.join(room)).ok, true);
  assert.equal(thief.role, "spectator");
  assert.notEqual(thief.id, a.id);
  assert.ok(a.players.some((p) => p.id === a.id && p.connected), "a Ana segue com o assento");
  b.socket.close();
  await waitFor(() => a.players.find((p) => p.id === b.id)?.connected === false);
  const b2 = client("BIA"); // maiúsculas não importam
  const back = await b2.join(room);
  assert.equal(back.ok && back.you.id, b.id);
});

test("ausente na vez dele: joga em ~5s (escalado), não nos 15s do turno", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"], { turnTime: 15 });
  const [a, b] = cs;
  const t0 = Date.now();
  a.socket.close(); // a Ana é a primeira a jogar
  await waitFor(() => coinsOf(b, a) === 3, 4000, "Renda do ausente");
  const waited = Date.now() - t0;
  assert.ok(waited < 15 * 1000 * TIME_SCALE * 0.75, `esperou ${waited}ms (turno cheio seria ${15000 * TIME_SCALE}ms)`);
});

test("todos caem: o jogo pausa; quando alguém volta o relógio é retomado", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const [a, b] = cs;
  a.socket.close();
  b.socket.close();
  await sleep(300);
  const back = client("Ana");
  await back.join(room, a.token);
  await waitFor(() => back.view !== null);
  assert.ok(back.view!.timer && back.view!.timer.remainingMs > 0);
});

// ── Contestação pública e revanche (F5/F6) ───────────────────────────────────
test("contestação é pública: todos veem quem contestou, o acusado e o veredito", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  const [a, b, c] = cs;
  assert.equal(c.view!.lastChallenge, null);
  await a.action("taxas");
  await waitFor(() => b.view!.phase === "janela_reacao_global");
  assert.equal((await b.challenge()).ok, true);
  await waitFor(() => [a, b, c].every((x) => x.view!.lastChallenge?.n === 1));
  const lc = c.view!.lastChallenge!;
  assert.equal(lc.challengerId, b.id);
  assert.equal(lc.accusedId, a.id);
  assert.equal(lc.claimed, "duque");
  assert.equal(typeof lc.accusedHadCard, "boolean");
});

// Joga Renda até 7 moedas e dá Golpe; revela a 1ª carta oculta. Até alguém vencer.
async function playToEnd(cs: Client[]): Promise<void> {
  const byId = new Map(cs.map((c) => [c.id, c]));
  for (let i = 0; i < 800 && cs[0].view!.phase !== "fim_de_jogo"; i++) {
    await sleep(8);
    const v = cs[0].view!;
    if (v.phase === "aguardando_acao") {
      const actor = byId.get(v.currentPlayerId!)!;
      const target = v.players.find((p) => p.id !== actor.id && !p.eliminated)!;
      if (me(actor).coins >= 7) await actor.action("golpe", target.id);
      else await actor.action("renda");
    } else if (v.phase === "aguardando_revelacao") {
      const who = byId.get(v.mustRevealPlayerId!)!;
      await who.reveal(me(who).cards.findIndex((k) => !k.revealed));
    }
  }
  assert.equal(cs[0].view!.phase, "fim_de_jogo", "a partida deveria terminar");
}

test("fim de partida: estatísticas refletem o que aconteceu (golpes = kills, perdas, recorde de moedas)", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  await playToEnd(cs);
  const v = cs[0].view!;
  const vencedor = v.stats[v.winnerId!];
  const perdedor = v.stats[cs.find((c) => c.id !== v.winnerId)!.id];
  assert.ok(vencedor.kills >= 2, "o vencedor deu os golpes que eliminaram o rival");
  assert.equal(perdedor.influenceLost, 2); // eliminado = perdeu as 2 cartas
  assert.ok(vencedor.maxCoins >= 7);
  const nomes = Object.fromEntries(v.players.map((p) => [p.id, p.name]));
  assert.ok(computeAwards(v.stats, nomes).some((a) => a.id === "carrasco"));
});

test("revanche: recusada antes do fim; depois, o vencedor começa e mantém os timers", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"], { globalReactionTime: 3 });
  assert.equal((await cs[0].rematch()).ok, false);
  await playToEnd(cs);
  const winner = cs[0].view!.winnerId!;
  assert.equal((await cs[1].rematch()).ok, true);
  await waitFor(() => cs[0].view!.matchNumber === 2);
  const v = cs[0].view!;
  assert.equal(v.phase, "aguardando_acao");
  assert.equal(v.currentPlayerId, winner);
  assert.ok(v.players.every((p) => p.coins === 2 && p.cards.every((k) => !k.revealed)));
  assert.equal(v.config.globalReactionTime, 3);
  assert.equal(v.lastChallenge, null);
  // estatísticas públicas chegaram a todos e a nova partida zera tudo
  assert.ok(v.stats[cs[0].id] && v.stats[cs[1].id] && v.stats[cs[2].id]);
  assert.ok(Object.values(v.stats).every((st) => st.kills === 0 && st.influenceLost === 0 && st.maxCoins === 2));
  // a revanche continua sem vazar cartas alheias
  assert.ok(cs[1].view!.players.filter((p) => p.id !== cs[1].id).every((p) => p.cards.every((k) => k.character === null)));
});

// ── Regressão: erros de regra voltam privados e não derrubam ninguém ──────────
test("ação fora da vez volta erro só para quem agiu", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  const [, b] = cs;
  const ack = await b.action("renda");
  assert.equal(ack.ok, false);
});

// ── 4.7: passar automático ───────────────────────────────────────────────────
test("passar automático: com todos ligados, Taxas resolve na hora, sem esperar o timer da janela", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  const [a, b, c] = cs;
  assert.equal((await b.autopass(true)).ok, true);
  assert.equal((await c.autopass(true)).ok, true);
  const t0 = Date.now();
  await a.action("taxas");
  await waitFor(() => coinsOf(a, a) === 5, 3000, "Taxas resolvida");
  assert.ok(Date.now() - t0 < 5 * 1000 * TIME_SCALE * 0.5, "deveria fechar bem antes do timer da janela");
  assert.equal(a.view!.currentPlayerId, b.id);
});

test("passar automático: o ALVO não é passado sozinho (ele quer decidir)", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  const [a, b, c] = cs;
  await b.autopass(true);
  await c.autopass(true);
  // Ana precisa de 3 moedas: dois turnos de Renda antes (Ana, Bia, Caio, Ana...)
  await a.action("renda");
  await waitFor(() => a.view!.currentPlayerId === b.id);
  await b.action("renda");
  await waitFor(() => a.view!.currentPlayerId === c.id);
  await c.action("renda");
  await waitFor(() => a.view!.currentPlayerId === a.id);
  assert.equal((await a.action("assassinar", b.id)).ok, true);
  // Caio passa sozinho; Bia (alvo) continua com a janela aberta e a escolha na mão.
  await waitFor(() => a.view!.pending?.passedIds.includes(c.id) === true, 2000, "Caio passou sozinho");
  assert.equal(a.view!.phase, "janela_reacao_vitima");
  assert.equal(a.view!.pending!.passedIds.includes(b.id), false);
});

test("passar automático: ligar no meio da janela já vale, e desligar volta ao normal", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  const [a, b] = cs;
  await a.action("taxas");
  await waitFor(() => b.view!.phase === "janela_reacao_global");
  assert.equal((await b.autopass(true)).ok, true);
  await waitFor(() => a.view!.phase === "aguardando_acao" && coinsOf(a, a) === 5, 2000, "passou ao ligar");
  assert.equal((await b.autopass(false)).ok, true);
  await b.action("renda");
  await a.action("taxas");
  await waitFor(() => a.view!.phase === "janela_reacao_global");
  await sleep(150);
  assert.equal(a.view!.pending!.passedIds.length, 0); // desligado: não passou sozinho
});

test("passar automático: valor inválido é recusado", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  const ack = await new Promise<GameActionAck>((res) =>
    cs[0].socket.emit("game_autopass", { enabled: "sim" } as never, res),
  );
  assert.equal(ack.ok, false);
});

// ── Placar da noite, títulos e medição (P23: R1, R2, R3, R7) ─────────────────
const lastScore = (c: Client) => c.scores[c.scores.length - 1];

test("placar: quem entra recebe room:score vazio (nenhuma partida ainda)", async () => {
  const { cs } = await lobby(["Ana", "Bia"]);
  await waitFor(() => cs.every((c) => c.scores.length >= 1), 3000, "room:score no join");
  assert.deepEqual(lastScore(cs[0]), { matches: 0, lastWinnerId: null, rows: [], titles: [] });
});

test("placar: ao fim da partida a sala inteira recebe a vitória, e o payload não tem nenhuma carta", async () => {
  const { cs } = await startedGame(["Ana", "Bia"]);
  const antes = cs.map((c) => c.scores.length);
  await playToEnd(cs);
  await waitFor(() => cs.every((c, i) => c.scores.length > antes[i]), 3000, "room:score no fim");
  const winner = cs[0].view!.winnerId!;
  for (const c of cs) {
    const sc = lastScore(c);
    assert.equal(sc.matches, 1);
    assert.equal(sc.lastWinnerId, winner);
    assert.deepEqual(
      sc.rows.map((r) => [r.id, r.wins, r.played]).sort(),
      cs.map((x) => [x.id, x.id === winner ? 1 : 0, 1]).sort(),
    );
    const json = JSON.stringify(sc);
    assert.ok(!/"cards"|"character"|duque|assassino|capitao|embaixador|condessa/.test(json), "payload sem cartas");
    // o vencedor deu golpes: é o Carrasco da noite
    assert.ok(sc.titles.some((t) => t.id === "carrasco" && t.leaders.some((l) => l.id === winner)));
  }
  // Um único room:score por fim de partida (não repete com os broadcasts seguintes).
  await sleep(150);
  assert.equal(cs[0].scores.length, antes[0] + 1);
});

test("placar acumula na revanche (vitórias e títulos) e reconexão recebe o placar atual", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  await playToEnd(cs);
  await waitFor(() => lastScore(cs[0])?.matches === 1);
  assert.equal((await cs[0].rematch()).ok, true);
  await waitFor(() => cs[0].view!.matchNumber === 2 && cs[0].view!.phase === "aguardando_acao");
  await playToEnd(cs);
  await waitFor(() => lastScore(cs[1])?.matches === 2, 3000, "placar da 2ª partida");
  const sc = lastScore(cs[1]);
  assert.equal(sc.rows.reduce((n, r) => n + r.wins, 0), 2);
  assert.ok(sc.rows.every((r) => r.played === 2));
  assert.ok(sc.titles.every((t) => t.count >= 1 && t.leaders.length >= 1));

  // Reconexão (token): quem volta recebe o placar atual sem esperar outra partida.
  const back = client("Ana");
  await back.join(room, cs[0].token);
  await waitFor(() => back.scores.length >= 1, 3000, "room:score na reconexão");
  assert.deepEqual(lastScore(back), sc);
});

test("placar: espectador que vira jogador na revanche mantém o id e passa a pontuar", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  const caio = client("Caio");
  assert.equal((await caio.join(room)).ok, true);
  assert.equal(caio.role, "spectator");
  await playToEnd(cs);
  await waitFor(() => lastScore(caio)?.matches === 1, 3000, "espectador vê o placar");
  assert.ok(!lastScore(caio).rows.some((r) => r.id === caio.id), "espectador ainda não jogou");
  assert.equal((await cs[0].rematch()).ok, true);
  await waitFor(() => caio.view?.matchNumber === 2);
  await playToEnd([...cs, caio]);
  await waitFor(() => lastScore(caio)?.matches === 2, 3000, "placar da 2ª partida");
  const row = lastScore(caio).rows.find((r) => r.id === caio.id)!;
  assert.equal(row.played, 1);
  assert.equal(row.name, "Caio");
});

test("sala apagada leva o placar junto: sala nova com o mesmo código começa do zero", async () => {
  const { room, cs } = await startedGame(["Ana", "Bia"]);
  await playToEnd(cs);
  await waitFor(() => lastScore(cs[0])?.matches === 1);
  const { getRoom, deleteRoom } = await import("./rooms");
  assert.equal(getRoom(room)!.scoreboard.matches, 1);
  deleteRoom(room);
  assert.equal(getRoom(room), undefined);
  const novo = client("Zeca");
  assert.equal((await novo.join(room)).ok, true);
  await waitFor(() => novo.scores.length >= 1);
  assert.deepEqual(lastScore(novo), { matches: 0, lastWinnerId: null, rows: [], titles: [] });
});

test("medição: match_start, match_end (vencedor, nº, jogadores, duração) e rematch_request viram linhas JSON", async () => {
  const { room, cs } = await lobby(["Ana", "Bia", "Caio"]);
  const minhas = () => logs.filter((l) => l.roomId === room);
  clock = 1_000_000;
  assert.equal((await cs[0].start()).ok, true);
  await waitFor(() => cs.every((c) => c.view !== null));
  assert.deepEqual(minhas().map((l) => l.evt), ["match_start"]);
  assert.equal(minhas()[0].match, 1);
  assert.equal(minhas()[0].players, 3);

  clock = 1_000_000 + 83_000;
  await playToEnd(cs);
  await waitFor(() => minhas().some((l) => l.evt === "match_end"), 3000, "match_end");
  const fim = minhas().find((l) => l.evt === "match_end")!;
  assert.ok(fim.evt === "match_end");
  assert.equal(fim.match, 1);
  assert.equal(fim.players, 3);
  assert.equal(fim.winnerId, cs[0].view!.winnerId);
  assert.equal(fim.winnerName, cs.find((c) => c.id === fim.winnerId)!.name);
  assert.equal(fim.durationMs, 83_000);
  // serializa em UMA linha JSON com `evt`
  const linha = JSON.stringify(fim);
  assert.ok(!linha.includes("\n"));
  assert.equal(JSON.parse(linha).evt, "match_end");

  assert.equal((await cs[1].rematch()).ok, true);
  await waitFor(() => cs[0].view!.matchNumber === 2);
  assert.deepEqual(minhas().map((l) => l.evt), ["match_start", "match_end", "rematch_request", "match_start"]);
  const rev = minhas()[2];
  assert.ok(rev.evt === "rematch_request");
  assert.equal(rev.rematches, 1);
  assert.equal(rev.match, 2);
  assert.equal(minhas()[3].match, 2);

  // Revanche recusada (antes do fim) NÃO gera log.
  const n = minhas().length;
  assert.equal((await cs[1].rematch()).ok, false);
  assert.equal(minhas().length, n);
});

test("R2 revanche sem atrito: um clique de qualquer jogador, sem confirmação, e o vencedor abre a próxima", async () => {
  const { cs } = await startedGame(["Ana", "Bia", "Caio"]);
  await playToEnd(cs);
  const winner = cs[0].view!.winnerId!;
  const perdedor = cs.find((c) => c.id !== winner)!;
  assert.equal((await perdedor.rematch()).ok, true); // quem perdeu também pode pedir
  await waitFor(() => cs.every((c) => c.view!.matchNumber === 2));
  assert.ok(cs.every((c) => c.view!.currentPlayerId === winner && c.view!.phase === "aguardando_acao"));
});
