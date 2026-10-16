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
  ServerToClientEvents,
} from "../types/socket";

const TIME_SCALE = 0.1; // 15s de turno = 1,5s; 5s de janela = 0,5s; graça de 20s = 2s

let httpServer: HttpServer;
let io: GameIO;
let url: string;
const open: Client[] = [];

before(async () => {
  httpServer = createServer();
  io = new Server(httpServer);
  attachGameSocket(io, { timeScale: TIME_SCALE });
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
  players: Player[];
  join(room: string, token?: string): Promise<JoinRoomAck>;
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
    players: [],
    join: (room, token) =>
      new Promise((res) =>
        socket.emit("room:join", { roomId: room, name, token }, (ack) => {
          if (ack.ok) {
            c.id = ack.you.id;
            c.token = ack.you.token;
          }
          res(ack);
        }),
      ),
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
  socket.on("game_state", (v) => (c.view = v));
  socket.on("room:players", (p) => (c.players = p));
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

test("estranho não entra numa partida em andamento", async () => {
  const { room } = await startedGame(["Ana", "Bia"]);
  const x = client("Intruso");
  const ack = await x.join(room);
  assert.equal(ack.ok, false);
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
  assert.equal((await thief.join(room)).ok, false); // a Ana está online
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
