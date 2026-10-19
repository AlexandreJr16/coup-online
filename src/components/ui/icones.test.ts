import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COROA, ICONES, retangulosDoBitmap, validarBitmap, type IconeId } from "./icones";

describe("icones do kit", () => {
  it("todo icone e um bitmap regular 12x12 so com '#' e '.'", () => {
    for (const [nome, linhas] of Object.entries(ICONES)) {
      assert.deepEqual(validarBitmap(linhas), { largura: 12, altura: 12 }, nome);
      for (const l of linhas) assert.match(l, /^[#.]+$/, `${nome}: ${l}`);
    }
  });

  it("existem os 7 icones usados pelo HUD", () => {
    const esperados: IconeId[] = ["som", "mudo", "olho", "ajuda", "sair", "engrenagem", "crt"];
    assert.deepEqual(Object.keys(ICONES).sort(), [...esperados].sort());
  });

  it("a coroa tem 13x8 e gemas 'o'", () => {
    assert.deepEqual(validarBitmap(COROA), { largura: 13, altura: 8 });
    assert.ok(COROA.some((l) => l.includes("o")));
  });

  it("bitmap irregular lanca erro com a linha problematica", () => {
    assert.throws(() => validarBitmap(["###", "##"]), /bitmap irregular/);
  });
});

describe("retangulosDoBitmap", () => {
  it("funde pixels contiguos da mesma cor e pula vazios", () => {
    assert.deepEqual(retangulosDoBitmap(["##.#", "o.oo"], ["#", "o"]), [
      { x: 0, y: 0, largura: 2, cor: "#" },
      { x: 3, y: 0, largura: 1, cor: "#" },
      { x: 0, y: 1, largura: 1, cor: "o" },
      { x: 2, y: 1, largura: 2, cor: "o" },
    ]);
  });

  it("caracteres sem cor definida sao ignorados", () => {
    assert.deepEqual(retangulosDoBitmap(["#x#"], ["#"]), [
      { x: 0, y: 0, largura: 1, cor: "#" },
      { x: 2, y: 0, largura: 1, cor: "#" },
    ]);
  });

  it("cobre exatamente os pixels pintados do bitmap", () => {
    for (const linhas of [...Object.values(ICONES), COROA]) {
      const pintados = linhas.join("").replace(/\./g, "").length;
      const cobertos = retangulosDoBitmap(linhas, ["#", "o"]).reduce((n, r) => n + r.largura, 0);
      assert.equal(cobertos, pintados);
    }
  });
});
