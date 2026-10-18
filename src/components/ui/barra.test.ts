import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cx } from "./cx";
import { segmentosDaBarra } from "./barra";

describe("segmentosDaBarra", () => {
  it("um bloco por unidade, cheios primeiro", () => {
    assert.deepEqual(segmentosDaBarra(2, 4), [true, true, false, false]);
    assert.deepEqual(segmentosDaBarra(0, 2), [false, false]);
    assert.deepEqual(segmentosDaBarra(3, 3), [true, true, true]);
  });

  it("valor fora da faixa e limitado (nunca estoura nem fica negativo)", () => {
    assert.deepEqual(segmentosDaBarra(9, 2), [true, true]);
    assert.deepEqual(segmentosDaBarra(-3, 2), [false, false]);
    assert.deepEqual(segmentosDaBarra(1.9, 3), [true, false, false]);
  });

  it("NaN, infinito e max invalido nao quebram", () => {
    assert.deepEqual(segmentosDaBarra(Number.NaN, 2), [false, false]);
    assert.deepEqual(segmentosDaBarra(1, Number.NaN), []);
    assert.deepEqual(segmentosDaBarra(1, -4), []);
  });
});

describe("cx", () => {
  it("ignora falsos e junta com espaco", () => {
    assert.equal(cx("a", false, undefined, null, "b"), "a b");
    assert.equal(cx(), "");
  });
});
