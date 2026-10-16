// E2E no NAVEGADOR (Chrome real, servidor de produção real). Cada aba é um jogador.
// Cliques são de mouse e falham se algo estiver cobrindo o alvo; qualquer console.error
// ou exceção reprova. Rodar: npm run test:e2e
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { Browser, type Page } from "./helpers/browser";
import { startServer, type TestServer } from "./helpers/server";

let server: TestServer;
let browser: Browser;
const pages: Page[] = [];

before(async () => {
  server = await startServer();
  browser = await Browser.launch();
});

after(async () => {
  for (const p of pages) p.close();
  await browser.close();
  server.stop();
});

let seq = 0;
const room = () => `E${Date.now().toString(36).slice(-3).toUpperCase()}${seq++}`;

async function open(path: string, size?: { w: number; h: number }): Promise<Page> {
  const p = await browser.open(`${server.url}${path}`, size);
  pages.push(p);
  return p;
}

/** Cria a sala com os jogadores (o 1º é o host), inicia a partida e espera o dock. */
async function game(names: string[], size?: { w: number; h: number }): Promise<{ id: string; ps: Page[] }> {
  const id = room();
  const ps: Page[] = [];
  for (const n of names) {
    const p = await open(`/room/${id}?name=${n}`, size);
    await p.waitText(`${n} (você)`);
    ps.push(p);
  }
  await ps[0].waitText(names[names.length - 1]);
  await ps[0].click("button", "Iniciar jogo");
  for (const p of ps) await p.waitFor(`document.querySelector('[data-testid="dock"]')`, "dock da mesa");
  return { id, ps };
}

// Lê o valor REAL (data-coins): o número na tela é animado (rAF) e congela em aba em segundo plano.
const waitCoins = (p: Page, name: string, n: number) =>
  p.waitFor(`document.querySelector('[data-seat="${name}"]')?.getAttribute('data-coins') === "${n}"`, `${name} com ${n} moedas`);
const noErrors = (...ps: Page[]) => {
  for (const p of ps) assert.deepEqual(p.errors, [], `erros no navegador: ${p.errors.join(" | ")}`);
};

/** Problemas de layout: assento cortado, assento sobre o dock, assentos sobrepostos. */
async function layoutIssues(p: Page): Promise<string[]> {
  return p.eval<string[]>(`(() => {
    const issues = [];
    const dock = document.querySelector('[data-testid="dock"]').getBoundingClientRect();
    const seats = [...document.querySelectorAll('[data-seat]')].map(e => ({ n: e.getAttribute('data-seat'), r: e.getBoundingClientRect() }));
    for (const s of seats) {
      if (s.r.left < 0 || s.r.top < 0 || s.r.right > innerWidth) issues.push(s.n + ' fora da tela');
      if (s.r.bottom > dock.top + 0.5) issues.push(s.n + ' invade o dock (' + Math.round(s.r.bottom) + ' > ' + Math.round(dock.top) + ')');
    }
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i].r, b = seats[j].r;
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) issues.push(seats[i].n + ' sobrepõe ' + seats[j].n);
    }
    if (dock.bottom > innerHeight + 0.5) issues.push('dock cortado');
    return issues;
  })()`);
}

// ── O próprio detector precisa funcionar ─────────────────────────────────────
test("meta: o driver captura console.error e exceções (os 'zero erros' dos outros testes valem)", async () => {
  const p = await open(`/room/${room()}?name=Ana`);
  await p.waitText("Sala de espera");
  assert.deepEqual(p.errors, []);
  await p.eval(`console.error("falha-de-teste"); setTimeout(() => { throw new Error("excecao-de-teste"); }, 0);`);
  await p.waitFor(`true`, "assentar");
  await new Promise((r) => setTimeout(r, 300));
  const capturados: string[] = [...p.errors]; // cópia tipada (o deepEqual acima estreita o tipo)
  assert.ok(capturados.some((e) => e.includes("falha-de-teste")), "console.error não foi capturado");
  assert.ok(capturados.some((e) => e.includes("excecao-de-teste")), "exceção não foi capturada");
});

