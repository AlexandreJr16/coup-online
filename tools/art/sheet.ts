// Folha de contato: junta as imagens geradas de um prompt numa grade com legenda
// (expressão + seed) para curar de olho. Uso:
//   npx tsx tools/art/sheet.ts <id-do-prompt> [--out pasta] [--cols 6] [--thumb 200]
// Lê $SD_HOME/out/<id>_<expr>_s<seed>.png (padrão ~/ai-art/out). Escreve <out>/<id>_pN.png.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const id = args[0];
  if (!id) throw new Error("Uso: sheet.ts <id> [--out pasta] [--cols 6] [--thumb 200]");
  const flag = (n: string, d: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const home = process.env.SD_HOME ?? join(homedir(), "ai-art");
  const dir = join(home, "out");
  const outDir = flag("out", join(home, "noite", "folhas"));
  const cols = Number(flag("cols", "6"));
  const thumbW = Number(flag("thumb", "200"));
  mkdirSync(outDir, { recursive: true });

  const prefix = `${id}_`;
  const items = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && /_s\d+\.png$/.test(f))
    .map((f) => {
      const m = /^(.*)_s(\d+)\.png$/.exec(f.slice(prefix.length));
      return { file: join(dir, f), expr: m?.[1] ?? "?", seed: Number(m?.[2] ?? 0) };
    })
    .sort((a, b) => a.expr.localeCompare(b.expr) || a.seed - b.seed);
  if (items.length === 0) {
    console.log(`(sem imagens para ${id})`);
    return;
  }

  const PER_PAGE = cols * 5;
  const CAP = 22;
  for (let page = 0; page * PER_PAGE < items.length; page++) {
    const slice = items.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const thumbs = await Promise.all(
      slice.map(async (it) => {
        const buf = await sharp(it.file).resize({ width: thumbW, kernel: "nearest" }).png().toBuffer();
        const meta = await sharp(buf).metadata();
        return { ...it, buf, h: meta.height ?? thumbW };
      }),
    );
    const rows = Math.ceil(thumbs.length / cols);
    const rowH = Array.from({ length: rows }, (_, r) =>
      Math.max(...thumbs.slice(r * cols, (r + 1) * cols).map((t) => t.h)) + CAP,
    );
    const W = cols * (thumbW + 8) + 8;
    const H = rowH.reduce((a, b) => a + b + 8, 8);
    const comps: sharp.OverlayOptions[] = [];
    let y = 8;
    for (let r = 0; r < rows; r++) {
      thumbs.slice(r * cols, (r + 1) * cols).forEach((t, c) => {
        const x = 8 + c * (thumbW + 8);
        comps.push({ input: t.buf, left: x, top: y });
        const label = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${thumbW}" height="${CAP}"><text x="2" y="15" font-family="sans-serif" font-size="13" fill="#e8e0d0">${esc(t.expr)} · s${t.seed}</text></svg>`,
        );
        comps.push({ input: label, left: x, top: y + t.h + 2 });
      });
      y += rowH[r] + 8;
    }
    const out = join(outDir, `${id}_p${page + 1}.png`);
    await sharp({ create: { width: W, height: H, channels: 3, background: "#14101a" } })
      .composite(comps)
      .png()
      .toFile(out);
    console.log(`ok ${out} (${slice.length} imagens)`);
  }
  if (!existsSync(outDir)) throw new Error("pasta de saída não criada");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
