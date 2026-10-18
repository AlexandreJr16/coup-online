// Kit de UI pixel em CSS puro (mockup P03.S1). Tudo em unidades `--u` (1 "pixel" do kit):
// 1280x720 usa u=2px, 1920x1080 usa u=3px (degraus inteiros de escala).
// Server components: sem estado, sem handlers; hover é CSS e os estados "forçados"
// (hover/pressionado) existem só para exibir todos os estados lado a lado.
import type { CSSProperties, ReactNode } from "react";
import { COROA, ICONES, validarBitmap, type IconeId } from "./icones";
import s from "./kit.module.css";

function cx(...partes: Array<string | false | undefined>): string {
  return partes.filter(Boolean).join(" ");
}

type Cores = Record<string, string>;

// Bitmap -> SVG de <rect>. Linhas contíguas da mesma cor viram um retângulo só.
export function PixelBitmap({
  linhas,
  cores,
  celula = 1,
  titulo,
  testId,
}: {
  linhas: readonly string[];
  cores: Cores;
  celula?: number; // lado de cada pixel do bitmap, em unidades `--u`
  titulo?: string;
  testId?: string;
}) {
  const { largura, altura } = validarBitmap(linhas);
  const rects: ReactNode[] = [];
  linhas.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const c = linha[x];
      if (c === "." || !(c in cores)) {
        x += 1;
        continue;
      }
      let fim = x;
      while (fim + 1 < linha.length && linha[fim + 1] === c) fim += 1;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={fim - x + 1} height={1} fill={cores[c]} />);
      x = fim + 1;
    }
  });
  const estilo: CSSProperties = {
    width: `calc(var(--u) * ${largura * celula})`,
    height: `calc(var(--u) * ${altura * celula})`,
  };
  return (
    <svg
      className={s.bitmap}
      style={estilo}
      viewBox={`0 0 ${largura} ${altura}`}
      shapeRendering="crispEdges"
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      data-testid={testId}
    >
      {rects}
    </svg>
  );
}

export function PixelIcon({ nome }: { nome: IconeId }) {
  return <PixelBitmap linhas={ICONES[nome]} cores={{ "#": "currentColor" }} testId={`icone-${nome}`} />;
}

export function Logo() {
  return (
    <div className={s.logo} data-testid="logo">
      <PixelBitmap
        linhas={COROA}
        cores={{ "#": "var(--k-logo-1)", o: "var(--k-logo-gema)" }}
        celula={2}
        titulo="Coroa"
      />
      <div className={s.logoTexto}>
        <span className={s.logoCoup}>COUP</span>
        <span className={s.logoImperio}>IMPÉRIO</span>
      </div>
    </div>
  );
}

export type EstadoForcado = "hover" | "pressionado";

export function PixelPanel({
  titulo,
  children,
  testId,
}: {
  titulo?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className={s.panel} data-testid={testId}>
      <div className={s.panelBorda}>
        <div className={s.panelFace}>
          {titulo ? <h4 className={s.panelTitulo}>{titulo}</h4> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function PixelButton({
  children,
  variante = "padrao",
  forcado,
  desabilitado,
  testId,
}: {
  children: ReactNode;
  variante?: "padrao" | "perigo";
  forcado?: EstadoForcado;
  desabilitado?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      data-testid={testId}
      className={cx(
        s.btn,
        variante === "perigo" && s.perigo,
        forcado === "hover" && s.forcaHover,
        forcado === "pressionado" && s.forcaPressionado,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icone,
  rotulo,
  forcado,
  desabilitado,
  testId,
}: {
  icone: IconeId;
  rotulo: string; // aria-label (o botão só tem ícone)
  forcado?: EstadoForcado;
  desabilitado?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desabilitado}
      data-testid={testId}
      className={cx(
        s.btn,
        s.btnIcone,
        forcado === "hover" && s.forcaHover,
        forcado === "pressionado" && s.forcaPressionado,
      )}
    >
      <PixelIcon nome={icone} />
    </button>
  );
}

export type TagTom = "ouro" | "perigo" | "bloqueio" | "fora" | "blefe";

const TAG_CLASSE: Record<TagTom, string> = {
  ouro: s.tagOuro,
  perigo: s.tagPerigo,
  bloqueio: s.tagBloqueio,
  fora: s.tagFora,
  blefe: s.tagBlefe,
};

export function Tag({ tom, children }: { tom: TagTom; children: ReactNode }) {
  return <span className={cx(s.tag, TAG_CLASSE[tom])}>{children}</span>;
}

// Barra de recursos segmentada (moedas, influências, tempo): um bloco por unidade.
export function ResourceBar({
  rotulo,
  valor,
  max,
  cor,
  unidade = "",
  testId,
}: {
  rotulo: string;
  valor: number;
  max: number;
  cor: string; // variável CSS da paleta, ex.: "var(--p-ouro)"
  unidade?: string;
  testId?: string;
}) {
  const segmentos = Array.from({ length: max }, (_, i) => i < valor);
  return (
    <div className={s.recurso} data-testid={testId} style={{ "--cor-recurso": cor } as CSSProperties}>
      <div className={s.recursoTopo}>
        <span>{rotulo}</span>
        <span className={s.recursoNumero}>
          {valor}/{max}
          {unidade}
        </span>
      </div>
      <div className={s.recursoTrilho} role="img" aria-label={`${rotulo}: ${valor} de ${max}${unidade}`}>
        {segmentos.map((cheio, i) => (
          <span key={i} className={cx(s.segmento, cheio && s.segmentoCheio)} />
        ))}
      </div>
    </div>
  );
}
