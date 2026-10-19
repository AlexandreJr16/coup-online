// Captura o palco do mockup aprovado (/dev/v3/mesa) para comparar com a mesa real.
// Uso: npm run build && npx tsx tools/visual/mockup.ts <pasta-de-saída>
import { writeFileSync } from "node:fs";
import { Browser } from "../../tests/e2e/helpers/browser";
import { startServer } from "../../tests/e2e/helpers/server";
async function m() {
const out = process.argv[2];
const s = await startServer(); const b = await Browser.launch();
for (const [path, w, h, nome] of [["/dev/v3/mesa?n=4&res=1280&acao=taxas", 1330, 1460, "mock-n4-1280"], ["/dev/v3/mesa?n=2&res=1280&acao=assassinar", 1330, 1460, "mock-n2-1280"]] as const) {
  const p = await b.open(s.url + path, { w, h }, { reducedMotion: true });
  await new Promise((r) => setTimeout(r, 1200));
  writeFileSync(`${out}/${nome}.png`, await p.screenshot()); p.close();
}
await b.close(); s.stop();
} void m();
