// Gera as imagens do README (docs/img/*.png) com o jogo de verdade: sobe o servidor de
// produção, abre abas no Chrome headless (mesmo driver do E2E), joga e tira os prints.
// Exige `npm run build` antes. Uso: npx tsx tools/readme-shots.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { Browser, type Page } from "../tests/e2e/helpers/browser";
import { startServer } from "../tests/e2e/helpers/server";

const OUT = join(process.cwd(), "docs", "img");
const ART = join(process.cwd(), "public", "art", "imperio");
const SIZE = { w: 1600, h: 900 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function save(name: string, png: Buffer, width = 1280): Promise<void> {
  const out = await sharp(png).resize({ width }).png({ palette: true, quality: 92, compressionLevel: 9 }).toBuffer();
  writeFileSync(join(OUT, `${name}.png`), out);
  console.log(`  ${name}.png  ${(out.length / 1024).toFixed(0)} KB`);
}

const imagesLoaded = `[...document.images].every(i => i.complete && i.naturalWidth > 0)`;

/** Aba em primeiro plano (aba de fundo congela animações) e imagens carregadas. */
async function ready(p: Page, settleMs = 900): Promise<void> {
  await p.waitFor(imagesLoaded, "imagens carregadas");
  await p.mouseTo("body", 0.02, 0.98); // traz a aba para a frente sem clicar em nada
  await sleep(settleMs);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const browser = await Browser.launch();
  const pages: Page[] = [];
  const open = async (path: string) => {
    const p = await browser.open(`${server.url}${path}`, SIZE);
    pages.push(p);
    return p;
  };
  try {
    // 1) Menu
    const home = await open("/");
    await home.waitFor(`document.querySelector('[data-testid="home-fan"]')`, "menu");
    await ready(home);
    await save("menu", await home.screenshot());

    // 2) Sala de espera com 4 jogadores
    const names = ["Ana", "Bia", "Caio", "Davi"];
    const room = "DEMO" + Math.floor(Math.random() * 9);
    const ps: Page[] = [];
    for (const n of names) {
      const p = await open(`/room/${room}?name=${n}`);
      await p.waitText(`${n} (você)`);
      ps.push(p);
    }
    await ps[0].waitFor(`document.querySelectorAll('li[data-avatar]').length === 4`, "4 no lobby");
    await ready(ps[0]);
    await save("lobby", await ps[0].screenshot());

    // 3) Partida: Ana declara Taxas; a Bia vê a carta na mesa e os selos de reação
    await ps[0].click("button", "Iniciar jogo");
    for (const p of ps) await p.waitFor(`document.querySelector('[data-testid="dock"]')`, "dock");
    await sleep(2500); // distribuição das cartas
    await ps[0].click('[data-zone="centro"] [title="Barão do Café"]');
    await ps[1].waitFor(`document.querySelectorAll('[data-zone="reacoes"] .seal').length === 2`, "selos de reação");
    await ready(ps[1], 1400);
    await save("mesa", await ps[1].screenshot());

    // 3b) Colinha aberta por cima da mesa, na aba do Caio
    await ps[2].click('[data-testid="cheatsheet-toggle"]');
    await ps[2].waitFor(`!!document.querySelector('[data-testid="cheatsheet"][role="dialog"]')`, "colinha aberta");
    await ready(ps[2], 900);
    await save("colinha", await ps[2].screenshot());

    // 4) Mesa cheia (6 jogadores) no começo da partida
    const room6 = "SEIS" + Math.floor(Math.random() * 9);
    const six: Page[] = [];
    for (const n of ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"]) {
      const p = await open(`/room/${room6}?name=${n}`);
      await p.waitText(`${n} (você)`);
      six.push(p);
    }
    await six[0].waitFor(`document.querySelectorAll('li[data-avatar]').length === 6`, "6 no lobby");
    await six[0].click("button", "Iniciar jogo");
    await six[0].waitFor(`document.querySelector('[data-testid="dock"]')`, "dock");
    await sleep(2500);
    await ready(six[0], 600);
    await save("mesa-6-jogadores", await six[0].screenshot());

    // 5) Páginas de revisão: contestação (quem perdeu escolhe a carta), tela de vitória e selos
    for (const [file, path, wait] of [
      ["contestacao", "/dev/mesa?fase=revelar&n=4", 1200],
      ["vitoria", "/dev/mesa?fase=fim&n=4", 1500],
      ["selos", "/dev/selos", 800],
    ] as const) {
      const p = await open(path);
      await p.waitFor(`document.body.innerText.length > 40`, file);
      await ready(p, wait);
      await save(file, await p.screenshot());
    }
  } finally {
    for (const p of pages) p.close();
    await browser.close();
    server.stop();
  }

  // 6) Montagens de arte (direto dos PNGs do jogo, ampliados sem suavizar)
  const chars = ["duque", "assassino", "capitao", "embaixador", "condessa"];
  const S = 3;
  const cards = await Promise.all(
    chars.map(async (c) => sharp(join(ART, c, "neutro.png")).resize({ width: 88 * S, kernel: "nearest" }).png().toBuffer()),
  );
  const gap = 24, pad = 36;
  const w = chars.length * 88 * S + (chars.length - 1) * gap + pad * 2, h = 124 * S + pad * 2;
  const bg = await sharp(join(ART, "mesa.png")).resize({ width: w, height: h, fit: "cover", kernel: "lanczos3" }).blur(5).modulate({ brightness: 0.55 }).png().toBuffer();
  const sheet = await sharp(bg).composite(cards.map((input, i) => ({ input, left: pad + i * (88 * S + gap), top: pad }))).png().toBuffer();
  await save("personagens", sheet, w);

  const slugs = ["ator", "capitao_porto", "colono", "dama_corte", "doceira", "estudante", "frei", "jovem_barao", "medico", "parteira", "professora", "ribeirinho"];
  const AS = 2, cw = 64 * AS, ch = 92 * AS, ag = 14, apad = 24, cols = 6;
  const aw = cols * cw + (cols - 1) * ag + apad * 2, ah = 2 * ch + ag + apad * 2;
  const avs = await Promise.all(slugs.map((s) => sharp(join(ART, "avatares", `${s}.png`)).resize({ width: cw, kernel: "nearest" }).png().toBuffer()));
  const abg = await sharp(join(ART, "mesa.png")).resize({ width: aw, height: ah, fit: "cover" }).blur(5).modulate({ brightness: 0.5 }).png().toBuffer();
  await save("convidados", await sharp(abg).composite(avs.map((input, i) => ({ input, left: apad + (i % cols) * (cw + ag), top: apad + Math.floor(i / cols) * (ch + ag) }))).png().toBuffer(), aw);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
