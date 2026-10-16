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
  // só contestar ainda não tem arte → emoji; os 11 existentes carregam.
  await p.waitFor(`[...document.querySelectorAll('[data-testid="icones"] img')].every(i => i.complete && i.naturalWidth > 0)`, "ícones carregados");
  const semArte = await p.eval<number>(`[...document.querySelectorAll('[data-testid="icones"] > div')].filter(d => d.innerText.includes("(emoji)")).length`);
  assert.equal(semArte, 1);
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
  await b.waitFor(`document.querySelector('[data-testid="claim-plate"]')?.innerText.includes("Ana · Assassinar → Bia")`, "carta jogada na mesa");
  // a carta jogada é uma carta VIRADA (verso) com anel de tempo e o lacre da ação
  assert.equal(await b.eval<number>(`document.querySelectorAll('[data-testid="claim-plate"] svg rect').length`), 2);
  assert.ok(await b.eval<boolean>(`!!document.querySelector('[data-testid="claim-plate"] img[src*="verso"]')`), "verso da carta");
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
  await b.waitFor(`document.querySelector('[data-testid="claim-plate"]')?.innerText.includes("Ana · Taxas")`, "Taxas declarada");
  noErrors(a, b);
});

test("mesa: Erário e baralho têm lugar fixo e a contagem do baralho é a real", async () => {
  const { ps } = await game(["Ana", "Bia", "Caio"]);
  await ps[0].waitFor(`document.querySelector('[data-erario]') && document.querySelector('[data-deck]')`, "Erário e baralho");
  const deck = await ps[0].eval<string>(`document.querySelector('[data-deck]').innerText`);
  assert.match(deck, /Corte · 19/); // 25 − 3×2
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

test("menu: o leque dos 5 personagens carrega e o painel tem fundo próprio (não transparente)", async () => {
  const p = await open("/");
  await p.waitFor(`document.querySelectorAll('[data-testid="home-fan"] img').length === 5`, "5 retratos no menu");
  await p.waitFor(`[...document.querySelectorAll('[data-testid="home-fan"] img')].every(i => i.complete && i.naturalWidth > 0)`, "retratos carregados");
  const bg = await p.eval<string>(`getComputedStyle(document.querySelector('.panel-salon')).backgroundImage`);
  assert.ok(bg.includes("gradient"), "painel sem fundo: " + bg);
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
      const b = document.querySelector('.panel-salon').getBoundingClientRect();
      const visible = a.width > 0 && a.left >= 0 && a.right <= innerWidth;
      const hit = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      return { a: [a.left, a.top, a.right, a.bottom], b: [b.left, b.top, b.right, b.bottom], vw: innerWidth, visible, hit };
    })()`);
    assert.ok(geo.visible && !geo.hit, `ícone invisível ou sobre o painel em ${size.w}x${size.h}: ${JSON.stringify(geo)}`);
    // Em tela baixa o conteúdo não pode ser cortado: o início aparece e a página rola até o link.
    const scroll = await p.eval<{ panelTop: number; overflowY: string; canScroll: boolean }>(`(() => {
      const m = document.querySelector('main');
      return {
        panelTop: document.querySelector('.panel-salon').getBoundingClientRect().top,
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
