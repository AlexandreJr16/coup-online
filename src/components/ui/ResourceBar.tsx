// Barra de recursos segmentada (moedas, influências, tempo): um bloco por unidade.
import type { CSSProperties } from "react";
import { segmentosDaBarra } from "./barra";
import { cx } from "./cx";
import s from "./ui.module.css";

export function ResourceBar({
  rotulo,
  valor,
  max,
  cor = "var(--p-ouro)",
  unidade = "",
  testId,
}: {
  rotulo: string;
  valor: number;
  max: number;
  /** cor do preenchimento: variável da paleta, ex.: "var(--p-ouro)" */
  cor?: string;
  unidade?: string;
  testId?: string;
}) {
  const segmentos = segmentosDaBarra(valor, max);
  const cheios = segmentos.filter(Boolean).length;
  return (
    <div className={s.recurso} data-testid={testId} style={{ "--cor-recurso": cor } as CSSProperties}>
      <div className={s.recursoTopo}>
        <span>{rotulo}</span>
        <span className={s.recursoNumero}>
          {cheios}/{segmentos.length}
          {unidade}
        </span>
      </div>
      <div
        className={s.recursoTrilho}
        role="img"
        aria-label={`${rotulo}: ${cheios} de ${segmentos.length}${unidade}`}
      >
        {segmentos.map((cheio, i) => (
          <span key={i} className={cx(s.segmento, cheio && s.segmentoCheio)} />
        ))}
      </div>
    </div>
  );
}