// ── Lobby ────────────────────────────────────────────────────────────────────
test("lobby: o host vê a sala, a tela de tempos e nenhum erro", async () => {
  const p = await open(`/room/${room()}?name=Ana`);
  await p.waitText("Sala de espera");
  await p.waitText("Ana (você)");
  await p.waitText("Tempos da partida");
  noErrors(p);
});

test("sem nome na URL volta para o menu (sem tela de erro)", async () => {
  const p = await open(`/room/ABCDE`);
  await p.waitFor(`location.pathname === "/"`, "redirecionar ao menu");
  assert.ok(!(await p.text()).includes("couldn't load"));
  noErrors(p);
});

// ── Partida jogada pela interface ────────────────────────────────────────────
test("uma rodada completa clicando: Renda, Taxas com Passar, Assassinar com mira e revelar", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;

  // Ana (da vez) joga Renda pelo botão fixo.
  await a.click('[data-zone="basicas"] button', "Renda");
  await waitCoins(a, "Ana", 3);

  // Bia declara Taxas clicando na carta do Barão. Ana vê a placa e reage com Passar.
  await b.click('[data-zone="centro"] [title="Barão do Café"]');
  await a.waitFor(`document.querySelector('[data-testid="claim-plate"]')?.innerText.includes("Bia · Taxas")`, "placa 'Bia · Taxas'");
  await a.click('[data-zone="reacoes"] button', "Passar");
  await waitCoins(b, "Bia", 5);

  // Vez da Ana com 3 moedas: clica na carta do Capoeira (Assassinar) → mira nos alvos.
  await a.click('[data-zone="centro"] [title="Capoeira"]');
  await a.waitFor(`document.querySelector('[data-seat="Bia"][data-target="sim"]')`, "mira em Bia");
  await a.key("Escape"); // cancelar
  await a.waitFor(`!document.querySelector('[data-target="sim"]')`, "mira cancelada com Esc");
  await a.click('[data-zone="centro"] [title="Capoeira"]');
  await a.click('[data-seat="Bia"]'); // escolhe o alvo clicando no assento

  // Bia (alvo) vê Contestar / Bloquear / Passar e passa → precisa revelar.
  await b.waitFor(`document.querySelector('[data-testid="claim-plate"]')?.innerText.includes("Ana · Assassinar")`, "placa do assassinato");
  const reacoes = await b.eval<string>(`document.querySelector('[data-zone="reacoes"]').innerText`);
  assert.match(reacoes, /Contestar/);
  assert.match(reacoes, /Bloquear/);
  assert.match(reacoes, /Passar/);
  await b.click('[data-zone="reacoes"] button', "Passar");

  // Revelar: o centro do dock mostra SÓ as 2 cartas dela, pulsando; clicar revela.
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] .urgent-pulse').length === 2`, "2 cartas pulsando para revelar");
  await b.click('[data-zone="centro"] .urgent-pulse [title]');
  await a.waitFor(`document.querySelectorAll('[data-seat="Bia"] [title]').length === 1`, "carta revelada visível na mesa");
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 5`, "mão normal de volta");

  noErrors(a, b);
});

test("ações do dock ficam desabilitadas fora da vez (e o clique falha de propósito)", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [, b] = ps;
  await assert.rejects(() => b.click('[data-zone="basicas"] button', "Renda"), /desabilitado/);
  noErrors(b);
});

// ── Selos de ação (4.2) ──────────────────────────────────────────────────────
const estados = (p: Page) =>
  p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-zone="basicas"] .seal')].map(e => e.getAttribute('data-state')))`);

