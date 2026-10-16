// Testes das receitas de áudio e da trilha procedural (dados puros).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { MUSIC_BEATS, midiToHz, musicPattern, SFX, sfxDuration, type SfxName } from "./recipes";

const nomes = Object.keys(SFX) as SfxName[];

test("todo efeito tem vozes válidas: frequência audível, ganho ≤ 1, duração positiva", () => {
  for (const n of nomes) {
    assert.ok(SFX[n].length > 0, `${n} sem vozes`);
    for (const v of SFX[n]) {
      assert.ok(v.g > 0 && v.g <= 1, `${n}: ganho ${v.g}`);
      assert.ok(v.d > 0 && v.t >= 0, `${n}: tempos`);
      assert.ok(v.f0 >= 20 && v.f0 <= 12000, `${n}: f0 ${v.f0}`);
      if (v.f1) assert.ok(v.f1 >= 20 && v.f1 <= 12000, `${n}: f1 ${v.f1}`);
    }
  }
});

test("efeitos são curtos (≤ 1,2 s) para nunca atrapalhar o ritmo do jogo", () => {
  for (const n of nomes) assert.ok(sfxDuration(n) <= 1.2, `${n} dura ${sfxDuration(n)}s`);
});

test("soma dos ganhos de um efeito fica longe de estourar (margem para o mestre e o compressor)", () => {
  for (const n of nomes) {
    const soma = SFX[n].filter((v) => v.t === 0).reduce((a, v) => a + v.g, 0);
    assert.ok(soma <= 1, `${n}: vozes simultâneas somam ${soma}`);
  }
});

test("trilha: notas dentro do compasso, no registro certo, e o baixo não se sobrepõe", () => {
  const p = musicPattern();
  assert.ok(p.length > 30);
  for (const n of p) {
    assert.ok(n.beat >= 0 && n.beat < MUSIC_BEATS, `beat ${n.beat}`);
    assert.ok(n.midi >= 36 && n.midi <= 84, `midi ${n.midi}`);
    assert.ok(n.dur > 0);
  }
  const baixo = p.filter((n) => n.part === "baixo");
  assert.equal(baixo.length, 16);
  for (let i = 1; i < baixo.length; i++) assert.ok(baixo[i].beat - baixo[i - 1].beat >= baixo[i - 1].dur, "baixo sobreposto");
  assert.deepEqual([...p].map((n) => n.beat), [...p].map((n) => n.beat).sort((a, b) => a - b)); // ordenada
});

test("midiToHz: lá 440 e oitavas", () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(81) - 880) < 1e-9);
  assert.ok(Math.abs(midiToHz(57) - 220) < 1e-9);
});
