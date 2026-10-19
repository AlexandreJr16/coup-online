// Ciclo de polimento visual: sobe o build de produção, abre /dev/mesa em várias fases, números de
// jogadores e resoluções, salva PNGs e imprime as sobreposições entre peças da mesa.
// Uso: npm run build && [FONTES=pixelify,silkscreen,vt323,press] npx tsx tools/visual/capturas.ts <pasta-de-saída> [filtro]
//   filtro opcional casa com o nome do arquivo (ex.: "1920x940" ou "reacao-n4").
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Browser } from "../../tests/e2e/helpers/browser";
import { startServer } from "../../tests/e2e/helpers/server";

const SAIDA = process.argv[2] ?? "capturas";
const FILTRO = process.argv[3] ?? "";
const TAMANHOS = [
  { w: 1280, h: 720 },
  { w: 1920, h: 940 }, // 1080p com a barra do navegador
  { w: 2560, h: 1300 },
];
const FASES = ["turno", "reacao", "extorquir", "contestar", "revelar", "troca", "fim"];
const FONTES = (process.env.FONTES ?? "pixelify").split(",");
const NS = [2, 4, 6];

// Peças que não podem se cobrir (seletor -> rótulo).
const PECAS = `{
  assento: '[data-seat]',
  legenda: '[data-testid="center-caption"]',
  jogada: '[data-testid="claim-plate"]',
  erario: '[data-erario]',
  baralho: '[data-deck]',
  feed: '[data-feed]',
  balao: '[data-seat-balloon]',
  basicas: '[data-zone="basicas"]',
  centro: '[data-zone="centro"]',
  reacoes: '[data-zone="reacoes"]',
}`;

const SONDA = `(() => {
  const P = ${PECAS};
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const itens = [];
  for (const [k, sel] of Object.entries(P))
    document.querySelectorAll(sel).forEach((el, i) => { const b = box(el); if (b.w && b.h) itens.push({ k: k + (el.dataset.seat ? ':' + el.dataset.seat : i ? ':' + i : ''), el, b }); });
  const cobre = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const out = [];
  for (let i = 0; i < itens.length; i++) for (let j = i + 1; j < itens.length; j++) {
    const A = itens[i], B = itens[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const area = cobre(A.b, B.b);
    if (area > 16) out.push(A.k + ' x ' + B.k + ' (' + Math.round(area) + 'px²)');
  }
  // texto que sai da própria caixa (rótulo estourado)
  document.querySelectorAll('[data-palco] span, [data-palco] b, [data-palco] button, [data-palco] div').forEach((el) => {
    const cs = getComputedStyle(el);
    if (el.children.length === 0 && el.textContent.trim() && cs.display !== 'inline' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis')
      out.push('texto estourado: ' + el.textContent.trim().slice(0, 24));
    else if (el.children.length === 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow === 'ellipsis')
      out.push('cortado com reticências: ' + el.textContent.trim().slice(0, 24));
  });
  for (const it of itens) if (it.b.l < 0 || it.b.t < 0 || it.b.r > innerWidth + 0.5 || it.b.b > innerHeight + 0.5) out.push(it.k + ' fora da tela');
  return out;
})()`;

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  const server = await startServer();
  const browser = await Browser.launch();
  try {
    for (const t of TAMANHOS)
      for (const n of NS)
        for (const fase of FASES)
         for (const fonte of FONTES) {
          const nome = `${fase}-n${n}-${t.w}x${t.h}${fonte === "pixelify" ? "" : "-" + fonte}`;
          if (FILTRO && !nome.includes(FILTRO)) continue;
          const p = await browser.open(`${server.url}/dev/mesa?fase=${fase}&n=${n}&restante=30`, t, { reducedMotion: true });
          if (fonte !== "pixelify") await p.eval(`document.documentElement.setAttribute('data-fonte', '${fonte}')`);
          await p.eval(`document.fonts.ready.then(() => true)`);
          await new Promise((r) => setTimeout(r, 900));
          const problemas = (await p.eval(SONDA)) as string[];
          writeFileSync(join(SAIDA, `${nome}.png`), await p.screenshot());
          console.log(`${nome}: ${problemas.length ? problemas.join(" | ") : "ok"}${p.errors.length ? " ERROS: " + p.errors.join(" | ") : ""}`);
          p.close();
        }
  } finally {
    await browser.close();
    server.stop();
  }
}
void main();
