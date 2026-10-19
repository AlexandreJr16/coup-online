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

async function open(path: string, size?: { w: number; h: number }, opts?: { reducedMotion?: boolean }): Promise<Page> {
  const p = await browser.open(`${server.url}${path}`, size, opts);
  pages.push(p);
  return p;
}

/** Cria a sala com os jogadores (o 1º é o host), inicia a partida e espera o dock. */
async function game(
  names: string[],
  size?: { w: number; h: number },
  opts?: { reducedMotion?: boolean },
): Promise<{ id: string; ps: Page[] }> {
  const id = room();
  const ps: Page[] = [];
  for (const n of names) {
    const p = await open(`/room/${id}?name=${n}`, size, opts);
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
    const feed = document.querySelector('[data-feed]');
    if (feed) {
      const f = feed.getBoundingClientRect();
      for (const s of seats) {
        if (s.r.left < f.right && f.left < s.r.right && s.r.top < f.bottom && f.top < s.r.bottom) issues.push('feed de Intrigas cobre ' + s.n);
      }
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
  await a.waitFor(`document.querySelector('[data-seat="Bia"] [data-testid="claim-plate"]')?.innerText.includes("Taxas")`, "balão 'Taxas' sobre a Bia");
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
  await b.waitFor(`document.querySelector('[data-seat="Ana"] [data-testid="claim-plate"]')?.innerText.includes("Assassinar")`, "balão do assassinato");
  const reacoes = await b.eval<string>(`document.querySelector('[data-zone="reacoes"]').innerText`);
  assert.match(reacoes, /Contestar/);
  assert.ok(await b.eval<boolean>(`!!document.querySelector('[data-zone="reacoes"] [title^="Bloquear com"]')`), "selo de bloqueio na bandeja");
  assert.match(reacoes, /Passar/);
  await b.click('[data-zone="reacoes"] button', "Passar");

  // Revelar: o centro do dock mostra SÓ as 2 cartas dela, pulsando; clicar revela.
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] .urgent-pulse').length === 2`, "2 cartas pulsando para revelar");
  await b.click('[data-zone="centro"] .urgent-pulse [title]');
  await a.waitFor(`document.querySelectorAll('[data-seat="Bia"] [data-card] [title]').length === 1`, "carta revelada visível na mesa");
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
  // todos os ícones têm arte (a de contestar veio do P05); nenhum cai no fallback de emoji.
  await p.waitFor(`[...document.querySelectorAll('[data-testid="icones"] img')].every(i => i.complete && i.naturalWidth > 0)`, "ícones carregados");
  const semArte = await p.eval<number>(`[...document.querySelectorAll('[data-testid="icones"] > div')].filter(d => d.innerText.includes("(emoji)")).length`);
  assert.equal(semArte, 0);
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

  // espera a mão da Bia ficar ativa (a vez chega pelo servidor): clicar antes não faz nada
  await b.waitFor(`document.querySelector('[data-zone="centro"] .hand-card.can-act')`, "vez da Bia");
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

// ── A jogada na mesa e o arrastar (4.3) ─────────────────────────────────────
test("arrastar: o poder vai até o oponente (assassinar) e a carta jogada aparece na mesa", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="basicas"] .seal', "Renda");
  await waitCoins(a, "Ana", 3);
  await b.click('[data-zone="basicas"] .seal', "Renda");
  await waitCoins(b, "Bia", 3);

  // Ana arrasta a carta do Capoeira até o assento da Bia. Durante o arrasto o fantasma existe.
  await a.drag('[data-zone="centro"] [title="Capoeira"]', '[data-seat="Bia"]');
  await b.waitFor(`document.querySelector('[data-seat="Ana"] [data-testid="claim-plate"]')?.innerText.includes("Assassinar")`, "balão da jogada sobre a Ana");
  // o alvo aparece no balão como retrato (a mesa não precisa de texto para dizer contra quem)
  assert.ok(await b.eval<boolean>(`!!document.querySelector('[data-seat="Ana"] [data-testid="claim-plate"] img[alt="Alvo: Bia"]')`), "retrato do alvo no balão");
  await a.waitFor(`!document.querySelector('[data-testid="drag-ghost"]') && !document.querySelector('[data-target="sim"]')`, "arrasto encerrado");
  noErrors(a, b);
});

test("arrastar: poder sem alvo é declarado soltando na mesa; soltar no dock cancela", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  // soltar de volta no dock: nada acontece
  await a.drag('[data-zone="centro"] [title="Barão do Café"]', '[data-zone="basicas"]');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await a.eval<boolean>(`!!document.querySelector('[data-testid="claim-plate"]')`), false);
  assert.equal(await a.eval<boolean>(`!document.querySelector('[data-testid="drag-ghost"]')`), true);
  // soltar sobre a mesa: declara Taxas
  await a.drag('[data-zone="centro"] [title="Barão do Café"]', '[data-erario]');
  await b.waitFor(`document.querySelector('[data-seat="Ana"] [data-testid="claim-plate"]')?.innerText.includes("Taxas")`, "Taxas declarada");
  noErrors(a, b);
});

test("mesa: Erário e baralho têm lugar fixo e a contagem do baralho é a real", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"]);
  await ps[0].waitFor(`document.querySelector('[data-erario]') && document.querySelector('[data-deck]')`, "Erário e baralho");
  const deck = await ps[0].eval<string>(`document.querySelector('[data-deck]').innerText`);
  assert.match(deck, /19\s*corte/i); // 25 − 3×2
  noErrors(...ps);
});

test("fichas: assento e Erário mostram sprites carregados de verdade (P07.S4)", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"]);
  await ps[0].waitFor(
    `(() => { const im = [...document.querySelectorAll('[data-chip-pile] img')]; return im.length >= 3 && im.every(i => i.complete); })()`,
    "pilhas de fichas na mesa, com as imagens terminadas de carregar",
  );
  const quebradas = await ps[0].eval<number>(
    `[...document.querySelectorAll('[data-chip-pile] img')].filter(i => !i.complete || i.naturalWidth === 0).length`,
  );
  assert.equal(quebradas, 0);
  // P07.S6: passar o mouse mostra o número exato; ninguém começa com fantasma nem aviso de Golpe.
  assert.equal(await ps[0].eval<string>(`document.querySelector('[data-seat="Ana"] [data-chip-pile]').title`), "2 fichas");
  assert.equal(await ps[0].eval<number>(`document.querySelectorAll('[data-chip-ghost], [data-testid="selo-alvo"]').length`), 0);
  noErrors(...ps);
});

test("dock: sem fundo de largura total e com alvos de pelo menos 40px (P09.S1, S5)", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const r = await ps[0].eval<{ fundo: string; pequenos: string[] }>(`(() => {
    const dock = document.querySelector('[data-testid="dock"]');
    const alvos = [...dock.querySelectorAll('button:not([disabled]), label')];
    return {
      fundo: getComputedStyle(dock).backgroundColor + '|' + getComputedStyle(dock).backgroundImage,
      pequenos: alvos.filter(a => a.getBoundingClientRect().height < 40).map(a => a.tagName + ':' + a.innerText.slice(0, 20)),
    };
  })()`);
  assert.equal(r.fundo, "rgba(0, 0, 0, 0)|none");
  assert.deepEqual(r.pequenos, []);
  noErrors(...ps);
});

test("dock: variações cavalete e bandeja pintam só a parte necessária, sem largura total (P27.S5)", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const p = ps[0];
  const medir = () => p.eval<{ dockW: number; fundo: string; vw: number; centro: string }>(`(() => {
    const d = document.querySelector('[data-testid="dock"]');
    return { dockW: d.getBoundingClientRect().width, vw: innerWidth, fundo: getComputedStyle(d).backgroundColor,
      centro: getComputedStyle(d.querySelector('[data-zone="centro"]')).backgroundColor };
  })()`);
  await p.eval(`document.documentElement.setAttribute('data-dock', 'bandeja')`);
  const b = await medir();
  assert.notEqual(b.fundo, "rgba(0, 0, 0, 0)");
  assert.ok(b.dockW < b.vw - 8, "a bandeja não pode ocupar a largura toda");
  await p.eval(`document.documentElement.setAttribute('data-dock', 'cavalete')`);
  const c = await medir();
  assert.equal(c.fundo, "rgba(0, 0, 0, 0)");
  assert.notEqual(c.centro, "rgba(0, 0, 0, 0)");
  assert.deepEqual(await layoutIssues(p), []);
  noErrors(...ps);
});

// ── Animações de baralho (4.4) ───────────────────────────────────────────────
/** Conta quantas moedas voadoras já foram criadas na camada (e quantas ainda estão no ar). */
const espiarMoedas = (p: Page) =>
  p.eval(`(() => {
    window.__voos = 0;
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.hasAttribute('data-coin-fly')) window.__voos++; })))
      .observe(document.querySelector('[data-testid="coin-layer"]'), { childList: true });
  })()`);

test("distribuição: as cartas dos assentos voam do baralho quando a partida começa", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  for (const p of ps) await p.waitFor(`document.querySelector('[data-dealt="1"]')`, "animação de distribuir");
  noErrors(...ps);
});

