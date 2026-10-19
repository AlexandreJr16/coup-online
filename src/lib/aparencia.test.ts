import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { describe, it } from "node:test";
import {
  APARENCIA_PADRAO,
  CHAVE_APARENCIA,
  DOCKS_PREF,
  ESTILOS_PREF,
  FONTES_PREF,
  SCRIPT_TEMA,
  aplicarAtributos,
  atributosDoTema,
  lerAparencia,
  parseAparencia,
  salvarAparencia,
  type Aparencia,
} from "./aparencia";

function storageFalso(inicial?: string) {
  const dados = new Map<string, string>();
  if (inicial !== undefined) dados.set(CHAVE_APARENCIA, inicial);
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
  };
}

const QUEBRADO = {
  getItem: (): string | null => {
    throw new Error("SecurityError");
  },
  setItem: (): void => {
    throw new Error("QuotaExceededError");
  },
};

describe("aparencia: padroes", () => {
  it("o padrao e Pixelify Sans, estilo A (madeira e latao) e dock 'mesa'", () => {
    assert.deepEqual(APARENCIA_PADRAO, { fonte: "pixelify", estilo: "A", dock: "mesa" });
  });

  it("as opcoes disponiveis sao as 4 fontes, os 2 estilos e os 3 docks decididos", () => {
    assert.deepEqual([...FONTES_PREF], ["pixelify", "silkscreen", "vt323", "press"]);
    assert.deepEqual([...ESTILOS_PREF], ["A", "B"]);
    assert.deepEqual([...DOCKS_PREF], ["mesa", "cavalete", "bandeja"]);
  });

  it("a chave de storage e coup:aparencia", () => {
    assert.equal(CHAVE_APARENCIA, "coup:aparencia");
  });
});

describe("parseAparencia (tolerante)", () => {
  it("null, undefined e vazio caem no padrao", () => {
    assert.deepEqual(parseAparencia(null), APARENCIA_PADRAO);
    assert.deepEqual(parseAparencia(undefined), APARENCIA_PADRAO);
    assert.deepEqual(parseAparencia(""), APARENCIA_PADRAO);
  });

  it("JSON invalido e JSON que nao e objeto caem no padrao", () => {
    for (const raw of ["{nao-json", "42", "null", '"texto"', "[1,2]", "true"]) {
      assert.deepEqual(parseAparencia(raw), APARENCIA_PADRAO, raw);
    }
  });

  it("valor valido e preservado", () => {
    const a: Aparencia = { fonte: "vt323", estilo: "B", dock: "bandeja" };
    assert.deepEqual(parseAparencia(JSON.stringify(a)), a);
  });

  it("valor desconhecido cai no padrao SO naquele campo", () => {
    assert.deepEqual(
      parseAparencia(JSON.stringify({ fonte: "comic-sans", estilo: "B", dock: "cavalete" })),
      { fonte: "pixelify", estilo: "B", dock: "cavalete" },
    );
    assert.deepEqual(
      parseAparencia(JSON.stringify({ fonte: "press", estilo: "Z", dock: 7 })),
      { fonte: "press", estilo: "A", dock: "mesa" },
    );
  });

  it("campo ausente cai no padrao e campo extra e ignorado", () => {
    assert.deepEqual(parseAparencia(JSON.stringify({ estilo: "B", lixo: 1 })), {
      fonte: "pixelify",
      estilo: "B",
      dock: "mesa",
    });
  });

  it("nao confia em chaves herdadas do prototipo (__proto__, toString)", () => {
    assert.deepEqual(
      parseAparencia('{"fonte":"toString","estilo":"constructor","dock":"__proto__"}'),
      APARENCIA_PADRAO,
    );
  });
});