test("selos: estados certos para quem joga e para quem espera; nenhuma imagem quebrada", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  // Ana (da vez, 2 moedas): Renda e Ajuda prontas, Golpe travado (custa 7). Bia: tudo apagado.
  await a.waitFor(`document.querySelectorAll('[data-zone="basicas"] .seal').length === 3`, "3 selos");
  assert.deepEqual(JSON.parse(await estados(a)), ["ready", "ready", "locked"]);
  assert.deepEqual(JSON.parse(await estados(b)), ["off", "off", "off"]);
  for (const p of [a, b]) {
    await p.waitFor(
      `[...document.querySelectorAll('[data-zone="basicas"] .seal img')].length >= 3 && [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0)`,
      "todas as imagens carregadas",
    );
  }
  // Selo apagado/travado não aceita clique.
  await assert.rejects(() => a.click('[data-zone="basicas"] .seal', "Golpe"), /desabilitado/);
  noErrors(a, b);
});

test("reação: a bandeja usa selos (Contestar/Passar) e some depois de passar", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="centro"] [title="Barão do Café"]'); // Taxas
  await b.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "Contestar e Passar");
  await b.click('[data-zone="reacoes"] .seal', "Passar");
  await b.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 0`, "bandeja vazia");
  noErrors(a, b);
});

test("página /dev/selos: 5 estados × 4 selos, ícones e fallback de emoji sem erros", async () => {
  const p = await open("/dev/selos");
  await p.waitFor(`document.querySelectorAll('[data-testid="selos"] .seal').length === 20`, "20 selos");
  // contestar/assassinar ainda não têm arte → emoji; os 10 existentes carregam.
  await p.waitFor(`[...document.querySelectorAll('[data-testid="icones"] img')].every(i => i.complete && i.naturalWidth > 0)`, "ícones carregados");
  const semArte = await p.eval<number>(`[...document.querySelectorAll('[data-testid="icones"] > div')].filter(d => d.innerText.includes("(emoji)")).length`);
  assert.equal(semArte, 2);
  noErrors(p);
});

// ── Rapidez (4.7) ────────────────────────────────────────────────────────────
test("atalhos: Espaço passa e C contesta (teclado real, sem clicar)", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="centro"] [title="Barão do Café"]'); // Taxas
  await b.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "bandeja da Bia");
  // os selos mostram a tecla de atalho
  assert.match(await b.eval<string>(`document.querySelector('[data-zone="reacoes"]').innerText`), /Espaço/);
  await b.key(" ");
  await waitCoins(a, "Ana", 5); // a Taxas resolveu porque a Bia passou pelo teclado

  await b.click('[data-zone="centro"] [title="Barão do Café"]'); // vez da Bia: Taxas
  await a.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "bandeja da Ana");
  await a.key("c"); // Ana contesta pelo teclado
  await a.waitFor(`document.body.innerText.includes("CONTESTADO!")`, "selo de contestação");
  await b.waitFor(`document.body.innerText.includes("CONTESTADO!")`, "selo para todos");
  noErrors(a, b);
});

test("passar automático: com o interruptor ligado a jogada alheia resolve sem a pessoa agir", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await b.click('[data-testid="autopass"]'); // liga o interruptor da Bia
  await b.waitFor(`document.querySelector('[data-testid="autopass"] input').checked`, "interruptor ligado");
  await a.click('[data-zone="centro"] [title="Barão do Café"]'); // Taxas
  await waitCoins(a, "Ana", 5); // resolveu sozinho: a Bia não clicou em nada
  assert.ok(!(await b.text()).includes("CONTESTADO!"));
  noErrors(a, b);
});

// ── Fim de partida (4.8) ─────────────────────────────────────────────────────
test("tela de vitória: vencedor, prêmios corretos e botão de revanche (página de revisão)", async () => {
  const p = await open("/dev/mesa?fase=fim&n=4");
  await p.waitFor(`document.querySelector('[data-testid="victory"]')`, "tela de vitória");
  const txt = await p.eval<string>(`document.querySelector('[data-testid="victory"]').innerText`);
  assert.match(txt, /Ana vence!/);
  const premios = await p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-award]')].map(e => e.getAttribute('data-award') + ':' + e.innerText.replace(/\\s+/g,' ')))`);
  const lista = JSON.parse(premios) as string[];
  assert.ok(lista.some((l) => l.startsWith("mentiroso:") && l.includes("Bia") && l.includes("3 vezes")), premios);
  assert.ok(lista.some((l) => l.startsWith("desconfiado:") && l.includes("Ana")), premios);
  assert.ok(lista.some((l) => l.startsWith("olho_de_lince:") && l.includes("Ana") && l.includes("3 de 4")), premios);
  assert.ok(lista.some((l) => l.startsWith("carrasco:") && l.includes("Ana")), premios);
  assert.ok(lista.some((l) => l.startsWith("ricaco:") && l.includes("11")), premios);
  await p.click('[data-testid="victory"] .seal', "Jogar de novo"); // o clique não pode estar coberto
  noErrors(p);
});