test("moedas: ao ganhar moedas voam do Erário até o jogador e a camada volta a ficar vazia", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await espiarMoedas(b); // quem ASSISTE também vê as moedas voando
  await a.click('[data-zone="basicas"] .seal', "Renda");
  await b.waitFor(`window.__voos >= 1`, "moeda voando");
  await b.waitFor(`document.querySelectorAll('[data-testid="coin-layer"] [data-coin-fly]').length === 0`, "camada limpa");
  noErrors(a, b);
});

test("contestação: a carta alegada é revelada na mesa para todos, com o veredito, e some sozinha", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="centro"] [title="Barão do Café"]'); // Taxas
  await b.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "bandeja");
  await b.key("c");
  for (const p of [a, b]) {
    await p.waitFor(`document.querySelector('[data-testid="challenge-reveal"]')`, "revelação");
    const r = await p.eval<{ had: string; txt: string }>(`(() => { const e = document.querySelector('[data-testid="challenge-reveal"]'); return { had: e.getAttribute('data-had-card'), txt: e.innerText }; })()`);
    assert.ok(r.had === "true" || r.had === "false");
    assert.match(r.txt, r.had === "true" ? /Tinha/ : /Era blefe/); // a mão é sorteada: os dois casos valem
  }
  await a.waitFor(`!document.querySelector('[data-testid="challenge-reveal"]')`, "revelação some", 6000);
  noErrors(a, b);
});

test("troca: as cartas compradas saem do baralho e o fluxo escolher→confirmar fecha a troca", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="centro"] [title="Regatão"]'); // Trocar
  await b.waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "bandeja da Bia");
  await b.key(" "); // Bia deixa passar
  await a.waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 4`, "4 cartas para escolher");
  assert.equal(await a.eval<number>(`document.querySelectorAll('[data-fly-from-deck]').length`), 2); // as 2 compradas
  await a.click('[data-zone="centro"] > div > div:nth-child(1) [title]');
  await a.click('[data-zone="centro"] > div > div:nth-child(2) [title]');
  await a.click('[data-zone="centro"] button', "Manter 2");
  await a.waitFor(`document.querySelectorAll('[data-zone="centro"] [title]').length === 5`, "volta à mão normal");
  noErrors(a, b);
});

test("reduced-motion: sem distribuição nem moedas voando", async () => {
  const { ps } = await game(["Ana", "Bia"], undefined, { reducedMotion: true });
  const [a, b] = ps;
  await espiarMoedas(b);
  await a.click('[data-zone="basicas"] .seal', "Renda");
  await waitCoins(b, "Ana", 3);
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(await b.eval<number>(`window.__voos`), 0);
  assert.equal(await a.eval<boolean>(`!document.querySelector('[data-dealt]')`), true);
  noErrors(a, b);
});

// ── Juice (4.9) ──────────────────────────────────────────────────────────────
test("tilt: o mouse sobre a carta inclina em 3D e ao sair volta ao normal", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [, b] = ps; // Bia não está na vez: a inclinação vale mesmo assim (é só visual)
  await b.waitFor(`document.querySelectorAll('[data-zone="centro"] .hand-card').length === 5`, "mão");
  const alvo = '[data-zone="centro"] .hand-card:nth-child(3)';
  // A borda direita é coberta pela carta vizinha do leque: mira a parte VISÍVEL (até ~80%).
  await b.mouseTo(alvo, 0.78, 0.5);
  await b.waitFor(`parseFloat(document.querySelector('${alvo}').style.getPropertyValue('--ry')) > 3`, "inclinou para a direita");
  await b.mouseTo(alvo, 0.1, 0.5);
  await b.waitFor(`parseFloat(document.querySelector('${alvo}').style.getPropertyValue('--ry')) < -3`, "inclinou para a esquerda");
  await b.mouseTo('[data-testid="dock"]', 0.02, 0.02); // fora da mão
  await b.waitFor(`document.querySelector('${alvo}').style.getPropertyValue('--ry') === ''`, "voltou ao normal");
  noErrors(b);
});

test("foil: só as cartas que são minhas brilham (1 ou 2), nunca as de blefe", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  await ps[0].waitFor(`document.querySelectorAll('[data-zone="centro"] [data-foil]').length >= 1`, "foil");
  const n = await ps[0].eval<number>(`document.querySelectorAll('[data-zone="centro"] [data-foil]').length`);
  assert.ok(n >= 1 && n <= 2, `foil em ${n} cartas`);
  noErrors(ps[0]);
});

test("moedas: o contador 'pula' quando muda (para quem joga e para quem assiste)", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a, b] = ps;
  await a.click('[data-zone="basicas"] .seal', "Renda");
  await b.waitFor(`document.querySelector('[data-seat="Ana"] .pop')`, "contador com animação pop");
  noErrors(a, b);
});

test("CRT: liga/desliga sem bloquear nenhum clique e persiste ao recarregar", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a] = ps;
  assert.equal(await a.eval<string>(`document.documentElement.dataset.crt`), "0");
  await a.click('[data-testid="crt-toggle"]');
  await a.waitFor(`document.documentElement.dataset.crt === "1"`, "CRT ligado");
  // com o filtro ligado ainda dá para jogar: o overlay não captura cliques
  await a.click('[data-zone="basicas"] .seal', "Renda");
  await waitCoins(a, "Ana", 3);
  await a.reload();
  await a.waitFor(`document.documentElement.dataset.crt === "1"`, "CRT persistiu");
  await a.click('[data-testid="crt-toggle"]'); // desliga
  await a.waitFor(`document.documentElement.dataset.crt === "0"`, "CRT desligado");
  noErrors(a);
});

// ── Áudio (Fase 5) ───────────────────────────────────────────────────────────
test("áudio: cada efeito e a trilha renderizam offline sem silêncio, sem estourar e curtos", async () => {
  const p = await open("/dev/audio");
  await p.waitFor(`document.querySelectorAll('[data-sfx][data-peak]').length >= 14`, "medições concluídas", 20000);
  const linhas = await p.eval<Array<{ n: string; peak: number; rms: number; s: number; f: string }>>(
    `[...document.querySelectorAll('[data-sfx][data-peak]')].map(e => ({ n: e.getAttribute('data-sfx'), peak: +e.getAttribute('data-peak'), rms: +e.getAttribute('data-rms'), s: +e.getAttribute('data-seconds'), f: e.getAttribute('data-finite') }))`,
  );
  for (const l of linhas) {
    assert.equal(l.f, "true", `${l.n}: amostra não finita`);
    assert.ok(l.peak > 0.01, `${l.n}: mudo demais (pico ${l.peak})`);
    assert.ok(l.peak < 0.9, `${l.n}: perto de estourar (pico ${l.peak})`);
    assert.ok(l.rms > 0.001, `${l.n}: rms ${l.rms}`);
    assert.ok(l.s < 6, `${l.n}: longo demais`);
  }
  noErrors(p);
});

test("áudio: o contexto nasce no primeiro gesto e o botão de mudo persiste", async () => {
  const { ps } = await game(["Ana", "Bia"]);
  const [a] = ps;
  await a.click('[data-zone="basicas"] .seal', "Renda"); // 1º gesto: desbloqueia o áudio
  await a.waitFor(`document.documentElement.dataset.audio === "running" || document.documentElement.dataset.audio === "pending"`, "áudio desbloqueado");
  assert.equal(await a.eval<string>(`document.querySelector('[data-testid="mute-toggle"]').getAttribute('aria-pressed')`), "false");
  await a.click('[data-testid="mute-toggle"]');
  await a.waitFor(`document.querySelector('[data-testid="mute-toggle"]').getAttribute('aria-pressed') === "true"`, "mudo ligado");
  await a.reload();
  await a.waitFor(`document.querySelector('[data-testid="mute-toggle"]')?.getAttribute('aria-pressed') === "true"`, "mudo persistiu");
  await a.click('[data-testid="mute-toggle"]');
  noErrors(a);
});

// ── Fim de partida (4.8) ─────────────────────────────────────────────────────
test("tela de vitória: vencedor, prêmios corretos e botão de revanche (página de revisão)", async () => {
  const p = await open("/dev/mesa?fase=fim&n=4", { w: 1280, h: 720 });
  await p.waitFor(`document.querySelector('[data-testid="victory"]')`, "tela de vitória");
  const txt = await p.eval<string>(`document.querySelector('[data-testid="victory"]').innerText`);
  assert.match(txt, /Ana vence!/);
  assert.match(txt, /PARTIDA 4/);
  assert.equal(/\p{Extended_Pictographic}/u.test(txt), false, `emoji do sistema na tela de vitória: ${txt}`);

  // Prêmios (mesma lógica de antes) e cada um com o seu ícone pixel carregado de verdade.
  const premios = await p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-award]')].map(e => e.getAttribute('data-award') + ':' + e.innerText.replace(/\\s+/g,' ')))`);
  const lista = JSON.parse(premios) as string[];
  assert.ok(lista.some((l) => l.startsWith("mentiroso:") && l.includes("Bia") && l.includes("3 vezes")), premios);
  assert.ok(lista.some((l) => l.startsWith("desconfiado:") && l.includes("Ana")), premios);
  assert.ok(lista.some((l) => l.startsWith("olho_de_lince:") && l.includes("Ana") && l.includes("3 de 4")), premios);
  assert.ok(lista.some((l) => l.startsWith("carrasco:") && l.includes("Ana")), premios);
  assert.ok(lista.some((l) => l.startsWith("ricaco:") && l.includes("11")), premios);
  await p.waitFor(
    `[...document.querySelectorAll('[data-award]')].length === 5 && [...document.querySelectorAll('[data-award]')].every(e => { const i = e.querySelector('img'); return i && i.complete && i.naturalWidth > 0 && i.src.includes('/icones/' + e.getAttribute('data-award') + '.sm.png'); })`,
    "ícone pixel de cada prêmio carregado",
  );

  // Vencedor: o MESMO retrato da mesa, em moldura, com coroa e troféu em PNG pixel.
  const retrato = await p.eval<{ slug: string; ok: boolean }>(`(() => {
    const i = document.querySelector('[data-testid="victory-retrato"]');
    return { slug: i.getAttribute('data-avatar'), ok: i.complete && i.naturalWidth === 64 };
  })()`);
  assert.ok(retrato.ok, "retrato do vencedor não carregou (64x92)");
  assert.equal(
    await p.eval<boolean>(`!!document.querySelector('[data-seat] img[src$="/avatares/${retrato.slug}.png"]')`),
    true,
    `a mesa deveria usar o mesmo retrato (${retrato.slug}) para a Ana`,
  );
  for (const id of ["victory-coroa", "victory-trofeu"]) {
    await p.waitFor(`(() => { const i = document.querySelector('[data-testid="${id}"]'); return i && i.complete && i.naturalWidth > 0; })()`, `${id} carregado`);
  }

  // Placar da noite (fictício): uma linha por jogador, líder em destaque, títulos com ícone.
  await p.waitFor(`document.querySelectorAll('[data-testid="placar-linhas"] li').length === 4`, "4 linhas no placar da noite");
  const linhas = await p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-testid="placar-linhas"] li')].map(e => ({ id: e.getAttribute('data-player'), lider: e.getAttribute('data-lider'), wins: e.querySelector('[data-testid="placar-vitorias"]').innerText, t: e.innerText.replace(/\\s+/g, ' ') })))`);
  const placar = JSON.parse(linhas) as Array<{ id: string; lider: string | null; wins: string; t: string }>;
  assert.deepEqual(placar.map((l) => [l.id, l.wins]), [["p1", "2"], ["p2", "1"], ["p3", "1"], ["p4", "0"]], linhas);
  assert.deepEqual(placar.map((l) => l.lider), ["sim", null, null, null], "só a Ana lidera");
  assert.ok(placar[0].t.includes("Ana") && placar[0].t.includes("Líder") && placar[0].t.includes("2 vitórias em 4 partidas"), linhas);
  assert.ok(placar[3].t.includes("0 vitórias em 4 partidas"), linhas);
  const titulos = await p.eval<string>(`JSON.stringify([...document.querySelectorAll('[data-title]')].map(e => e.getAttribute('data-title') + ':' + e.innerText.replace(/\\s+/g,' ') + ':' + (e.querySelector('img')?.naturalWidth ?? 0)))`);
  const tit = JSON.parse(titulos) as string[];
  assert.ok(tit.some((t) => t.startsWith("mentiroso:") && t.includes("Mentiroso da noite") && t.includes("Bia") && t.includes("2 vezes") && t.endsWith(":32")), titulos);
  assert.ok(tit.some((t) => t.startsWith("ricaco:") && t.includes("Ana e Bia") && t.includes("1 vez") && t.endsWith(":32")), titulos);
  assert.match(txt, /4 partidas nesta sala/);

  // Moedas: existem, respeitam o teto e estão animadas (movimento só por transform).
  const fx = await p.eval<{ n: number; anim: string; eventos: string }>(`(() => {
    const f = document.querySelector('[data-testid="victory-fx"]');
    const m = f.firstElementChild;
    return { n: f.children.length, anim: getComputedStyle(m).animationName, eventos: getComputedStyle(f).pointerEvents };
  })()`);
  assert.ok(fx.n >= 1 && fx.n <= 24, `moedas: ${fx.n}`);
  assert.notEqual(fx.anim, "none");
  assert.equal(fx.eventos, "none"); // a chuva nunca cobre o botão

  // Revanche: botão grande, com atalho anunciado, clicável (nada por cima).
  const btn = await p.eval<{ h: number; keys: string | null }>(`(() => {
    const b = document.querySelector('[data-testid="revanche"]');
    return { h: b.getBoundingClientRect().height, keys: b.getAttribute('aria-keyshortcuts') };
  })()`);
  assert.ok(btn.h >= 56, `botão de revanche pequeno: ${btn.h}px`);
  assert.equal(btn.keys, "Enter R");
  assert.ok(txt.includes("Enter") && txt.includes("Jogar de novo"));
  assert.equal(
    await p.eval<boolean>(`(() => { const r = document.querySelector('[data-testid="victory-panel"]').getBoundingClientRect(); const b = document.querySelector('[data-testid="revanche"]').getBoundingClientRect(); return r.top >= 0 && b.bottom <= innerHeight && b.top >= r.top; })()`),
    true,
    "o botão de revanche tem de aparecer inteiro na tela 1280x720",
  );
  await p.click('[data-testid="revanche"]', "Jogar de novo"); // o clique não pode estar coberto
  noErrors(p);
});