describe("lerAparencia / salvarAparencia (storage injetavel)", () => {
  it("storage undefined devolve o padrao e salvar nao lanca", () => {
    assert.deepEqual(lerAparencia(undefined), APARENCIA_PADRAO);
    assert.doesNotThrow(() => salvarAparencia(undefined, APARENCIA_PADRAO));
  });

  it("storage vazio devolve o padrao", () => {
    assert.deepEqual(lerAparencia(storageFalso()), APARENCIA_PADRAO);
  });

  it("storage que lanca (janela privada, bloqueado) devolve o padrao e nao propaga", () => {
    assert.deepEqual(lerAparencia(QUEBRADO), APARENCIA_PADRAO);
    assert.doesNotThrow(() => salvarAparencia(QUEBRADO, { fonte: "press", estilo: "B", dock: "cavalete" }));
  });

  it("round-trip: salvar e ler devolve o mesmo", () => {
    const st = storageFalso();
    const a: Aparencia = { fonte: "silkscreen", estilo: "B", dock: "cavalete" };
    salvarAparencia(st, a);
    assert.ok(st.dados.has(CHAVE_APARENCIA));
    assert.deepEqual(lerAparencia(st), a);
  });

  it("conteudo corrompido no storage vira padrao em vez de lancar", () => {
    assert.deepEqual(lerAparencia(storageFalso("{{{")), APARENCIA_PADRAO);
  });
});

describe("atributosDoTema", () => {
  it("devolve os tres data-* do <html>", () => {
    assert.deepEqual(atributosDoTema({ fonte: "vt323", estilo: "B", dock: "bandeja" }), {
      "data-estilo": "B",
      "data-fonte": "vt323",
      "data-dock": "bandeja",
    });
  });

  it("o padrao gera data-estilo=A, data-fonte=pixelify, data-dock=mesa", () => {
    assert.deepEqual(atributosDoTema(APARENCIA_PADRAO), {
      "data-estilo": "A",
      "data-fonte": "pixelify",
      "data-dock": "mesa",
    });
  });

  it("aplicarAtributos escreve cada atributo no elemento", () => {
    const visto: Record<string, string> = {};
    aplicarAtributos({ setAttribute: (k, v) => void (visto[k] = v) }, { fonte: "press", estilo: "B", dock: "cavalete" });
    assert.deepEqual(visto, { "data-estilo": "B", "data-fonte": "press", "data-dock": "cavalete" });
  });
});

// O script inline roda ANTES da hidratacao (evita flash de tema). Ele nao importa nada,
// entao o teste o executa num sandbox e exige que concorde com parseAparencia.
describe("SCRIPT_TEMA (anti-flash)", () => {
  function rodar(raw: string | "lanca" | null): Record<string, string> {
    const attrs: Record<string, string> = {};
    const localStorage = {
      getItem: (k: string) => {
        if (raw === "lanca") throw new Error("bloqueado");
        return k === CHAVE_APARENCIA ? raw : null;
      },
    };
    const document = { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
    runInNewContext(SCRIPT_TEMA, { localStorage, document });
    return attrs;
  }

  it("sem preferencia salva nao muda nada (o SSR ja trouxe o padrao)", () => {
    assert.deepEqual(rodar(null), atributosDoTema(APARENCIA_PADRAO));
  });

  it("aplica a preferencia salva", () => {
    const a: Aparencia = { fonte: "vt323", estilo: "B", dock: "bandeja" };
    assert.deepEqual(rodar(JSON.stringify(a)), atributosDoTema(a));
  });

  it("concorda com parseAparencia em entradas ruins", () => {
    for (const raw of ["{x", "7", '{"fonte":"zzz","estilo":"B"}', '{"dock":"toString"}']) {
      assert.deepEqual(rodar(raw), atributosDoTema(parseAparencia(raw)), raw);
    }
  });

  it("storage que lanca nao quebra a pagina (cai no padrao)", () => {
    assert.deepEqual(rodar("lanca"), atributosDoTema(APARENCIA_PADRAO));
  });

  it("e uma IIFE com try/catch (nunca lanca para o navegador)", () => {
    assert.match(SCRIPT_TEMA, /try\s*\{/);
    assert.match(SCRIPT_TEMA, /catch/);
  });
});
