import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePng, escalar, gridParaRgba, hexParaRgba } from "./png";

test("encodePng: assinatura PNG, IHDR com as dimensões e IEND no fim", () => {
  const b = encodePng(2, 3, new Uint8Array(2 * 3 * 4));
  assert.deepEqual([...b.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(b.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(b.readUInt32BE(16), 2);
  assert.equal(b.readUInt32BE(20), 3);
  assert.equal(b.subarray(b.length - 8, b.length - 4).toString("ascii"), "IEND");
});

test("encodePng: recusa buffer com tamanho errado", () => {
  assert.throws(() => encodePng(2, 2, new Uint8Array(3)), /esperado 16/);
});

test("gridParaRgba: '.' é transparente e caractere sem cor falha", () => {
  const { w, h, rgba } = gridParaRgba(["a.", ".a"], { a: [10, 20, 30, 255] });
  assert.equal(w, 2);
  assert.equal(h, 2);
  assert.deepEqual([...rgba.subarray(0, 4)], [10, 20, 30, 255]);
  assert.deepEqual([...rgba.subarray(4, 8)], [0, 0, 0, 0]);
  assert.throws(() => gridParaRgba(["x"], {}), /sem cor/);
});

test("escalar: vizinho mais próximo, fator inteiro", () => {
  const { w, h, rgba } = escalar(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 2, 1, 2);
  assert.equal(w, 4);
  assert.equal(h, 2);
  assert.deepEqual([...rgba.subarray(0, 8)], [1, 2, 3, 4, 1, 2, 3, 4]);
  assert.throws(() => escalar(new Uint8Array(4), 1, 1, 1.5), /inteiro/);
});

test("hexParaRgba", () => {
  assert.deepEqual(hexParaRgba("#ff8000"), [255, 128, 0, 255]);
  assert.deepEqual(hexParaRgba("#00000080"), [0, 0, 0, 128]);
  assert.throws(() => hexParaRgba("vermelho"), /inválida/);
});