test("tela de vitória com 2 jogadores e reduced-motion: placar sem sobra e moedas ocultas", async () => {
  const p = await open("/dev/mesa?fase=fim&n=2", { w: 1280, h: 720 }, { reducedMotion: true });
  await p.waitFor(`document.querySelectorAll('[data-testid="placar-linhas"] li').length === 2`, "2 linhas no placar");
  assert.equal(await p.eval<string>(`getComputedStyle(document.querySelector('[data-testid="victory-fx"]')).display`), "none");
  assert.equal(await p.eval<string>(`getComputedStyle(document.querySelector('[data-testid="victory-coroa"]')).animationName`), "none");
  await p.click('[data-testid="revanche"]', "Jogar de novo");
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
  await b.waitFor(`document.querySelector('[data-seat="Bia"] [data-testid="placa-nome"]')?.innerText.trim() === "Você"`, "Bia de volta no próprio assento");
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

// Escala contínua (mesa nova, 19/10): o palco de 1280x680 unidades cabe na área da mesa e cresce
// com a tela. Confere que o fator chegou de verdade ao DOM (dock = 144u, carta da mão = 88u×124u,
// assento = 176u), que o palco cabe na janela e que nada fica cortado, sobreposto ou no dock.
const TELAS: Array<{ w: number; h: number; min: number }> = [
  { w: 1600, h: 900, min: 1.1 },
  { w: 1920, h: 1080, min: 1.3 },
  { w: 2560, h: 1440, min: 1.8 },
];
const fatorDaMesa = (p: Page) =>
  p.eval<number>(`parseFloat(getComputedStyle(document.querySelector('[data-testid="dock"]')).getPropertyValue('--mu'))`);
for (const { w, h, min } of TELAS) {
  for (const n of [2, 6]) {
    test(`layout ${w}×${h} com ${n} jogadores: a mesa preenche a tela sem nada cortado, sobreposto nem no dock`, async () => {
      const names = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"].slice(0, n);
      const { ps } = await game(names, { w, h });
      await ps[0].waitFor(`document.querySelectorAll('[data-seat]').length === ${n}`, `${n} assentos`);
      await ps[0].waitFor(`document.querySelectorAll('[data-zone="centro"] .hand-card').length === 5`, "mão");
      const m = await fatorDaMesa(ps[0]);
      assert.ok(m >= min, `mesa pequena demais em ${w}×${h}: fator ${m}`);
      const medidas = await ps[0].eval<{ dock: number; carta: number[]; assento: number; palco: { l: number; t: number; r: number; b: number } }>(`(() => {
        const dock = document.querySelector('[data-testid="dock"]');
        const carta = document.querySelector('[data-zone="centro"] .hand-card');
        const pr = document.querySelector('[data-palco]').getBoundingClientRect();
        return {
          dock: dock.getBoundingClientRect().height,
          // a carta tem rotate/scale no transform: usa o tamanho de layout, não o do retângulo girado
          carta: [carta.offsetWidth, carta.offsetHeight],
          assento: document.querySelector('[data-seat]').getBoundingClientRect().width,
          palco: { l: pr.left, t: pr.top, r: pr.right, b: pr.bottom },
        };
      })()`);
      assert.ok(Math.abs(medidas.dock - 144 * m) < 1, `dock ${medidas.dock} != ${144 * m}`);
      assert.ok(Math.abs(medidas.carta[0] - 88 * m) <= 1 && Math.abs(medidas.carta[1] - 124 * m) <= 1, `carta da mão fora da escala: ${medidas.carta}`);
      assert.ok(Math.abs(medidas.assento - 176 * m) < 1, `assento fora da escala: ${medidas.assento}`);
      assert.ok(medidas.palco.l >= -0.5 && medidas.palco.r <= w + 0.5 && medidas.palco.b <= h + 0.5, `palco fora da janela: ${JSON.stringify(medidas.palco)}`);
      assert.deepEqual(await layoutIssues(ps[0]), []);
      noErrors(...ps);
    });
  }
}

test("escala: redimensionar a janela aumenta e devolve o fator da mesa sem erros", async () => {
  const { ps } = await game(["Ana", "Bia"], { w: 1280, h: 720 });
  const antes = await fatorDaMesa(ps[0]);
  await ps[0].resize(1920, 1080);
  await ps[0].waitFor(`parseFloat(getComputedStyle(document.querySelector('[data-testid="dock"]')).getPropertyValue('--mu')) > ${antes}`, "mesa maior");
  assert.deepEqual(await layoutIssues(ps[0]), []);
  await ps[0].resize(1280, 720);
  await ps[0].waitFor(`parseFloat(getComputedStyle(document.querySelector('[data-testid="dock"]')).getPropertyValue('--mu')) === ${antes}`, "mesa de volta ao fator inicial");
  assert.deepEqual(await layoutIssues(ps[0]), []);
  noErrors(...ps);
});

test("layout 1600×900 com 6 jogadores: o feed de Intrigas aberto não cobre nenhum assento", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"], { w: 1600, h: 900 });
  await ps[0].waitFor(`document.querySelectorAll('[data-seat]').length === 6 && document.querySelector('[data-feed]')`, "assentos e feed");
  assert.deepEqual(await layoutIssues(ps[0]), []);
  // recolher o feed devolve a faixa à mesa e continua sem sobreposição
  await ps[0].click('[data-feed] button[title="Recolher"]');
  await ps[0].waitFor(`document.querySelector('button[data-feed]')`, "feed recolhido");
  assert.deepEqual(await layoutIssues(ps[0]), []);
  noErrors(...ps);
});

test("retratos: o mesmo jogador tem o mesmo retrato no lobby e na mesa, sem repetir, e todos carregam", async () => {
  const id = room();
  const ps: Page[] = [];
  for (const n of ["Ana", "Bia", "Caio"]) {
    const p = await open(`/room/${id}?name=${n}`);
    await p.waitText(`${n} (você)`);
    ps.push(p);
  }
  await ps[0].waitFor(`document.querySelectorAll('li[data-avatar]').length === 3`, "3 jogadores no lobby");
  const lobby = await ps[0].eval<Record<string, string>>(`Object.fromEntries([...document.querySelectorAll('li[data-avatar]')].map(e => [e.getAttribute('data-player'), e.getAttribute('data-avatar')]))`);
  assert.equal(new Set(Object.values(lobby)).size, 3, "retratos repetidos no lobby");
  const imgsOk = `[...document.querySelectorAll('li[data-avatar] img')].every(i => i.complete && i.naturalWidth > 0)`;
  await ps[0].waitFor(imgsOk, "retratos do lobby carregados");
  await ps[0].click("button", "Iniciar jogo");
  for (const p of ps) await p.waitFor(`document.querySelector('[data-testid="dock"]')`, "dock da mesa");
  for (const p of ps) {
    const mesa = await p.eval<Record<string, string>>(`Object.fromEntries([...document.querySelectorAll('[data-seat]')].map(e => [e.getAttribute('data-seat'), e.querySelector('[data-avatar]')?.getAttribute('data-avatar')]))`);
    assert.deepEqual(mesa, lobby, "retrato da mesa difere do lobby (ou difere entre clientes)");
    await p.waitFor(`[...document.querySelectorAll('[data-seat] [data-avatar] img')].every(i => i.complete && i.naturalWidth > 0)`, "retratos da mesa carregados");
  }
  noErrors(...ps);
});

test("mão: o nome e o poder de cada carta ficam visíveis (nenhuma carta cobre a legenda da vizinha)", async () => {
  const { ps } = await game(["Ana", "Bia"], { w: 1600, h: 900 });
  const covered = await ps[0].eval<string[]>(`(() => {
    const out = [];
    for (const card of document.querySelectorAll('[data-zone="centro"] .hand-card')) {
      const cap = card.querySelector('[data-caption] span');
      if (!cap) { out.push((card.getAttribute('title') || '?') + ' sem legenda'); continue; }
      const r = cap.getBoundingClientRect();
      for (const fx of [0.15, 0.5, 0.85]) {
        const top = document.elementFromPoint(r.left + r.width * fx, r.top + r.height / 2);
        if (!top || !card.contains(top)) out.push(card.getAttribute('title') + ' coberta em ' + fx);
      }
    }
    return out;
  })()`);
  assert.deepEqual(covered, []);
  noErrors(...ps);
});

test("menu: o leque dos 5 personagens carrega e o painel do kit tem fundo próprio (não transparente)", async () => {
  const p = await open("/");
  await p.waitFor(`document.querySelectorAll('[data-testid="home-fan"] img').length === 5`, "5 retratos no menu");
  await p.waitFor(`[...document.querySelectorAll('[data-testid="home-fan"] img')].every(i => i.complete && i.naturalWidth > 0)`, "retratos carregados");
  // PixelPanel = borda > face; a face é quem pinta o fundo (cor chapada do tema, sem gradiente).
  const bg = await p.eval<string>(`getComputedStyle(document.querySelector('[data-testid="home-panel"]').firstElementChild.firstElementChild).backgroundColor`);
  assert.ok(bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent", "painel sem fundo: " + bg);
  noErrors(p);
});

test("home: link do GitHub aponta para o repositório, abre em outra aba e não cobre o painel", async () => {
  for (const size of [{ w: 1280, h: 720 }, { w: 375, h: 667 }]) {
    const p = await open("/", size);
    await p.waitFor(`!!document.querySelector('[data-testid="github-link"]')`, "ícone do GitHub");
    const link = await p.eval<{ href: string; target: string; rel: string; label: string }>(`(() => {
      const a = document.querySelector('[data-testid="github-link"]');
      return { href: a.href, target: a.target, rel: a.rel, label: a.getAttribute('aria-label') || '' };
    })()`);
    assert.equal(link.href, "https://github.com/AlexandreJr16/coup-online");
    assert.equal(link.target, "_blank");
    assert.match(link.rel, /noopener/);
    assert.match(link.rel, /noreferrer/);
    assert.match(link.label, /GitHub/);
    // Visível e sem encostar no painel de entrada (nem em celular).
    const geo = await p.eval<{ a: number[]; b: number[]; vw: number; visible: boolean; hit: boolean }>(`(() => {
      const a = document.querySelector('[data-testid="github-link"]').getBoundingClientRect();
      const b = document.querySelector('[data-testid="home-panel"]').getBoundingClientRect();
      const visible = a.width > 0 && a.left >= 0 && a.right <= innerWidth;
      const hit = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      return { a: [a.left, a.top, a.right, a.bottom], b: [b.left, b.top, b.right, b.bottom], vw: innerWidth, visible, hit };
    })()`);
    assert.ok(geo.visible && !geo.hit, `ícone invisível ou sobre o painel em ${size.w}x${size.h}: ${JSON.stringify(geo)}`);
    // Em tela baixa o conteúdo não pode ser cortado: o início aparece e a página rola até o link.
    const scroll = await p.eval<{ panelTop: number; overflowY: string; canScroll: boolean }>(`(() => {
      const m = document.querySelector('main');
      return {
        panelTop: document.querySelector('[data-testid="home-panel"]').getBoundingClientRect().top,
        overflowY: getComputedStyle(m).overflowY,
        canScroll: m.scrollHeight > m.clientHeight,
      };
    })()`);
    assert.ok(scroll.panelTop >= 0, `topo da home cortado em ${size.w}x${size.h}: ${JSON.stringify(scroll)}`);
    if (scroll.canScroll) assert.notEqual(scroll.overflowY, "hidden", `conteúdo sem scroll em ${size.w}x${size.h}`);
    // Desktop 1280x720 (notebook comum): tudo cabe, sem barra de rolagem na home.
    if (size.w >= 1280) assert.equal(scroll.canScroll, false, `home com scroll em ${size.w}x${size.h}`);
    // Rola até o link (em celular ele fica abaixo da dobra) e confere que nada o cobre.
    const topIsLink = await p.eval<{ ok: boolean; bottom: number; vh: number }>(`(() => {
      const a = document.querySelector('[data-testid="github-link"]');
      a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect();
      return {
        ok: a.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
        bottom: r.bottom,
        vh: innerHeight,
      };
    })()`);
    assert.equal(topIsLink.ok, true, `algo cobre o link do GitHub em ${size.w}x${size.h}: ${JSON.stringify(topIsLink)}`);
    noErrors(p);
  }
});

// ── Colinha (botão "?") ──────────────────────────────────────────────────────
const NOMES_PERSONAGENS = ["Barão do Café", "Capoeira", "Coronel", "Regatão", "Benzedeira"];
const dialogAberto = (p: Page) => p.eval<boolean>(`!!document.querySelector('[data-testid="cheatsheet"][role="dialog"]')`);

test("colinha: abre por clique e por '?', mostra os 5 personagens e fecha por X, Esc, '?' e clique fora", async () => {
  const p = await open("/dev/colinha", { w: 1280, h: 720 });
  await p.waitFor(`!!document.querySelector('[data-testid="cheatsheet-toggle"]')`, "botão ?");
  assert.equal(await dialogAberto(p), false);

  // Abre por clique de mouse real; o painel é um diálogo modal acessível e tem o conteúdo.
  await p.click('[data-testid="cheatsheet-toggle"]');
  await p.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, "painel aberto");
  const aria = await p.eval<{ modal: string; labelled: string; title: string; focusInside: boolean; expanded: string }>(`(() => {
    const d = document.querySelector('[data-testid="cheatsheet"]');
    const t = document.getElementById(d.getAttribute('aria-labelledby'));
    return {
      modal: d.getAttribute('aria-modal'), labelled: d.getAttribute('aria-labelledby') || '',
      title: t ? t.innerText : '', focusInside: d.contains(document.activeElement),
      expanded: document.querySelector('[data-testid="cheatsheet-toggle"]').getAttribute('aria-expanded'),
    };
  })()`);
  assert.equal(aria.modal, "true");
  assert.equal(aria.title, "Colinha");
  assert.equal(aria.focusInside, true, "foco deve ir para dentro do painel");
  assert.equal(aria.expanded, "true");
  const corpo = await p.eval<string>(`document.querySelector('[data-testid="cheatsheet"]').innerText`);
  for (const n of NOMES_PERSONAGENS) assert.ok(corpo.includes(n), `falta ${n} na colinha`);
  for (const t of ["Renda", "Ajuda Externa", "Golpe de Estado", "Contestável", "Bloqueável", "10 ou mais moedas"]) {
    assert.ok(corpo.includes(t), `falta "${t}" na colinha`);
  }
  assert.ok(!/Duque|Capitão|Condessa|Embaixador|Inquisidor/.test(corpo), "nome original do Coup vazou na UI");

  // P22: "contestável" e "bloqueável" são ícones certo/errado (data-mark), não chips de texto.
  const marcas = await p.eval<Record<string, string>>(`(() => {
    const out = {};
    const pega = (el) => ['contestar', 'bloquear'].map((f) => el.querySelector('[data-flag="' + f + '"] [data-mark]')?.getAttribute('data-mark') ?? '-').join('/');
    for (const el of document.querySelectorAll('[data-testid="cheatsheet"] [data-testid="colinha-personagens"] [data-character]')) out[el.getAttribute('data-character')] = pega(el);
    for (const el of document.querySelectorAll('[data-testid="cheatsheet"] [data-testid="colinha-gerais"] [data-action]')) out[el.getAttribute('data-action')] = pega(el);
    return out;
  })()`);
  assert.deepEqual(marcas, {
    duque: "sim/nao", // Taxas: contestável, ninguém bloqueia
    assassino: "sim/sim", // Assassinar: a Benzedeira bloqueia
    capitao: "sim/sim", // Extorquir: Coronel ou Regatão bloqueiam
    embaixador: "sim/nao", // Trocar
    condessa: "-/-", // sem ação de turno: só defende
    renda: "nao/nao",
    ajuda_externa: "nao/sim", // o Barão do Café bloqueia
    golpe: "nao/nao",
  });
  // (A página /dev/colinha mostra o corpo embutido E o diálogo: as consultas olham só o diálogo.)
  // Quem bloqueia aparece como mini-retrato (Extorquir: 2; Assassinar e Ajuda Externa: 1).
  const minis = await p.eval<Record<string, number>>(`({
    capitao: document.querySelectorAll('[data-testid="cheatsheet"] [data-character="capitao"] [data-flag="bloquear"] img[alt]:not([data-mark])').length,
    assassino: document.querySelectorAll('[data-testid="cheatsheet"] [data-character="assassino"] [data-flag="bloquear"] img[alt]:not([data-mark])').length,
    ajuda_externa: document.querySelectorAll('[data-testid="cheatsheet"] [data-action="ajuda_externa"] [data-flag="bloquear"] img[alt]:not([data-mark])').length,
  })`);
  assert.deepEqual(minis, { capitao: 2, assassino: 1, ajuda_externa: 1 });
  assert.equal(await p.eval<number>(`document.querySelectorAll('[data-testid="cheatsheet"] [data-testid="colinha-regras"] [data-regra]').length`), 5, "5 regras curtas");

  // Fecha pelo X (foco volta ao botão ?).
  await p.click('[data-testid="cheatsheet-close"]');
  await p.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, "fechou pelo X");
  await p.waitFor(`document.activeElement === document.querySelector('[data-testid="cheatsheet-toggle"]')`, "foco devolvido ao botão ?");

  // Abre e fecha pela tecla '?'.
  await p.key("?");
  await p.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, "abriu com ?");
  await p.key("?");
  await p.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, "fechou com ?");

  // Esc fecha.
  await p.key("?");
  await p.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, "reabriu");
  await p.key("Escape");
  await p.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, "fechou com Esc");

  // Clique fora do painel (no fundo escuro) fecha; clique dentro NÃO fecha.
  await p.key("?");
  await p.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, "reabriu de novo");
  const r = await p.eval<{ inX: number; inY: number; outX: number; outY: number }>(`(() => {
    const d = document.querySelector('[data-testid="cheatsheet"]').getBoundingClientRect();
    return { inX: d.left + d.width / 2, inY: d.top + 40, outX: Math.max(4, d.left / 2), outY: innerHeight / 2 };
  })()`);
  await p.clickAt(r.inX, r.inY);
  assert.equal(await dialogAberto(p), true, "clique dentro do painel não pode fechar");
  await p.clickAt(r.outX, r.outY);
  await p.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, "fechou clicando fora");

  noErrors(p);
});

