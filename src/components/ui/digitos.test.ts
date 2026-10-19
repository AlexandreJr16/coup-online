import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bitmapDoNumero, DIGITOS } from "./digitos";
import { validarBitmap } from "./icones";

describe("dígitos do relógio (P08.S7)", () => {
  it("os 10 dígitos são 3x5 e distintos", () => {
    for (const d of Object.values(DIGITOS)) assert.deepEqual(validarBitmap(d), { largura: 3, altura: 5 });
    assert.equal(new Set(Object.values(DIGITOS).map((d) => d.join("|"))).size, 10);
  });

  it("número de 2 dígitos tem 7 colunas (3 + respiro + 3) e é regular", () => {
    assert.deepEqual(validarBitmap(bitmapDoNumero(42)), { largura: 7, altura: 5 });
    assert.deepEqual(bitmapDoNumero(42).map((l) => l.slice(0, 3)), [...DIGITOS["4"]]);
  });

  it("entradas estranhas não quebram: negativo e NaN viram 0, fração arredonda para baixo", () => {
    assert.deepEqual(bitmapDoNumero(-3), [...DIGITOS["0"]]);
    assert.deepEqual(bitmapDoNumero(NaN), [...DIGITOS["0"]]);
    assert.deepEqual(bitmapDoNumero(7.9), [...DIGITOS["7"]]);
  });
});
