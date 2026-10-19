// Mede a largura média de cada fonte da Aparência relativa à Pixelify (calibra o --fw do globals.css).
// Uso: npm run build && npx tsx tools/visual/larguras.ts
import { Browser } from "../../tests/e2e/helpers/browser";
import { startServer } from "../../tests/e2e/helpers/server";

const AMOSTRA = "Ajuda Externa Golpe de Estado Benzedeira Capoeira Aguardando você e Caio: contestar ou passar 0123456789";

async function main() {
  const server = await startServer();
  const browser = await Browser.launch();
  try {
    const p = await browser.open(`${server.url}/dev/mesa`, { w: 1280, h: 720 });
    const r: Record<string, number> = {};
    for (const f of ["pixelify", "silkscreen", "vt323", "press"]) {
      await p.eval(`document.documentElement.setAttribute('data-fonte', '${f}')`);
      r[f] = await p.eval<number>(`(async () => {
        const s = document.createElement('span');
        s.style.cssText = 'position:absolute;white-space:nowrap;font-size:100px;font-family:var(--fonte-ui)';
        s.textContent = ${JSON.stringify(AMOSTRA)};
        document.body.appendChild(s);
        await document.fonts.ready; await new Promise(r => setTimeout(r, 600)); await document.fonts.ready;
        const w = s.getBoundingClientRect().width; s.remove(); return w;
      })()`);
    }
    const base = r.pixelify;
    for (const [k, v] of Object.entries(r)) console.log(k, (base / v).toFixed(3));
    p.close();
  } finally {
    await browser.close();
    server.stop();
  }
}
void main();