test("colinha: '?' digitado num campo de texto não abre o painel (home)", async () => {
  const p = await open("/", { w: 1280, h: 720 });
  await p.waitFor(`!!document.querySelector('input')`, "campo de nome");
  await p.click("input");
  await p.key("?");
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await dialogAberto(p), false, "digitar ? no campo não pode abrir a colinha");
  const valor = await p.eval<string>(`document.querySelector('input').value`);
  assert.equal(valor, "?", "o ? deve ter sido digitado no campo");
  // Fora do campo, abre; o botão ? também existe na home.
  assert.equal(await p.eval<boolean>(`!!document.querySelector('[data-testid="cheatsheet-toggle"]')`), true);
  noErrors(p);
});

test("colinha: na mesa, Esc com o painel aberto NÃO cancela a mira por baixo; depois do painel fechado o Esc cancela", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"], { w: 1280, h: 720 });
  const [a] = ps;
  // Ana (da vez) arma o Assassinar → mira nos alvos.
  await a.click('[data-zone="basicas"] button', "Renda"); // 2→3 moedas (precisa de 3 para Assassinar)
  await waitCoins(a, "Ana", 3);
  await ps[1].click('[data-zone="basicas"] button', "Renda");
  await ps[2].click('[data-zone="basicas"] button', "Renda");
  await a.waitFor(`document.querySelector('[data-testid="dock"]') && document.querySelector('[data-seat="Ana"]')?.getAttribute('data-coins') === "3"`, "volta a vez da Ana");
  await a.click('[data-zone="centro"] [title="Capoeira"]');
  await a.waitFor(`document.querySelector('[data-seat="Bia"][data-target="sim"]')`, "mira em Bia");

  // Abre a colinha pelo botão do cabeçalho (a mira continua armada por baixo).
  await a.click('[data-testid="cheatsheet-toggle"]');
  await a.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, "colinha aberta na mesa");
  assert.equal(await a.eval<boolean>(`!!document.querySelector('[data-seat="Bia"][data-target="sim"]')`), true, "mira some ao abrir a colinha");

  // O jogo segue vivo e o relógio do servidor continua correndo com o painel aberto.
  const t1 = await a.eval<string>(`document.querySelector('[data-testid="relogio"]')?.getAttribute('data-segundos') ?? ''`);
  await new Promise((r) => setTimeout(r, 2200));
  const t2 = await a.eval<string>(`document.querySelector('[data-testid="relogio"]')?.getAttribute('data-segundos') ?? ''`);
  if (t1 && t2) assert.ok(Number(t2) < Number(t1), `timer parado com a colinha aberta: ${t1} → ${t2}`);

  // Esc fecha SÓ a colinha: a mira segue armada.
  await a.key("Escape");
  await a.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, "Esc fechou a colinha");
  assert.equal(await a.eval<boolean>(`!!document.querySelector('[data-seat="Bia"][data-target="sim"]')`), true, "Esc com a colinha aberta cancelou a mira");

  // Com a colinha fechada, o Esc volta a cancelar a mira.
  await a.key("Escape");
  await a.waitFor(`!document.querySelector('[data-target="sim"]')`, "Esc cancelou a mira com a colinha fechada");
  noErrors(...ps);
});

