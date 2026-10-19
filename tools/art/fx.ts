// CLI do gerador procedural de FX (VIDA_E_BLEFE 13). Determinístico: duas execuções geram os
// mesmos bytes. Uso:
//   npx tsx tools/art/fx.ts [grupo|todos] [--out pasta] [--folha arquivo.png] [--zoom 3] [--lista]
// Padrão de saída: public/art/imperio/fx/<grupo>/<nome>/<quadro>.png (+ .sm.png quando existe).
// `--folha` escreve uma folha de contato ampliada (sem tocar no repositório se o caminho for fora).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GRUPOS, gerarGrupo, gerarTudo, gravar } from "./fx/gerar";
import { folhaDeContato } from "./fx/sheet";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function main(): void {
  const args = process.argv.slice(2);
  const flag = (n: string): string | undefined => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
  if (args.includes("--lista")) {
    console.log(Object.keys(GRUPOS).join("\n"));
    return;
  }
  const valores = new Set(["--out", "--folha", "--zoom"].map((f) => args.indexOf(f) + 1).filter((i) => i > 0));
  const grupo = args.find((a, i) => !a.startsWith("--") && !valores.has(i)) ?? "todos";
  const pecas = grupo === "todos" ? gerarTudo() : gerarGrupo(grupo);
  const saida = resolve(flag("out") ?? join(RAIZ, "public", "art", "imperio", "fx"));
  const escritos = gravar(saida, pecas);
  console.log(`${escritos.length} PNG(s) em ${saida}`);
  const folha = flag("folha");
  if (folha) {
    const zoom = Number(flag("zoom") ?? "3");
    const destino = resolve(folha);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, folhaDeContato(pecas).pngAmpliado(zoom));
    console.log(`folha de contato: ${destino}`);
  }
}

main();
