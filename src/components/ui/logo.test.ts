import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dimensoesDaLogo, LOGO_LARGURA_GRANDE, LOGO_LARGURA_PEQUENA } from "./logo";

const publico = (rel: string) => fileURLToPath(new URL(`../../../public${rel}`, import.meta.url));

/** Largura e altura lidas do cabecalho IHDR do PNG (bytes 16..23). */
function tamanhoDoPng(arquivo: string): { w: number; h: number } {
  const b = readFileSync(arquivo);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe("dimensoesDaLogo", () => {
  it("padrao: versao pequena 130x42", () => {
    assert.deepEqual(dimensoesDaLogo(), { src: "/art/imperio/logo.sm.png", width: 130, height: 42 });
  });

  it("ate 130 px usa o arquivo pequeno; acima disso o grande", () => {
    assert.equal(dimensoesDaLogo(100).src, "/art/imperio/logo.sm.png");
    assert.equal(dimensoesDaLogo(130).src, "/art/imperio/logo.sm.png");
    assert.equal(dimensoesDaLogo(131).src, "/art/imperio/logo.png");
    assert.deepEqual(dimensoesDaLogo(260), { src: "/art/imperio/logo.png", width: 260, height: 84 });
  });

  it("mantem a proporcao 260:84 e arredonda", () => {
    const d = dimensoesDaLogo(195);
    assert.equal(d.width, 195);
    assert.equal(d.height, 63);
    assert.equal(dimensoesDaLogo(100.4).width, 100);
  });

  it("largura invalida (NaN, 0, negativa, infinita) cai na pequena", () => {
    for (const v of [NaN, 0, -50, Infinity]) assert.deepEqual(dimensoesDaLogo(v), dimensoesDaLogo(LOGO_LARGURA_PEQUENA), String(v));
  });

  it("os arquivos existem e tem exatamente as dimensoes das constantes", () => {
    const grande = dimensoesDaLogo(LOGO_LARGURA_GRANDE + 1);
    const pequena = dimensoesDaLogo(LOGO_LARGURA_PEQUENA);
    assert.ok(existsSync(publico(grande.src)) && existsSync(publico(pequena.src)));
    assert.deepEqual(tamanhoDoPng(publico(grande.src)), { w: LOGO_LARGURA_GRANDE, h: dimensoesDaLogo(LOGO_LARGURA_GRANDE).height });
    assert.deepEqual(tamanhoDoPng(publico(pequena.src)), { w: LOGO_LARGURA_PEQUENA, h: pequena.height });
  });
});