test("colinha (P22): numa sala em 1280x720 a peça cabe sem rolagem, nos estilos A e B, com todas as imagens carregadas", async () => {
  const { ps } = await game(["Ana", "Bia"], { w: 1280, h: 720 });
  const [a] = ps;
  const medir = () =>
    a.eval<{
      vw: number; vh: number; w: number; h: number; top: number; bottom: number; left: number; right: number;
      dialogoRola: boolean; corpoRola: boolean; corpoRolaLado: boolean; vazando: string[]; semImagem: string[];
      colunas: number; regras: number; gerais: number;
    }>(`(() => {
      const d = document.querySelector('[data-testid="cheatsheet"]');
      const corpo = document.querySelector('[data-testid="cheatsheet-body"]');
      const r = d.getBoundingClientRect();
      const vazando = [...d.querySelectorAll('[data-character], [data-regra], [data-action]')]
        .filter((el) => { const b = el.getBoundingClientRect(); return b.bottom > r.bottom + 0.5 || b.right > r.right + 0.5 || b.top < r.top - 0.5 || b.left < r.left - 0.5; })
        .map((el) => el.getAttribute('data-character') || el.getAttribute('data-regra') || el.getAttribute('data-action'));
      const semImagem = [...d.querySelectorAll('img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src') || '?');
      return {
        vw: innerWidth, vh: innerHeight, w: d.offsetWidth, h: d.offsetHeight,
        top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        dialogoRola: d.scrollHeight > d.clientHeight, corpoRola: corpo.scrollHeight > corpo.clientHeight,
        corpoRolaLado: corpo.scrollWidth > corpo.clientWidth,
        vazando, semImagem,
        colunas: d.querySelectorAll('[data-testid="colinha-personagens"] [data-character]').length,
        regras: d.querySelectorAll('[data-regra]').length,
        gerais: d.querySelectorAll('[data-testid="colinha-gerais"] [data-action]').length,
      };
    })()`);

  for (const estilo of ["A", "B"]) {
    await a.eval(`document.documentElement.setAttribute('data-estilo', '${estilo}')`);
    await a.click('[data-testid="cheatsheet-toggle"]');
    await a.waitFor(`!!document.querySelector('[data-testid="cheatsheet"]')`, `colinha aberta (estilo ${estilo})`);
    // A peça sobe com uma animação de ~0.5s: só mede o retângulo depois dela.
    await new Promise((r) => setTimeout(r, 900));
    const m = await medir();
    assert.ok(m.w <= m.vw && m.h <= m.vh, `${estilo}: painel ${m.w}x${m.h} maior que a viewport ${m.vw}x${m.vh}`);
    assert.ok(m.top >= 0 && m.left >= 0 && m.bottom <= m.vh + 0.5 && m.right <= m.vw + 0.5, `${estilo}: painel fora da tela ${JSON.stringify(m)}`);
    assert.equal(m.dialogoRola, false, `${estilo}: o painel tem rolagem (scrollHeight > clientHeight)`);
    assert.equal(m.corpoRola, false, `${estilo}: o corpo da colinha tem rolagem vertical`);
    assert.equal(m.corpoRolaLado, false, `${estilo}: o corpo da colinha tem rolagem horizontal`);
    assert.deepEqual(m.vazando, [], `${estilo}: blocos fora do painel`);
    assert.deepEqual(m.semImagem, [], `${estilo}: imagens que não carregaram`);
    assert.deepEqual([m.colunas, m.regras, m.gerais], [5, 5, 3]);
    await a.key("Escape");
    await a.waitFor(`!document.querySelector('[data-testid="cheatsheet"]')`, `colinha fechada (estilo ${estilo})`);
  }
  noErrors(...ps);
});

