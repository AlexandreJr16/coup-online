import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fonteKit } from "./escala";

describe("fonteKit", () => {
  it("monta o calc com a unidade e o fator da fonte", () => {
    assert.equal(fonteKit(5), "calc(var(--u) * 5 * var(--fe))");
  });

  it("aceita fracao (meio degrau)", () => {
    assert.equal(fonteKit(4.5), "calc(var(--u) * 4.5 * var(--fe))");
  });
});
