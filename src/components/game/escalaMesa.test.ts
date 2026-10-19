// Escala da mesa em degraus (P06 / DEC-13): limiares puros + guarda da migração. Não há jsdom:
// a parte de migração lê os arquivos (mesmo estilo de src/components/ui/migracao.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ESCALA_MAX, ESCALA_MIN, escalaDoPalco, estiloEscalaMesa, PALCO, px, U, unidadeDoKit } from "./escalaMesa";

describe("escalaDoPalco: o palco 1280x680 cabe na área, em passos de 0,05", () => {
  const casos: Array<[largura: number, altura: number, esperado: number]> = [
    [1280, 680, 1], // referência
    [1920, 855, 1.25], // 1080p com barra do navegador e cabeçalho (a queixa de 19/10)
    [1920, 1000, 1.45],
    [2560, 1300, 1.9],
    [1280, 600, 0.85], // notebook: encolhe em vez de cortar
    [3840, 2160, 3], // teto
    [700, 400, 0.6], // piso
  ];
  for (const [l, a, esperado] of casos) {
    it(`${l}x${a} -> ${esperado}`, () => {
      assert.equal(escalaDoPalco(l, a), esperado);
    });
  }

  it("o palco escalado nunca passa da área (dentro do piso e do teto)", () => {
    for (let l = 800; l <= 3800; l += 37)
      for (let a = 450; a <= 2100; a += 41) {
        const e = escalaDoPalco(l, a);
        if (e > ESCALA_MIN && e < ESCALA_MAX) {
          assert.ok(PALCO.largura * e <= l + 1e-6 && PALCO.altura * e <= a + 1e-6, `${l}x${a} -> ${e}`);
        }
      }
  });

  it("valores inválidos (0, negativo, NaN, Infinity) dão 1", () => {
    for (const [l, a] of [[0, 0], [-1920, 1080], [NaN, 1080], [Infinity, Infinity]] as const) {
      assert.equal(escalaDoPalco(l, a), 1, `${l}x${a}`);
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
    assert.deepEqual(estiloEscalaMesa(1.5), { "--mu": "1.5px", "--u": "5px" });
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

  it("Seat e Table: o assento é a caixa 176x124 do mockup e a mesa posiciona em unidades do palco", () => {
    const seat = ler("src/components/game/Seat.tsx");
    assert.ok(seat.includes("ASSENTO_W = 176") && seat.includes("width: U(ASSENTO_W)"));
    assert.ok(ler("src/components/game/Table.tsx").includes("left: U(layout[i].cx - ASSENTO_W / 2)"));
    for (const f of ["BasicActions"]) {
      const t = ler(`src/components/game/${f}.tsx`);
      assert.ok(t.includes("width: U(240)") && !/width:\s*240\b/.test(t), f);
    }
  });

  it("GameBoard: palco de tamanho base, dock com a altura que sobra e --mu medido na área", () => {
    const t = ler("src/components/game/GameBoard.tsx");
    assert.ok(t.includes("const DOCK_HEIGHT = U(PALCO.altura - PALCO.mesa)"));
    assert.ok(t.includes("width: U(PALCO.largura)") && t.includes("height: U(PALCO.altura)"));
    assert.ok(t.includes("useEscalaMesa()") && t.includes("ref={area}") && t.includes("...escalaStyle"));
  });


  it("useEscalaMesa: começa em 1 (SSR) e mede o contêiner com ResizeObserver", () => {
    const t = ler("src/components/game/useEscalaMesa.ts");
    assert.ok(t.includes("useState<Escala>(1)") && t.includes("ResizeObserver"));
  });
});