// ── Aba de Aparência (P27.S4) ────────────────────────────────────────────────
const html = (p: Page) =>
  p.eval<{ fonte: string | null; estilo: string | null; dock: string | null }>(`({
    fonte: document.documentElement.getAttribute('data-fonte'),
    estilo: document.documentElement.getAttribute('data-estilo'),
    dock: document.documentElement.getAttribute('data-dock'),
  })`);
const painelAberto = (p: Page) => p.eval<boolean>(`!!document.querySelector('[data-testid="aparencia-panel"][role="dialog"]')`);

test("aparência: na home abre a aba, troca fonte e estilo ao vivo, persiste ao recarregar e fecha por Esc e clique fora", async () => {
  const p = await open("/", { w: 1280, h: 720 });
  await p.waitFor(`!!document.querySelector('[data-testid="aparencia-toggle"]')`, "botão de Aparência na home");
  try {
    // Parte do padrão (o perfil do navegador pode ter sobra de outro teste).
    await p.eval(`localStorage.removeItem("coup:aparencia")`);
    await p.reload();
    await p.waitFor(`!!document.querySelector('[data-testid="aparencia-toggle"]')`, "home recarregada");
    assert.deepEqual(await html(p), { fonte: "pixelify", estilo: "A", dock: "mesa" });
    assert.equal(await painelAberto(p), false);

    // Abre por clique de mouse real: diálogo modal acessível, com as 4 fontes, 2 estilos e 3 docks.
    await p.click('[data-testid="aparencia-toggle"]');
    await p.waitFor(`!!document.querySelector('[data-testid="aparencia-panel"]')`, "aba aberta");
    const info = await p.eval<{ modal: string; title: string; fontes: number; estilos: number; docks: number; focoDentro: boolean; expanded: string }>(`(() => {
      const d = document.querySelector('[data-testid="aparencia-panel"]');
      const t = document.getElementById(d.getAttribute('aria-labelledby'));
      return {
        modal: d.getAttribute('aria-modal'), title: t ? t.innerText : '',
        fontes: d.querySelectorAll('[data-testid^="aparencia-fonte-"]').length,
        estilos: d.querySelectorAll('[data-testid^="aparencia-estilo-"]').length,
        docks: d.querySelectorAll('[data-testid^="aparencia-dock-"]').length,
        focoDentro: d.contains(document.activeElement),
        expanded: document.querySelector('[data-testid="aparencia-toggle"]').getAttribute('aria-expanded'),
      };
    })()`);
    assert.deepEqual(info, { modal: "true", title: "Aparência", fontes: 4, estilos: 2, docks: 3, focoDentro: true, expanded: "true" });

    // Cada opção de fonte é desenhada na própria fonte e mostra a frase de amostra.
    const fontes = await p.eval<Array<{ id: string; familia: string; texto: string }>>(`[...document.querySelectorAll('[data-testid^="aparencia-fonte-"]')].map(b => ({
      id: b.getAttribute('data-testid'), familia: getComputedStyle(b).fontFamily, texto: b.innerText }))`);
    for (const f of fontes) assert.ok(f.texto.includes("Barão do Café, ação"), `${f.id} sem a amostra: ${f.texto}`);
    const fam = (id: string) => fontes.find((f) => f.id === `aparencia-fonte-${id}`)?.familia ?? "";
    assert.match(fam("vt323"), /VT323/i);
    assert.match(fam("press"), /Press Start 2P/i);
    assert.notEqual(fam("vt323"), fam("press"));

    // Prévia ao vivo: o <html> muda na hora, sem fechar a aba.
    await p.click('[data-testid="aparencia-fonte-vt323"]');
    await p.waitFor(`document.documentElement.getAttribute('data-fonte') === "vt323"`, "fonte VT323 aplicada");
    await p.click('[data-testid="aparencia-estilo-B"]');
    await p.waitFor(`document.documentElement.getAttribute('data-estilo') === "B"`, "estilo B aplicado");
    await p.click('[data-testid="aparencia-dock-cavalete"]');
    await p.waitFor(`document.documentElement.getAttribute('data-dock') === "cavalete"`, "dock cavalete salvo");
    assert.equal(await painelAberto(p), true, "escolher uma opção não pode fechar a aba");
    assert.ok((await p.text()).includes("em breve"), "docks sem visual devem avisar 'em breve'");
    assert.equal(
      await p.eval<string>(`document.querySelector('[data-testid="aparencia-estilo-B"]').getAttribute('aria-pressed')`),
      "true",
    );

    // A preferência fica no localStorage e a tela não perde nada ao recarregar (sem flash: o
    // script do <head> já aplica os data-* antes da hidratação).
    assert.deepEqual(
      JSON.parse(await p.eval<string>(`localStorage.getItem("coup:aparencia")`)),
      { fonte: "vt323", estilo: "B", dock: "cavalete" },
    );
    await p.key("Escape");
    await p.waitFor(`!document.querySelector('[data-testid="aparencia-panel"]')`, "Esc fechou a aba");
    await p.waitFor(`document.activeElement === document.querySelector('[data-testid="aparencia-toggle"]')`, "foco devolvido à engrenagem");
    await p.reload();
    await p.waitFor(`!!document.querySelector('[data-testid="aparencia-toggle"]')`, "home após reload");
    assert.deepEqual(await html(p), { fonte: "vt323", estilo: "B", dock: "cavalete" });

    // Clique fora (no véu) fecha; clique dentro não.
    await p.click('[data-testid="aparencia-toggle"]');
    await p.waitFor(`!!document.querySelector('[data-testid="aparencia-panel"]')`, "reabriu");
    const r = await p.eval<{ inX: number; inY: number }>(`(() => {
      const d = document.querySelector('[data-testid="aparencia-panel"]').getBoundingClientRect();
      return { inX: d.left + d.width / 2, inY: d.top + 60 };
    })()`);
    await p.clickAt(r.inX, r.inY);
    assert.equal(await painelAberto(p), true, "clique dentro da aba não pode fechar");
    await p.clickAt(8, 8);
    await p.waitFor(`!document.querySelector('[data-testid="aparencia-panel"]')`, "fechou clicando fora");
    noErrors(p);
  } finally {
    await p.eval(`localStorage.removeItem("coup:aparencia")`); // não vaza o tema para os outros testes
  }
});

