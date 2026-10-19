// Guarda da migração para o kit (P04.S4/S5, P05.S5): classes legadas fora do código e telas
// migradas sem emoji do sistema. Não há jsdom: estas checagens leem os arquivos.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../../../", import.meta.url));
const SEM_LEGADO = ["app", "src", "tests"];
const EXTENSOES = /\.(ts|tsx|css)$/;

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    if (nome === "node_modules" || nome === ".next") return [];
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : EXTENSOES.test(nome) ? [caminho] : [];
  });
}

describe("classes legadas removidas", () => {
  it("game-btn, corner-btn e repo-link nao aparecem em app/, src/ nem tests/", () => {
    const achados: string[] = [];
    for (const pasta of SEM_LEGADO) {
      for (const f of arquivos(join(raiz, pasta))) {
        if (f.endsWith("migracao.test.ts")) continue;
        const texto = readFileSync(f, "utf8");
        for (const classe of ["game-btn", "corner-btn", "repo-link"]) {
          if (texto.includes(classe)) achados.push(`${f.slice(raiz.length)}: ${classe}`);
        }
      }
    }
    assert.deepEqual(achados, []);
  });
});

describe("telas migradas sem emoji do sistema", () => {
  const migrados = [
    "app/page.tsx",
    "app/room/[id]/page.tsx",
    "src/components/game/GithubLink.tsx",
    "src/components/game/CheatSheet.tsx",
    ...arquivos(join(raiz, "src/components/ui"))
      .map((f) => f.slice(raiz.length))
      .filter((f) => f.endsWith(".tsx")),
  ];

  it("cobre as telas e o kit", () => {
    assert.ok(migrados.length >= 14, String(migrados.length));
    assert.ok(migrados.includes("src/components/ui/AparenciaPanel.tsx"));
  });

  it("nenhum caractere pictografico (emoji, ✔, ⚙, ⏱...) no codigo desses arquivos", () => {
    for (const rel of migrados) {
      const texto = readFileSync(join(raiz, rel), "utf8");
      const m = texto.match(/\p{Extended_Pictographic}/u);
      assert.equal(m, null, `${rel}: ${m?.[0]}`);
    }
  });
});
