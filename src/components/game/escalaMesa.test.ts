// Escala da mesa em degraus (P06 / DEC-13): limiares puros + guarda da migração. Não há jsdom:
// a parte de migração lê os arquivos (mesmo estilo de src/components/ui/migracao.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { escalaDaTela, estiloEscalaMesa, px, U, unidadeDoKit } from "./escalaMesa";

describe("escalaDaTela: degraus 1, 1,5 e 2 pela MENOR relação largura/1280 e altura/720", () => {
  const casos: Array<[largura: number, altura: number, esperado: 1 | 1.5 | 2]> = [
    [1280, 720, 1], // referência
    [1366, 768, 1],
    [1440, 900, 1],
    [1600, 900, 1], // largura sobra, mas 1,5x não cabe na altura (dock fixo)
    [1920, 1080, 1.5],
    [1920, 1066, 1.5], // folga mínima: 1066 é o menor valor que ainda dá 1,5x
    [1920, 1050, 1], // com barra de tarefas: a altura não comporta 1,5x
    [1920, 950, 1], // janela comum num monitor 1080p (barra do navegador): a altura manda
    [2560, 1080, 1.5], // ultrawide: a altura limita
    [3840, 1080, 1.5],
    [2560, 1440, 2],
    [3840, 2160, 2],
    [5120, 2880, 2], // nunca passa de 2
  ];
  for (const [l, a, esperado] of casos) {
    it(`${l}x${a} -> ${esperado}`, () => {
      assert.equal(escalaDaTela(l, a), esperado);
    });
  }

  it("janelas estreitas ou baixas ficam em 1, mesmo que o outro eixo seja enorme", () => {
    assert.equal(escalaDaTela(375, 667), 1);
    assert.equal(escalaDaTela(800, 600), 1);
    assert.equal(escalaDaTela(3840, 600), 1);
    assert.equal(escalaDaTela(900, 2160), 1);
    assert.equal(escalaDaTela(1, 1), 1);
  });

  it("limiares exatos: 1,5x em 1895x1066 e 2x em 2535x1426; um pixel abaixo cai um degrau", () => {
    assert.equal(escalaDaTela(1895, 1066), 1.5);
    assert.equal(escalaDaTela(1894, 1066), 1);
    assert.equal(escalaDaTela(1895, 1065), 1);
    assert.equal(escalaDaTela(2535, 1426), 2);
    assert.equal(escalaDaTela(2534, 1426), 1.5);
    assert.equal(escalaDaTela(2535, 1425), 1.5);
  });

  it("valores inválidos (0, negativo, NaN, Infinity) dão 1", () => {
    for (const [l, a] of [
      [0, 0],
      [0, 1080],
      [1920, 0],
      [-1920, 1080],
      [1920, -1080],
      [NaN, 1080],
      [1920, NaN],
      [Infinity, Infinity],
      [1920, Infinity],
    ] as const) {
      assert.equal(escalaDaTela(l, a), 1, `${l}x${a}`);
    }
  });

  it("é monotônica: tela maior nunca dá degrau menor", () => {
    let anterior = 1;
    for (let l = 1000; l <= 3000; l += 40) {
      const e = escalaDaTela(l, Math.round((l * 9) / 16));
      assert.ok(e >= anterior, `${l}`);
      anterior = e;
    }
  });
});

describe("px, U e custom properties", () => {
  it("px multiplica as unidades pelo degrau", () => {
    assert.equal(px(214, 1), 214);
    assert.equal(px(214, 1.5), 321);
    assert.equal(px(96, 2), 192);
  });

  it("U monta o calc com fallback de 1px (fora da mesa o tamanho é o antigo)", () => {
    assert.equal(U(40), "calc(var(--mu, 1px) * 40)");
    assert.equal(U(-18), "calc(var(--mu, 1px) * -18)");
    assert.equal(U(12.5), "calc(var(--mu, 1px) * 12.5)");
  });

  it("o contêiner recebe --mu (mesa) e --u (kit, mesma proporção; 1x = 3px, o padrão da raiz)", () => {
    assert.deepEqual(estiloEscalaMesa(1), { "--mu": "1px", "--u": "3px" });
    assert.deepEqual(estiloEscalaMesa(1.5), { "--mu": "1.5px", "--u": "4px" });
    assert.deepEqual(estiloEscalaMesa(2), { "--mu": "2px", "--u": "6px" });
    assert.equal(unidadeDoKit(1), 3);
  });
});

// ── Guarda da migração ───────────────────────────────────────────────────────
const raiz = fileURLToPath(new URL("../../../", import.meta.url));
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const MIGRADOS = [
  "Card",
  "Seat",
  "Table",
  "GameBoard",
  "HandView",
  "BasicActions",
  "ReactionTray",
  "ClaimCard",
  "ActionSeal",
  "DragGhost",
  "IntrigueFeed",
  "AutoPassToggle",
].map((n) => `src/components/game/${n}.tsx`);