test("aparência: na mesa, o Esc fecha só a aba (a mira segue armada) e as escolhas não travam o jogo", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"], { w: 1280, h: 720 });
  const [a] = ps;
  try {
    await a.click('[data-zone="basicas"] button', "Renda");
    await waitCoins(a, "Ana", 3);
    await ps[1].click('[data-zone="basicas"] button', "Renda");
    await ps[2].click('[data-zone="basicas"] button', "Renda");
    await a.waitFor(`document.querySelector('[data-seat="Ana"]')?.getAttribute('data-coins') === "3" && !!document.querySelector('[data-testid="dock"]')`, "volta a vez da Ana");
    await a.click('[data-zone="centro"] [title="Capoeira"]');
    await a.waitFor(`document.querySelector('[data-seat="Bia"][data-target="sim"]')`, "mira em Bia");

    // Abre a aba pela engrenagem do HUD, troca o estilo e a fonte: a mira continua armada.
    await a.click('[data-testid="aparencia-toggle"]');
    await a.waitFor(`!!document.querySelector('[data-testid="aparencia-panel"]')`, "aba aberta na mesa");
    await a.click('[data-testid="aparencia-estilo-B"]');
    await a.waitFor(`document.documentElement.getAttribute('data-estilo') === "B"`, "estilo B na mesa");
    await a.click('[data-testid="aparencia-fonte-silkscreen"]');
    await a.waitFor(`document.documentElement.getAttribute('data-fonte') === "silkscreen"`, "fonte Silkscreen na mesa");
    assert.equal(await a.eval<boolean>(`!!document.querySelector('[data-seat="Bia"][data-target="sim"]')`), true, "mira some ao mexer na aparência");

    // Esc fecha SÓ a aba; a mira segue. Depois, com a aba fechada, o Esc cancela a mira.
    await a.key("Escape");
    await a.waitFor(`!document.querySelector('[data-testid="aparencia-panel"]')`, "Esc fechou a aba");
    assert.equal(await a.eval<boolean>(`!!document.querySelector('[data-seat="Bia"][data-target="sim"]')`), true, "Esc com a aba aberta cancelou a mira");
    await a.key("Escape");
    await a.waitFor(`!document.querySelector('[data-target="sim"]')`, "Esc cancelou a mira com a aba fechada");

    // Com o tema trocado a mesa continua utilizável (nada cortado nem sobreposto).
    assert.deepEqual(await layoutIssues(a), []);
    noErrors(...ps);
  } finally {
    await a.eval(`localStorage.removeItem("coup:aparencia")`);
  }
});

test("HUD da sala: logo, código, um só estilo de botão (5 botões) e nenhum emoji do sistema", async () => {
  const p = await open(`/room/${room()}?name=Ana`, { w: 1280, h: 720 });
  await p.waitText("Sala de espera");
  const hud = await p.eval<{ logo: boolean; codigo: string; botoes: string[]; classes: number; altura: number; emoji: boolean }>(`(() => {
    const h = document.querySelector('header');
    const bs = [...h.querySelectorAll('button')];
    return {
      logo: !!h.querySelector('[data-testid="logo"] img') && h.querySelector('[data-testid="logo"] img').naturalWidth > 0,
      codigo: h.querySelector('[data-testid="sala-codigo"]')?.innerText ?? '',
      botoes: bs.map(b => b.getAttribute('data-testid') || '?'),
      classes: new Set(bs.map(b => b.className.split(' ').filter(c => !/forca/.test(c)).join(' '))).size,
      altura: h.getBoundingClientRect().height,
      emoji: /\\p{Extended_Pictographic}/u.test(h.innerText),
    };
  })()`);
  assert.equal(hud.logo, true, "logo do HUD não carregou");
  assert.match(hud.codigo, /^[A-Z0-9]{3,}$/);
  assert.deepEqual(hud.botoes, ["mute-toggle", "crt-toggle", "cheatsheet-toggle", "aparencia-toggle", "leave-button"]);
  assert.equal(hud.classes, 1, "os botões do HUD devem ter um único estilo");
  assert.ok(hud.altura <= 64, `HUD alto demais: ${hud.altura}px`);
  assert.equal(hud.emoji, false, "emoji do sistema no cabeçalho");
  noErrors(p);
});

// ── Faixa de status da rodada (retrato da vez + o que a mesa espera) ─────────
const headIs = (p: Page, text: string) =>
  p.waitFor(`document.querySelector('[data-testid="round-status-headline"]')?.innerText === ${JSON.stringify(text)}`, `faixa: "${text}"`);
const detailIs = (p: Page, text: string) =>
  p.waitFor(`document.querySelector('[data-testid="round-status-detail"]')?.innerText === ${JSON.stringify(text)}`, `detalhe: "${text}"`);
const statusText = (p: Page) =>
  p.eval<{ head: string; detail: string }>(`({
    head: document.querySelector('[data-testid="round-status-headline"]')?.innerText ?? '',
    detail: document.querySelector('[data-testid="round-status-detail"]')?.innerText ?? '',
  })`);

// /dev/mesa (n=4): eu sou a Ana (p1). Cada fase tem o texto certo, dentro do cabeçalho.
const FASES_STATUS: Array<[fase: string, head: string, detail: string]> = [
  ["turno", "Sua vez", "Escolha uma ação"],
  ["reacao", "Bia declarou Taxas (Barão do Café)", "Aguardando você e Davi: contestar ou passar"],
  ["contestar", "Caio bloqueou Ajuda Externa com Barão do Café", "Aguardando você, Bia e Davi: contestar o bloqueio ou passar"],
  ["revelar", "Você perdeu uma influência", "Escolha qual carta revelar"],
  ["troca", "Você está trocando cartas", "Escolha quais cartas manter"],
  ["fim", "Você venceu!", "Partida encerrada"],
];
for (const [fase, head, detail] of FASES_STATUS) {
  test(`faixa de status: fase "${fase}" mostra "${head}"`, async () => {
    const p = await open(`/dev/mesa?fase=${fase}&n=4`, { w: 1280, h: 720 });
    await headIs(p, head);
    await detailIs(p, detail);
    // P08.S2: a região de status segue no cabeçalho (portal), mas oculta; o texto visível é a legenda do centro.
    const dom = await p.eval<{ inSlot: boolean; phase: string; turn: string; oculta: boolean; legenda: boolean }>(`(() => {
      const b = document.querySelector('[data-testid="round-status"]');
      const r = b.getBoundingClientRect();
      return {
        inSlot: !!document.querySelector('[data-testid="round-status-slot"] [data-testid="round-status"]'),
        phase: b.getAttribute('data-phase'), turn: b.getAttribute('data-turn-id'),
        oculta: r.width <= 1 && r.height <= 1,
        legenda: !!document.querySelector('[data-testid="center-caption"]'),
      };
    })()`);
    assert.equal(dom.inSlot, true, "região fora do slot do cabeçalho");
    assert.equal(dom.oculta, true, "o status não deve aparecer como texto no cabeçalho");
    assert.equal(dom.legenda, fase !== "fim", "legenda do centro presente (menos no fim)");
    if (fase === "turno") assert.equal(dom.turn, "p1");
    if (fase === "reacao") assert.equal(dom.turn, "p2");
    noErrors(p);
  });
}

// Aviso dos últimos 5s (/dev/mesa?restante=N fixa o tempo restante da fase).
for (const [fase, restante, texto] of [
  ["turno", 3, "Você joga Renda em"],
  ["revelar", 4, "Você revela uma carta sorteada em"],
  ["troca", 2, "Você mantém as próprias cartas em"],
] as const) {
  test(`aviso dos últimos segundos: fase "${fase}" com ${restante}s avisa "${texto}…"`, async () => {
    const p = await open(`/dev/mesa?fase=${fase}&n=4&restante=${restante}`, { w: 1280, h: 720 });
    await p.waitFor(`document.querySelector('[data-testid="round-status"]')?.getAttribute('data-warning') === 'sim'`, "faixa em modo aviso");
    const detalhe = await p.eval<string>(`document.querySelector('[data-testid="round-status-detail"]').innerText`);
    assert.ok(detalhe.startsWith(texto), `aviso inesperado: ${detalhe}`);
    noErrors(p);
  });
}

test("aviso dos últimos segundos: com tempo de sobra (32s) a faixa não avisa", async () => {
  const p = await open(`/dev/mesa?fase=turno&n=4`, { w: 1280, h: 720 });
  await headIs(p, "Sua vez");
  await detailIs(p, "Escolha uma ação");
  assert.equal(await p.eval<boolean>(`document.querySelector('[data-testid="round-status"]').getAttribute('data-warning') === null`), true);
  noErrors(p);
});

