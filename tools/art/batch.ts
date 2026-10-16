// Lote de geração de arte, retomável e desacoplado da sessão do Claude.
//   npx tsx tools/art/batch.ts [manifesto.json]   (padrão: tools/art/batch/noite.json)
// Roda os jobs em ordem de prioridade chamando generate.ts com --skip-existing, mantém
// ~/ai-art/noite/STATUS.md atualizado a cada job e, no fim, monta as folhas de contato.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

interface Job {
  id: string;
  args: string[];
}
interface Result extends Job {
  ok: boolean;
  segundos: number;
  novas: number;
}

const home = process.env.SD_HOME ?? join(homedir(), "ai-art");
const noite = join(home, "noite");
mkdirSync(noite, { recursive: true });
const manifestPath = resolve(process.argv[2] ?? join("tools", "art", "batch", "noite.json"));
const jobs = (JSON.parse(readFileSync(manifestPath, "utf8")) as { jobs: Job[] }).jobs;

const countOut = (): number => readdirSync(join(home, "out")).filter((f) => f.endsWith(".png")).length;
const t0 = Date.now();
const results: Result[] = [];

function writeStatus(estado: string, atual?: string): void {
  const min = Math.round((Date.now() - t0) / 60000);
  const linhas = [
    "# Lote noturno — status",
    "",
    `- Estado: **${estado}**${atual ? ` (agora: ${atual})` : ""}`,
    `- Decorrido: ${min} min · imagens na pasta de saída: ${countOut()}`,
    `- Atualizado: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "| Job | Resultado | Novas imagens | Tempo |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.id} ${r.args.join(" ")} | ${r.ok ? "ok" : "FALHOU"} | ${r.novas} | ${Math.round(r.segundos / 60)} min |`),
    "",
    "Folhas de contato (quando prontas): `~/ai-art/noite/folhas/`.",
  ];
  writeFileSync(join(noite, "STATUS.md"), linhas.join("\n") + "\n");
}

writeStatus("iniciando");
for (const job of jobs) {
  const antes = countOut();
  const ini = Date.now();
  writeStatus("rodando", `${job.id} ${job.args.join(" ")}`);
  console.log(`\n=== ${job.id} ${job.args.join(" ")} ===`);
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", join("tools", "art", "generate.ts"), job.id, ...job.args, "--skip-existing"],
    { stdio: "inherit" },
  );
  results.push({ ...job, ok: r.status === 0, segundos: (Date.now() - ini) / 1000, novas: countOut() - antes });
  writeStatus("rodando");
}

writeStatus("montando folhas de contato");
for (const id of new Set(jobs.map((j) => j.id))) {
  spawnSync(process.execPath, ["--import", "tsx", join("tools", "art", "sheet.ts"), id], { stdio: "inherit" });
}
writeStatus("CONCLUÍDO");
console.log("\nlote concluído");
