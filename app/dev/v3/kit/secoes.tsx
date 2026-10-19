// Seções da página /dev/v3/kit (estática, sem socket e sem fetch).
import type { CSSProperties, ReactNode } from "react";
import { VerificadorGlifos } from "./glifos";
import { FONTES, type Fonte } from "./fontes";
import type { IconeId } from "./icones";
import { PALETA } from "./paleta";
import { IconButton, Logo, PixelButton, PixelPanel, ResourceBar, Tag } from "./pixel";
import s from "./kit.module.css";

export type Estilo = "A" | "B";
export type Resolucao = "1280" | "1920" | "ambos";

function cx(...partes: Array<string | false | undefined>): string {
  return partes.filter(Boolean).join(" ");
}

// Custom properties (--u, --fe) não existem em CSSProperties.
function vars(u: number, fonte: Fonte): CSSProperties {
  return { "--u": `${u}px`, "--fe": fonte.escala } as CSSProperties;
}

const CLASSE_ESTILO: Record<Estilo, string> = { A: s.estiloA, B: s.estiloB };
const NOME_ESTILO: Record<Estilo, string> = {
  A: "Estilo A: madeira e latão da mesa",
  B: "Estilo B: pergaminho e tinta",
};

// ── Paleta ────────────────────────────────────────────────────────────────

