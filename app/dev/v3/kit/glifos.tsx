"use client";

// Confere, no navegador, se cada glifo usado pelo jogo existe de fato na fonte
// (e não caiu em fallback). Técnica: a largura de um caractere medida com
// `fonte, monospace` e com `fonte, serif` só coincide se a fonte o desenha.
// Estático: sem fetch, sem socket; usa só o canvas e a API de fontes do navegador.
import { useEffect, useState } from "react";
import s from "./kit.module.css";

const ACENTOS = "ãõáéíóúâêôçàÃÕÁÉÍÓÚÂÊÔÇÀ";
// Símbolos que o jogo já usa em texto: "Corte · 21", "Assassinar → Anny", "−7", "…".
const SIMBOLOS = "·→−…“”—–«»";

type Resultado = { ok: boolean; faltando: string[] };

// `familia` vem do next/font: "'__Fonte_ab12', '__Fonte_Fallback_ab12'". Só a primeira
// interessa; o fallback do Next é Arial e esconderia o glifo ausente.
function primeiraFamilia(familia: string): string {
  return familia.split(",")[0].trim();
}

async function medir(familia: string, caracteres: string): Promise<Resultado> {
  const primeira = primeiraFamilia(familia);
  await document.fonts.load(`24px ${primeira}`, caracteres);
  await document.fonts.ready;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return { ok: false, faltando: [] };
  const largura = (c: string, fallback: string): number => {
    ctx.font = `24px ${primeira}, ${fallback}`;
    return ctx.measureText(c).width;
  };
  const faltando = Array.from(caracteres).filter((c) => largura(c, "monospace") !== largura(c, "serif"));
  return { ok: faltando.length === 0, faltando };
}

function Grade({ familia, caracteres, faltando }: { familia: string; caracteres: string; faltando: string[] }) {
  return (
    <div className={s.glifosGrade}>
      {Array.from(caracteres).map((c) => (
        <span
          key={c}
          className={`${s.glifo} ${faltando.includes(c) ? s.glifoFalta : ""}`}
          style={{ fontFamily: familia }}
          title={faltando.includes(c) ? `${c} caiu em fallback` : `${c} presente`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function VerificadorGlifos({ familia, testId }: { familia: string; testId: string }) {
  const [res, setRes] = useState<{ acentos: Resultado; simbolos: Resultado } | null>(null);

  useEffect(() => {
    let vivo = true;
    void Promise.all([medir(familia, ACENTOS), medir(familia, SIMBOLOS)]).then(([acentos, simbolos]) => {
      if (vivo) setRes({ acentos, simbolos });
    });
    return () => {
      vivo = false;
    };
  }, [familia]);

  const acentosFalta = res?.acentos.faltando ?? [];
  const simbolosFalta = res?.simbolos.faltando ?? [];

  return (
    <div className={s.glifosCaixa} data-testid={testId}>
      <span className={`${s.glifosStatus} ${res && res.acentos.ok ? s.glifosOk : s.glifosFalha}`}>
        {!res
          ? "Verificando acentos pt-BR..."
          : res.acentos.ok
            ? "Acentos pt-BR: todos presentes"
            : `Acentos pt-BR em fallback: ${acentosFalta.join(" ")}`}
      </span>
      <Grade familia={familia} caracteres={ACENTOS} faltando={acentosFalta} />
      <span className={`${s.glifosStatus} ${res && res.simbolos.ok ? s.glifosOk : s.glifosFalha}`}>
        {!res
          ? "Verificando símbolos..."
          : res.simbolos.ok
            ? "Símbolos do jogo (· → − …): todos presentes"
            : `Símbolos em fallback (vermelho): ${simbolosFalta.join(" ")}`}
      </span>
      <Grade familia={familia} caracteres={SIMBOLOS} faltando={simbolosFalta} />
    </div>
  );
}