describe("migração para a escala da mesa", () => {
  it("o helper U define o calc com --mu (e não o --u do kit de UI)", () => {
    const src = ler("src/components/game/escalaMesa.ts");
    assert.ok(src.includes("calc(var(--mu, 1px) * "), "U sem calc(var(--mu");
  });

  it("todo componente migrado importa e usa U(), e nenhum usa o --u do kit direto", () => {
    for (const rel of MIGRADOS) {
      const t = ler(rel);
      assert.ok(/from "\.\/escalaMesa"/.test(t), `${rel}: sem import de escalaMesa`);
      assert.ok(/\bU\(/.test(t), `${rel}: sem U()`);
      assert.ok(!t.includes("var(--u)"), `${rel}: usa o --u do kit; a mesa usa U()`);
    }
  });

  it("nenhum tamanho de 2+ dígitos fica em px fixo nos componentes migrados", () => {
    // width: 96, fontSize: 13.5, top: -10, padding: "2px 10px", translateY(-12px)...
    const numerico = /\b(width|height|minWidth|minHeight|maxWidth|maxHeight|fontSize|gap|top|left|right|bottom|margin\w*|padding\w*|borderRadius)\s*:\s*-?\d{2,}/;
    // px de 2+ dígitos, ou sombra "0 4px 14px" / drop-shadow(0 14px ...) com medida literal.
    const emPx = /\b\d{2,}px\b|["'`(]\s*(inset\s+)?0\s+-?\d+px\s+\d+px/;
    const achados: string[] = [];
    for (const rel of MIGRADOS) {
      ler(rel)
        .split("\n")
        .forEach((linha, i) => {
          const codigo = linha
            .replace(/\/\/.*$/, "")
            .replace(/\{\/\*.*?\*\/\}/g, "")
            .replace(/borderRadius:\s*999\b/, "") // pílula: raio "infinito", não escala
            .replace(/textShadow:\s*"[^"]*"/g, ""); // sombra de 1px de legibilidade, não escala
          if (numerico.test(codigo) || emPx.test(codigo)) achados.push(`${rel}:${i + 1}: ${linha.trim()}`);
        });
    }
    assert.deepEqual(achados, []);
  });

  it("Card: DIMS são unidades da mesa e o tamanho final passa por U()", () => {
    const t = ler("src/components/game/Card.tsx");
    assert.ok(t.includes("width: U(d.w)") && t.includes("height: U(d.h)"));
    assert.ok(!/width:\s*d\.w\b/.test(t), "width: d.w em px direto");
    assert.ok(t.includes("sm: { w: 40, h: 56") && t.includes("lg: { w: 88, h: 124"), "DIMS mudaram de proporção");
  });

  it("Seat, Table, dock e bandejas: as medidas antigas em px sumiram", () => {
    assert.ok(!/width:\s*96\b/.test(ler("src/components/game/Seat.tsx")));
    assert.ok(ler("src/components/game/Seat.tsx").includes("width: U(96)"));
    assert.ok(ler("src/components/game/Table.tsx").includes("minHeight: U(420)"));
    for (const f of ["BasicActions", "ReactionTray"]) {
      const t = ler(`src/components/game/${f}.tsx`);
      assert.ok(t.includes("width: U(208)") && !/width:\s*208\b/.test(t), f);
    }
  });

  it("GameBoard: DOCK_HEIGHT e a faixa do feed são escalados e o contêiner recebe --mu pelo hook", () => {
    const t = ler("src/components/game/GameBoard.tsx");
    assert.ok(t.includes("const DOCK_HEIGHT = U(214)"));
    assert.ok(t.includes("const FEED_LANE = U(232)"));
    assert.ok(!/DOCK_HEIGHT\s*=\s*\d/.test(t) && !/FEED_LANE\s*=\s*\d/.test(t));
    assert.ok(t.includes("useEscalaMesa()") && t.includes("...escalaStyle"));
    assert.ok(t.includes("height: DOCK_HEIGHT"));
  });

  it("ClaimCard: o anel é um SVG com viewBox em unidades (perímetro independente do degrau)", () => {
    const t = ler("src/components/game/ClaimCard.tsx");
    assert.ok(t.includes("viewBox="));
    assert.ok(!t.includes("<svg width={W}"));
  });

  it("useEscalaMesa: SSR devolve 1 e o resize é debounced", () => {
    const t = ler("src/components/game/useEscalaMesa.ts");
    assert.ok(t.includes("useSyncExternalStore"));
    assert.ok(/fotoServidor\s*=\s*\(\):\s*Escala\s*=>\s*1/.test(t), "snapshot do servidor deve ser 1");
    assert.ok(t.includes("setTimeout") && t.includes('addEventListener("resize"'));
  });
});