// ── F5 e blefe ───────────────────────────────────────────────────────────────
const mao = (p: Page) =>
  p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-zone="centro"] [title]')].map(e => e.getAttribute('title') + ((e.innerText.includes('🎭') || !!e.querySelector('img[src*="mascara"]')) ? ':blefe' : ':minha')))`);

test("F5 no meio da partida mantém o assento e a mesma mão", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [, b] = ps;
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 5`, "mão com 5 cartas");
  const antes = await mao(b);
  await b.reload();
  await b.waitText("Bia (você)");
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 5`, "mão depois do F5");
  assert.equal(await mao(b), antes);
  noErrors(b);
});

test("blefe: só as cartas que eu NÃO tenho recebem a máscara", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  await ps[0].waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 5`, "mão");
  const m = JSON.parse(await mao(ps[0])) as string[];
  const minhas = m.filter((x) => x.endsWith(":minha")).length;
  const blefe = m.filter((x) => x.endsWith(":blefe")).length;
  assert.ok(minhas >= 1 && minhas <= 2, `minhas=${minhas}`); // 2 cartas (podem ser iguais)
  assert.equal(minhas + blefe, 5);
});

// ── Layout ───────────────────────────────────────────────────────────────────
for (const n of [2, 3, 4, 5, 6]) {
  test(`layout 1280×720 com ${n} jogadores: nada cortado, sobreposto nem invadindo o dock`, async () => {
    const names = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"].slice(0, n);
    const { ps } = await game(names, { w: 1280, h: 720 });
    for (const p of ps) await p.waitFor(`document.querySelectorAll('[data-seat]').length === ${n}`, "todos os assentos");
    assert.deepEqual(await layoutIssues(ps[0]), []);
    noErrors(...ps);
  });
}

test("layout 1920×1080 com 6 jogadores", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"], { w: 1920, h: 1080 });
  await ps[0].waitFor(`document.querySelectorAll('[data-seat]').length === 6`, "6 assentos");
  assert.deepEqual(await layoutIssues(ps[0]), []);
  noErrors(...ps);
});

// ── Páginas de revisão não podem quebrar ─────────────────────────────────────
for (const path of ["/dev/cartas", "/dev/mesa", "/dev/mesa?fase=reacao&n=6", "/dev/mesa?fase=revelar&n=3", "/dev/mesa?fase=troca&n=2", "/dev/mesa?fase=fim&n=4", "/dev/mesa?fase=contestar&n=4"]) {
  test(`página de revisão ${path} renderiza sem erros`, async () => {
    const p = await open(path);
    await p.waitFor(`document.body.innerText.length > 40`, "conteúdo");
    await new Promise((r) => setTimeout(r, 600)); // deixa efeitos/cargas de imagem assentarem
    assert.ok(!(await p.text()).includes("couldn't load"));
    noErrors(p);
  });
}