test("faixa de status: partida real — turno, declaração, passar, contestação e layout intacto", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"], { w: 1280, h: 720 });
  const [a, b, c] = ps;

  // Turno: Ana "Sua vez"; os outros "Vez de Ana". O retrato é o de quem tem a vez.
  await headIs(a, "Sua vez");
  await headIs(b, "Vez de Ana");
  await headIs(c, "Vez de Ana");
  await detailIs(b, "Escolhendo uma ação");
  const anaId = await a.eval<string>(`document.querySelector('[data-seat="Ana"]').getAttribute('data-seat-id')`);
  assert.equal(await b.eval<string>(`document.querySelector('[data-testid="round-status"]').getAttribute('data-turn-id')`), anaId);

  // Ana declara Taxas: cada um vê a frase do seu ponto de vista.
  await a.click('[data-zone="centro"] [title="Barão do Café"]');
  await headIs(a, "Você declarou Taxas (Barão do Café)");
  await detailIs(a, "Aguardando Bia e Caio: contestar ou passar");
  await headIs(b, "Ana declarou Taxas (Barão do Café)");
  await detailIs(b, "Aguardando você e Caio: contestar ou passar");

  // O cabeçalho não cresce e a legenda do centro e o balão da jogada aparecem na mesa.
  const geo = await b.eval<{ headerH: number; legenda: string; balao: string }>(`(() => ({
    headerH: document.querySelector('header').getBoundingClientRect().height,
    legenda: document.querySelector('[data-testid="center-caption"]')?.innerText ?? '',
    balao: document.querySelector('[data-seat="Ana"] [data-seat-balloon]')?.innerText ?? '',
  }))()`);
  assert.ok(geo.headerH <= 64, `cabeçalho cresceu demais: ${geo.headerH}px`);
  assert.match(geo.legenda, /Aguardando você e Caio/);
  assert.equal(geo.balao, "Taxas");
  assert.deepEqual(await layoutIssues(b), []);

  // Bia passa: sai da espera e a mesa só espera o Caio.
  await b.key(" ");
  await detailIs(b, "Aguardando Caio: contestar ou passar");
  await detailIs(a, "Aguardando Caio: contestar ou passar");
  await detailIs(c, "Aguardando você: contestar ou passar");

  // Caio contesta: alguém perde influência; quem perdeu vê "Você perdeu", os outros veem o nome.
  await c.key("c");
  for (const p of ps) await p.waitFor(`/perdeu uma influência$/.test(document.querySelector('[data-testid="round-status-headline"]')?.innerText ?? '')`, "alguém perdeu influência");
  const heads = await Promise.all(ps.map(async (p) => (await statusText(p)).head));
  assert.equal(heads.filter((h) => h === "Você perdeu uma influência").length, 1, `só o perdedor vê 'Você': ${heads.join(" | ")}`);
  const loser = ["Ana", "Bia", "Caio"][heads.indexOf("Você perdeu uma influência")];
  for (const [i, p] of ps.entries()) {
    const esperado = heads[i] === "Você perdeu uma influência" ? "Escolha qual carta revelar" : "Escolhendo qual carta revelar";
    await detailIs(p, esperado);
    if (heads[i] !== "Você perdeu uma influência") assert.equal(heads[i], `${loser} perdeu uma influência`);
  }
  noErrors(...ps);
});

test("faixa de status: bloqueio da Ajuda Externa e volta ao turno ao passar", async () => {
  const { ps } = await game(["Ana", "Bia"], { w: 1280, h: 720 });
  const [a, b] = ps;
  await a.click('[data-zone="basicas"] .seal', "Ajuda");
  await headIs(b, "Ana declarou Ajuda Externa");
  await detailIs(b, "Aguardando você: bloquear ou passar");

  // Bia bloqueia com o Barão (atalho B): a janela vira "contestar o bloqueio".
  await b.key("b");
  await headIs(b, "Você bloqueou Ajuda Externa com Barão do Café");
  await detailIs(b, "Aguardando Ana: contestar o bloqueio ou passar");
  await headIs(a, "Bia bloqueou Ajuda Externa com Barão do Café");
  await detailIs(a, "Aguardando você: contestar o bloqueio ou passar");

  // Ana deixa passar: o bloqueio vale e a vez é da Bia.
  await a.key(" ");
  await headIs(b, "Sua vez");
  await headIs(a, "Vez de Bia");
  noErrors(...ps);
});

// ── Espectador ───────────────────────────────────────────────────────────────
test("espectador (/dev/mesa): mesa só de leitura, sem mão, sem ações e sem 'Você' na faixa", async () => {
  const p = await open("/dev/mesa?fase=turno&n=4&espectador=1", { w: 1280, h: 720 });
  await p.waitFor(`!!document.querySelector('[data-testid="spectator-notice"]')`, "aviso de espectador");
  const dom = await p.eval<{ dockSpectator: string | null; zones: number; cards: number; passAuto: boolean; notice: string }>(`(() => ({
    dockSpectator: document.querySelector('[data-testid="dock"]').getAttribute('data-spectator'),
    zones: document.querySelectorAll('[data-zone]').length,
    cards: document.querySelectorAll('[data-zone="centro"] [title]').length,
    passAuto: document.body.innerText.includes('Passar automático'),
    notice: document.querySelector('[data-testid="spectator-notice"]').innerText,
  }))()`);
  assert.equal(dom.dockSpectator, "sim");
  assert.equal(dom.zones, 0, "espectador não tem ações, mão nem reações");
  assert.equal(dom.cards, 0);
  assert.equal(dom.passAuto, false);
  assert.match(dom.notice, /assistindo/i);
  // A faixa usa nomes (ele não é ninguém da mesa) e nenhum assento diz "(você)".
  await headIs(p, "Vez de Ana");
  assert.equal((await p.text()).includes("(você)"), false);
  // Nenhuma carta oculta mostra personagem (view pública), e o layout continua inteiro.
  assert.deepEqual(await layoutIssues(p), []);
  noErrors(p);
});

test("espectador (/dev/mesa): na vitória não há 'Jogar de novo', só o aviso de espera", async () => {
  const p = await open("/dev/mesa?fase=fim&n=4&espectador=1", { w: 1280, h: 720 });
  await p.waitFor(`!!document.querySelector('[data-testid="victory-wait"]')`, "aviso de espera da revanche");
  assert.equal((await p.text()).includes("Jogar de novo"), false);
  assert.equal(await p.eval<boolean>(`!document.querySelector('[data-testid="revanche"]')`), true);
  await p.waitFor(`document.querySelectorAll('[data-testid="placar-linhas"] li').length === 4`, "espectador também vê o placar da noite");
  noErrors(p);
});

test("espectador: quem abre a sala em andamento assiste, os jogadores veem o 👁 e ninguém erra", async () => {
  const { id, ps } = await game(["Ana", "Bia", "Caio"], { w: 1280, h: 720 });
  const vigia = await open(`/room/${id}?name=Vigia`, { w: 1280, h: 720 });
  await vigia.waitFor(`!!document.querySelector('[data-testid="spectator-notice"]')`, "espectador vê o aviso");
  const dom = await vigia.eval<{ zones: number; seats: number; voce: boolean }>(`(() => ({
    zones: document.querySelectorAll('[data-zone]').length,
    seats: document.querySelectorAll('[data-seat]').length,
    voce: document.body.innerText.includes('(você)'),
  }))()`);
  assert.equal(dom.zones, 0, "espectador com botões de jogo");
  assert.equal(dom.seats, 3, "ele vê os 3 jogadores");
  assert.equal(dom.voce, false);
  // Os jogadores veem o contador de espectadores no cabeçalho.
  await ps[0].waitFor(`document.querySelector('[data-testid="spectators-chip"]')?.innerText.includes('1')`, "👁 1 na sala");
  // A partida segue normal para quem joga: Ana joga Renda e o espectador acompanha.
  await ps[0].click('[data-zone="basicas"] button', "Renda");
  await waitCoins(vigia, "Ana", 3);
  assert.deepEqual(await layoutIssues(vigia), []);
  noErrors(vigia, ...ps);
});

test("espectador: com 6 jogadores no lobby, o 7º vê a sala de espera como espectador", async () => {
  const id = room();
  const jogadores: Page[] = [];
  for (const n of ["A1", "B2", "C3", "D4", "E5", "F6"]) {
    const p = await open(`/room/${id}?name=${n}`);
    await p.waitText(`${n} (você)`);
    jogadores.push(p);
  }
  const extra = await open(`/room/${id}?name=Sobrando`);
  await extra.waitFor(`!!document.querySelector('[data-testid="spectator-notice"]')`, "aviso de sala cheia");
  assert.match(await extra.text(), /Sala cheia/);
  assert.equal((await extra.text()).includes("Iniciar jogo"), false);
  await jogadores[0].waitFor(`!!document.querySelector('[data-testid="lobby-spectators"]')`, "lista de espectadores no lobby");
  noErrors(extra, ...jogadores);
});

// ── Páginas de revisão não podem quebrar ─────────────────────────────────────
for (const path of ["/dev/cartas", "/dev/colinha", "/dev/mesa", "/dev/mesa?fase=reacao&n=6", "/dev/mesa?fase=revelar&n=3", "/dev/mesa?fase=troca&n=2", "/dev/mesa?fase=fim&n=4", "/dev/mesa?fase=contestar&n=4"]) {
  test(`página de revisão ${path} renderiza sem erros`, async () => {
    const p = await open(path);
    await p.waitFor(`document.body.innerText.length > 40`, "conteúdo");
    await new Promise((r) => setTimeout(r, 600)); // deixa efeitos/cargas de imagem assentarem
    assert.ok(!(await p.text()).includes("couldn't load"));
    noErrors(p);
  });
}
