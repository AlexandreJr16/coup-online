// Confere a consistência dos documentos de docs/plano (P02.S4):
// cobertura do rastreio, ciclos no grafo de dependências e regra de ondas.
// Uso: npm run plano:check
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ID_RE = /^\| ([A-GRU]\d+) \|/gm;

/** IDs do índice de ideias (primeira coluna das tabelas). */
export function parseIndexIds(md: string): string[] {
  return [...md.matchAll(ID_RE)].map((m) => m[1]);
}

/** Linhas `| ID | Pnn ... |` do 00-RASTREIO.md: ID -> planos citados. */
export function parseRastreio(md: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of md.matchAll(/^\| ([A-GRU]\d+) \| (P\d\d)\b/gm)) {
    out.set(m[1], [...(out.get(m[1]) ?? []), m[2]]);
  }
  return out;
}

/** Tabela "Grafo de dependências" do 00-MESTRE.md: plano -> dependências. */
export function parseDeps(md: string, allPlans: string[]): Map<string, string[]> {
  const section = md.split("## Grafo de dependências")[1]?.split("\n## ")[0] ?? "";
  const out = new Map<string, string[]>();
  for (const m of section.matchAll(/^\| (P\d\d) \| ([^|]*) \|/gm)) {
    const cell = m[2].trim();
    if (/todos/.test(cell)) {
      const range = cell.match(/P(\d\d) a P(\d\d)/);
      out.set(m[1], range ? allPlans.filter((p) => p >= `P${range[1]}` && p <= `P${range[2]}`) : []);
    } else {
      out.set(m[1], cell.match(/P\d\d/g) ?? []);
    }
  }
  return out;
}

/** Tabela "Ondas" do 00-MESTRE.md: plano -> onda. */
export function parseWaves(md: string): Map<string, number> {
  const section = md.split("## Ondas")[1]?.split("\n## ")[0] ?? "";
  const out = new Map<string, number>();
  for (const m of section.matchAll(/^\| (\d+) \| ([^|]*) \|/gm)) {
    for (const p of m[2].match(/P\d\d/g) ?? []) out.set(p, Number(m[1]));
  }
  return out;
}

export interface PlanoDocs {
  indice: string;
  rastreio: string;
  mestre: string;
}

/** Devolve a lista de problemas; vazia = tudo consistente. */
export function checkPlano({ indice, rastreio, mestre }: PlanoDocs): string[] {
  const problems: string[] = [];

  const ids = parseIndexIds(indice);
  const dupIndex = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dupIndex)) problems.push(`ID duplicado no índice: ${id}`);

  const trace = parseRastreio(rastreio);
  for (const id of ids) {
    const plans = trace.get(id);
    if (!plans) problems.push(`ID sem plano no rastreio: ${id}`);
    else if (plans.length > 1) problems.push(`ID em mais de um plano no rastreio: ${id} (${plans.join(", ")})`);
  }
  for (const id of trace.keys()) if (!ids.includes(id)) problems.push(`ID do rastreio que não existe no índice: ${id}`);

  const allPlans = [...new Set([...(mestre.match(/^\| (P\d\d) \|/gm) ?? []).map((l) => l.slice(2, 5))])].sort();
  const deps = parseDeps(mestre, allPlans);
  const waves = parseWaves(mestre);

  for (const [plan, ds] of deps) {
    for (const d of ds) {
      if (!deps.has(d)) problems.push(`${plan} depende de plano inexistente: ${d}`);
      const wp = waves.get(plan);
      const wd = waves.get(d);
      if (wp === undefined) problems.push(`${plan} sem onda`);
      else if (wd !== undefined && wd > wp) problems.push(`onda inconsistente: ${plan} (onda ${wp}) depende de ${d} (onda ${wd})`);
    }
  }

  const state = new Map<string, 1 | 2>();
  const visit = (n: string, path: string[]): void => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) {
      problems.push(`ciclo: ${[...path.slice(path.indexOf(n)), n].join(" -> ")}`);
      return;
    }
    state.set(n, 1);
    for (const d of deps.get(n) ?? []) visit(d, [...path, n]);
    state.set(n, 2);
  };
  for (const n of deps.keys()) visit(n, []);

  return problems;
}

// Execução direta (npm run plano:check): usa os arquivos reais.
if (process.argv[1]?.endsWith("plano-check.ts")) {
  const root = process.cwd();
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const problems = checkPlano({
    indice: read("docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md"),
    rastreio: read("docs/plano/00-RASTREIO.md"),
    mestre: read("docs/plano/00-MESTRE.md"),
  });
  if (problems.length > 0) {
    console.error(problems.map((p) => `- ${p}`).join("\n"));
    process.exit(1);
  }
  console.log("plano:check ok");
}
