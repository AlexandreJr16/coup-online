// Testes do atalho da revanche e da chuva de moedas (puros). Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { PARTICULAS_PADRAO, TETO_PARTICULAS, particulas, teclaPedeRevanche, type TeclaInfo } from "./victory";

const tecla = (over: Partial<TeclaInfo>): TeclaInfo => ({
  key: "Enter",
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  alvoTag: "body",
  alvoEditavel: false,
  alvoEmDialogo: false,
  temModalAberto: false,
  ...over,
});

test("Enter e R pedem a revanche (R em maiúscula também)", () => {
  assert.equal(teclaPedeRevanche(tecla({ key: "Enter" })), true);
  assert.equal(teclaPedeRevanche(tecla({ key: "r" })), true);
  assert.equal(teclaPedeRevanche(tecla({ key: "R" })), true);
});

test("Espaço NÃO pede a revanche (na mesa é Passar) nem outras teclas", () => {
  assert.equal(teclaPedeRevanche(tecla({ key: " " })), false);
  assert.equal(teclaPedeRevanche(tecla({ key: "c" })), false);
  assert.equal(teclaPedeRevanche(tecla({ key: "Escape" })), false);
});

test("não dispara digitando, com modificador, repetindo, já tratada ou com modal aberto", () => {
  for (const alvoTag of ["input", "textarea", "select"]) assert.equal(teclaPedeRevanche(tecla({ alvoTag, key: "r" })), false);
  assert.equal(teclaPedeRevanche(tecla({ alvoEditavel: true, key: "r" })), false);
  assert.equal(teclaPedeRevanche(tecla({ ctrlKey: true, key: "r" })), false); // Ctrl+R recarrega a página
  assert.equal(teclaPedeRevanche(tecla({ metaKey: true, key: "r" })), false);
  assert.equal(teclaPedeRevanche(tecla({ altKey: true })), false);
  assert.equal(teclaPedeRevanche(tecla({ repeat: true })), false);
  assert.equal(teclaPedeRevanche(tecla({ defaultPrevented: true })), false);
  assert.equal(teclaPedeRevanche(tecla({ temModalAberto: true })), false);
  assert.equal(teclaPedeRevanche(tecla({ alvoEmDialogo: true, key: "r" })), false);
});

test("Enter num botão ou link ativa ELE (não a revanche); R continua valendo", () => {
  for (const alvoTag of ["button", "a", "summary"]) assert.equal(teclaPedeRevanche(tecla({ alvoTag })), false);
  assert.equal(teclaPedeRevanche(tecla({ alvoTag: "button", key: "r" })), true);
});

test("moedas: respeita o teto, é determinística e fica dentro da tela", () => {
  assert.equal(particulas().length, PARTICULAS_PADRAO);
  assert.ok(PARTICULAS_PADRAO <= TETO_PARTICULAS);
  assert.equal(particulas(9999).length, TETO_PARTICULAS);
  assert.equal(particulas(0).length, 0);
  assert.equal(particulas(-5).length, 0);
  assert.equal(particulas(Number.NaN).length, 0);
  assert.deepEqual(particulas(10), particulas(10)); // sem Math.random: mesmo HTML no servidor e no cliente
  for (const p of particulas(TETO_PARTICULAS)) {
    assert.ok(p.esquerda >= 2 && p.esquerda <= 96, String(p.esquerda));
    assert.ok(p.duracao > 0 && p.giro > 0);
    assert.ok(p.atraso <= 0);
  }
});