export function PaletaSecao() {
  return (
    <section className={s.secao} data-testid="paleta">
      <h2>Paleta mestra (38 cores, tools/art/palette.json)</h2>
      <p className={s.nota}>
        Cada cor é uma variável CSS local da página (<code>--p-nome</code>). Todo o kit abaixo usa só elas.
      </p>
      <div className={s.paleta}>
        {PALETA.map((c) => (
          <div key={c.nome} className={s.amostraCor}>
            <div className={s.amostraCorQuadro} style={{ background: `var(--p-${c.nome})` }} />
            <span>
              {c.nome} {c.hex}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 1. Comparação de fontes ───────────────────────────────────────────────

const TAMANHOS = [14, 18, 28] as const;

const AMOSTRAS: readonly string[] = [
  "Barão do Café",
  "Benzedeira",
  "Ação",
  "Coronel",
  "Extorquir",
  "Contestar",
  "Golpe de Estado",
  "Você perdeu uma influência",
  "Aguardando você e Caio: contestar ou passar",
  "Quem contesta e erra perde uma influência. Se o contestado estava blefando, ele perde a carta e a ação é cancelada. Nada de acordo por fora da mesa.",
];

export function FontesSecao() {
  return (
    <section className={s.secao} data-testid="fontes">
      <h2>1. Fontes lado a lado (14, 18 e 28 px)</h2>
      <p className={s.nota}>
        As quatro candidatas pixel, mais Cinzel (a atual) e Geist (sans) só para contraste. Em cada cartão, a
        caixa escura embaixo confere no navegador se cada acento pt-BR e cada símbolo que o jogo usa (· → − …)
        existe na fonte; glifo que caiu em fallback aparece em vermelho. Os textos acima dela usam a fonte de verdade,
        então um acento trocado também aparece a olho nu.
      </p>
      <div className={s.gradeFontes}>
        {FONTES.map((f) => (
          <article key={f.id} className={s.cartaoFonte} data-testid={`fonte-${f.id}`}>
            <div>
              <h3>{f.nome}</h3>
              <span className={s.cartaoPapel}>{f.papel}</span>
            </div>
            <VerificadorGlifos familia={f.familia} testId={`glifos-${f.id}`} />
            <div className={f.className}>
              {AMOSTRAS.map((texto) => (
                <div key={texto} className={s.amostra}>
                  {TAMANHOS.map((px) => (
                    <p key={px} className={s.linhaAmostra} style={{ fontSize: px }}>
                      {texto}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── 2. Kit de componentes (propostas A e B) ───────────────────────────────

function Estado({ legenda, children }: { legenda: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {children}
      <span className={s.grupoRotulo}>{legenda}</span>
    </div>
  );
}

function Grupo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={s.grupo}>
      <span className={s.grupoRotulo}>{rotulo}</span>
      {children}
    </div>
  );
}

const ICONES_LISTA: ReadonlyArray<{ id: IconeId; rotulo: string }> = [
  { id: "som", rotulo: "Som ligado" },
  { id: "mudo", rotulo: "Som desligado" },
  { id: "olho", rotulo: "Espectador" },
  { id: "ajuda", rotulo: "Ajuda" },
  { id: "sair", rotulo: "Sair" },
  { id: "engrenagem", rotulo: "Configurações" },
  { id: "crt", rotulo: "Efeito CRT" },
];

function KitQuadro({ estilo, fonte }: { estilo: Estilo; fonte: Fonte }) {
  const t = estilo.toLowerCase();
  return (
    <div className={s.quadroKit} data-testid={`kit-${estilo}`}>
      <h3 className={s.quadroRotulo}>{NOME_ESTILO[estilo]}</h3>
      <div className={cx(CLASSE_ESTILO[estilo], fonte.className)} style={vars(3, fonte)}>
        <PixelPanel titulo="Contestar a Baronesa?" testId={`painel-${t}`}>
          <p className={s.corpo}>
            Se ela tiver a carta, você perde uma influência. Se estiver blefando, é ela quem perde.
          </p>

          <Grupo rotulo="BOTÕES: NORMAL, HOVER, PRESSIONADO, DESABILITADO">
            <div className={s.linha} data-testid={`botoes-${t}`}>
              <Estado legenda="normal"><PixelButton>Passar</PixelButton></Estado>
              <Estado legenda="hover"><PixelButton forcado="hover">Passar</PixelButton></Estado>
              <Estado legenda="pressionado"><PixelButton forcado="pressionado">Passar</PixelButton></Estado>
              <Estado legenda="desabilitado"><PixelButton desabilitado>Passar</PixelButton></Estado>
            </div>
            <div className={s.linha}>
              <Estado legenda="normal"><PixelButton variante="perigo">Contestar</PixelButton></Estado>
              <Estado legenda="hover"><PixelButton variante="perigo" forcado="hover">Contestar</PixelButton></Estado>
              <Estado legenda="pressionado"><PixelButton variante="perigo" forcado="pressionado">Contestar</PixelButton></Estado>
              <Estado legenda="desabilitado"><PixelButton variante="perigo" desabilitado>Contestar</PixelButton></Estado>
            </div>
          </Grupo>

          <Grupo rotulo="BOTÕES DE ÍCONE (QUADRADOS)">
            <div className={s.linha} data-testid={`icones-${t}`}>
              {ICONES_LISTA.map((i) => (
                <Estado key={i.id} legenda={i.id}>
                  <IconButton icone={i.id} rotulo={i.rotulo} />
                </Estado>
              ))}
            </div>
            <div className={s.linha}>
              <Estado legenda="normal"><IconButton icone="som" rotulo="Som" /></Estado>
              <Estado legenda="hover"><IconButton icone="som" rotulo="Som" forcado="hover" /></Estado>
              <Estado legenda="pressionado"><IconButton icone="som" rotulo="Som" forcado="pressionado" /></Estado>
              <Estado legenda="desabilitado"><IconButton icone="som" rotulo="Som" desabilitado /></Estado>
            </div>
          </Grupo>

          <Grupo rotulo="TAGS">
            <div className={s.linha} data-testid={`tags-${t}`}>
              <Tag tom="ouro">Sua vez</Tag>
              <Tag tom="perigo">Contestado</Tag>
              <Tag tom="bloqueio">Bloqueio</Tag>
              <Tag tom="blefe">Blefe</Tag>
              <Tag tom="fora">Eliminado</Tag>
            </div>
          </Grupo>

          <Grupo rotulo="BARRA DE RECURSOS">
            <div className={s.slot} data-testid={`recursos-${t}`}>
              <ResourceBar rotulo="Erário" valor={7} max={10} cor="var(--p-ouro)" />
              <ResourceBar rotulo="Influências" valor={1} max={2} cor="var(--p-rubro)" />
              <ResourceBar rotulo="Tempo" valor={12} max={20} cor="var(--p-ceu)" unidade=" s" />
            </div>
          </Grupo>
        </PixelPanel>
      </div>
      <div className={cx(CLASSE_ESTILO[estilo], fonte.className)} style={vars(3, fonte)}>
        <PixelPanel>
          <p className={s.corpo}>
            Painel sem título, para balões e legendas: borda de 1 pixel em degraus, filete interno, realce
            no canto superior e sombra dura de 2 pixels, sem gradiente e sem blur.
          </p>
        </PixelPanel>
      </div>
    </div>
  );
}

export function KitSecao({ fonte }: { fonte: Fonte }) {
  return (
    <section className={s.secao} data-testid="kit">
      <h2>2. Kit de componentes: duas propostas de estilo</h2>
      <p className={s.nota}>
        Mesma estrutura nos dois estilos (só os tokens de cor mudam): PixelPanel, PixelButton (com os quatro
        estados), IconButton quadrado com ícone desenhado em bitmap, Tag e barra de recursos. Tudo em CSS puro e
        SVG de retângulos, em unidade de pixel <code>--u</code> (aqui 3 px). Fonte usada no kit: {fonte.nome}{" "}
        (troque com <code>?fonte=</code>).
      </p>
      <div className={s.gradeKit}>
        <KitQuadro estilo="A" fonte={fonte} />
        <KitQuadro estilo="B" fonte={fonte} />
      </div>
    </section>
  );
}

// ── 3. HUD do cabeçalho ───────────────────────────────────────────────────

function HudFrame({ largura, estilo, fonte }: { largura: 1280 | 1920; estilo: Estilo; fonte: Fonte }) {
  const altura = (largura * 9) / 16;
  const u = largura === 1280 ? 2 : 3;
  const estiloFrame: CSSProperties = { ...vars(u, fonte), width: largura, height: altura };
  return (
    <div>
      <p className={s.frameRotulo}>
        {largura}x{altura}: escala {largura === 1280 ? "1x" : "1,5x"} (1 pixel do kit = {u} px)
      </p>
      <div className={s.frameRolagem}>
        <div
          className={cx(s.frame, CLASSE_ESTILO[estilo], fonte.className)}
          style={estiloFrame}
          data-testid={`hud-${largura}`}
        >
          <header className={s.hud} data-testid={`hud-barra-${largura}`}>
            <div className={s.hudEsq}>
              <Logo />
              <div className={s.sala}>
                <span>SALA</span>
                <span className={s.salaCodigo} data-testid={`hud-sala-${largura}`}>
                  K7QX
                </span>
              </div>
            </div>
            <div className={s.hudDir}>
              <IconButton icone="som" rotulo="Som" />
              <IconButton icone="crt" rotulo="Efeito CRT" />
              <IconButton icone="ajuda" rotulo="Ajuda" />
              <IconButton icone="sair" rotulo="Sair" />
            </div>
          </header>
          <div className={s.mesaPlaceholder}>Área da mesa (fora deste mockup; ver S2)</div>
        </div>
      </div>
    </div>
  );
}

export function HudSecao({
  resolucao,
  estilo,
  fonte,
}: {
  resolucao: Resolucao;
  estilo: Estilo;
  fonte: Fonte;
}) {
  return (
    <section className={s.secao} data-testid="hud">
      <h2>3. HUD do cabeçalho (estático)</h2>
      <p className={s.nota}>
        Logo à esquerda, código da sala e, à direita, um único estilo de botão (som, CRT, ajuda, sair). Sem faixa de
        status. HUD no estilo {estilo} com a fonte {fonte.nome}. Cada frame tem o tamanho exato em px; se não
        couber na janela, role na horizontal.
      </p>
      {resolucao !== "1920" ? <HudFrame largura={1280} estilo={estilo} fonte={fonte} /> : null}
      {resolucao !== "1280" ? <HudFrame largura={1920} estilo={estilo} fonte={fonte} /> : null}
    </section>
  );
}
