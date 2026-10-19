// Sobe o build, cria uma sala REAL com N jogadores (abas), inicia a partida e salva o print da
// visão do primeiro jogador + medidas da cadeia de alturas (main > fundo > área > palco).
// Uso: npm run build && npx tsx tools/visual/sala.ts <pasta> [largura] [altura] [n]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Browser } from "../../tests/e2e/helpers/browser";
import { startServer } from "../../tests/e2e/helpers/server";

async function main() {
  const [saida = "capturas", w = "1920", h = "940", n = "3"] = process.argv.slice(2);
  mkdirSync(saida, { recursive: true });
  const server = await startServer();
  const browser = await Browser.launch();
  try {
    const nomes = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fabio"].slice(0, Number(n));
    const sala = `V${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const ps = [];
    for (const nome of nomes) {
      const p = await browser.open(`${server.url}/room/${sala}?name=${nome}`, { w: Number(w), h: Number(h) }, { reducedMotion: true });
      await p.waitText(`${nome} (você)`);
      ps.push(p);
    }
    await ps[0].waitText(nomes[nomes.length - 1]);
    await ps[0].click("button", "Iniciar jogo");
    await ps[0].waitFor(`document.querySelector('[data-testid="dock"]')`, "dock");
    await new Promise((r) => setTimeout(r, 1200));
    console.log(JSON.stringify(await ps[0].eval(`(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      const palco = document.querySelector('[data-palco]');
      return { janela: [innerWidth, innerHeight], main: r(document.querySelector('main')), header: r(document.querySelector('header')),
        area: r(palco?.parentElement), fundo: r(palco?.parentElement?.parentElement?.parentElement), palco: r(palco),
        dock: r(document.querySelector('[data-testid="dock"]')), mu: getComputedStyle(palco).getPropertyValue('--mu'), inline: palco?.parentElement?.getAttribute('style'), ro: typeof ResizeObserver };
    })()`)));
    writeFileSync(join(saida, `sala-n${n}-${w}x${h}.png`), await ps[0].screenshot());
    if (ps[0].errors.length) console.log("ERROS:", ps[0].errors.join(" | "));
    for (const p of ps) p.close();
  } finally {
    await browser.close();
    server.stop();
  }
}
void main();
