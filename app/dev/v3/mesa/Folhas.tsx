// Folhas de revisão abaixo do palco: tudo que o estado único do palco não consegue mostrar
// (as 3 variantes de 1 a 10 fichas, Erário por faixa, estados da moldura, anel, ameaça, ausente,
// baralho por faixa e a régua de escala). Cada folha é um bloco com data-testid.
import type { ReactNode } from "react";

import {
  PAL_AMPULHETA,
  PAL_PASSOU,
  SPRITE_AMPULHETA,
  SPRITE_PASSOU,
  spriteDigitos,
  PAL,
} from "./bitmaps";
import { Baralho, ROTULO_BARALHO } from "./Centro";
import { estiloEscala, estiloVars, U } from "./escala";
import { Bau, Fichas, FichasSprite, Monte } from "./Fichas";
import {
  faixaBaralho,
  MAX_FICHAS,
  NOMES_VARIANTE,
  nivelErario,
  ROTULO_FAIXA,
  varianteFicha,
  varianteTroca,
  type NivelErario,
  type Variante,
} from "./fichas";
import Pix from "./Pix";
import Retrato, { type Relogio } from "./Retrato";
import { Erario } from "./Centro";
import { Placa } from "./Assento";

const QUANTIDADES = Array.from({ length: MAX_FICHAS }, (_, i) => i + 1);
const LETRA = ["A", "B", "C"] as const;

function Folha({ id, titulo, nota, children }: { id: string; titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="m3-folha" data-testid={id} id={id}>
      <h2>{titulo}</h2>
      {nota && <p className="m3-nota">{nota}</p>}
      {children}
    </section>
  );
}

function Celula({ legenda, children, testid }: { legenda: string; children: ReactNode; testid?: string }) {
  return (
    <figure className="m3-celula" data-testid={testid}>
      <div className="m3-celula-arte">{children}</div>
      <figcaption>{legenda}</figcaption>
    </figure>
  );
}

export function FolhaFichas() {
  return (
    <Folha
      id="folha-fichas"
      titulo="Folha de fichas: 1 a 10 × 3 variantes"
      nota="Placeholders desenhados em código (retângulos); a arte final vem de tools/art/fichas.ts, curada em 3 melhores por quantidade. Cada linha é uma variante; cada coluna, uma quantidade."
    >
      <div className="m3-grade-fichas">
        <span />
        {QUANTIDADES.map((q) => (
          <span key={q} className="m3-cabeca-coluna">
            {q}
          </span>
        ))}
        {([0, 1, 2] as Variante[]).map((v) => (
          <FolhaLinhaVariante key={v} v={v} />
        ))}
      </div>
    </Folha>
  );
}

function FolhaLinhaVariante({ v }: { v: Variante }) {
  return (
    <>
      <span className="m3-cabeca-linha">{NOMES_VARIANTE[v]}</span>
      {QUANTIDADES.map((q) => (
        <div key={q} className="m3-celula-ficha" data-testid={`ficha-${q}-${LETRA[v]}`}>
          <FichasSprite n={q} v={v} />
        </div>
      ))}
    </>
  );
}

export function FolhaDec24() {
  const linhas: Array<{ nome: string; testid: string; variante: (q: number) => Variante }> = [
    { nome: "Hash fixo · Barão do Café", testid: "dec24-hash-barao", variante: (q) => varianteFicha("barao", q) },
    { nome: "Hash fixo · Caio", testid: "dec24-hash-caio", variante: (q) => varianteFicha("caio", q) },
    { nome: "Troca a cada mudança (qualquer jogador)", testid: "dec24-troca", variante: (q) => varianteTroca(q) },
  ];
  return (
    <Folha
      id="folha-dec24"
      titulo="DEC-24: variante por hash fixo ou troca a cada mudança"
      nota="Mesmas quantidades 1 a 10. Com hash fixo, o mesmo jogador com 4 fichas sempre vê a mesma pilha e dois jogadores com 4 fichas costumam ver pilhas diferentes (linhas 1 e 2). Com troca, a pilha muda de variante a cada mudança de quantidade, e todos mudam juntos (linha 3)."
    >
      {linhas.map((l) => (
        <div key={l.nome} className="m3-linha-dec24" data-testid={l.testid}>
          <span className="m3-cabeca-linha">{l.nome}</span>
          <div className="m3-faixa-celulas">
            {QUANTIDADES.map((q) => (
              <Celula key={q} legenda={`${q}${LETRA[l.variante(q)]}`}>
                <FichasSprite n={q} v={l.variante(q)} />
              </Celula>
            ))}
          </div>
        </div>
      ))}
    </Folha>
  );
}

export function FolhaZero() {
  return (
    <Folha
      id="folha-zero"
      titulo="DEC-22: aparência de 0 fichas"
      nota="Opção A: nenhum sprite (só o número 0 em fonte pixel). Opção B: uma ficha apagada, que mantém o lugar da pilha ocupado."
    >
      <div className="m3-faixa-celulas">
        <Celula legenda="A · sem sprite" testid="zero-nada">
          <Fichas idJogador="anny" quantidade={0} zero="nada" />
        </Celula>
        <Celula legenda="B · ficha apagada" testid="zero-apagada">
          <Fichas idJogador="anny" quantidade={0} zero="apagada" />
        </Celula>
        <Celula legenda="com 1 ficha (referência)">
          <Fichas idJogador="anny" quantidade={1} />
        </Celula>
      </div>
    </Folha>
  );
}

const FAIXAS: Array<{ nivel: NivelErario; amostra: number }> = [
  { nivel: 0, amostra: 6 },
  { nivel: 1, amostra: 13 },
  { nivel: 2, amostra: 20 },
  { nivel: 3, amostra: 30 },
];

export function FolhaErario() {
  return (
    <Folha
      id="folha-erario"
      titulo="Erário: montes por faixa e baú que enche"
      nota="Montes nas faixas 11-15, 16-25 e 26+, com 2 variantes cada (A e B). O baú começa vazio (0-10) e enche a cada faixa. O número do Erário fica pequeno, só como apoio."
    >
      <div className="m3-faixa-celulas" data-testid="erario-faixas">
        {FAIXAS.map(({ nivel }) => (
          <Celula key={nivel} legenda={`faixa ${ROTULO_FAIXA[nivel]}`} testid={`erario-faixa-${nivel}`}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: U(12) }}>
              {nivel > 0 && (
                <>
                  <Monte nivel={nivel as 1 | 2 | 3} v={0} />
                  <Monte nivel={nivel as 1 | 2 | 3} v={1} />
                </>
              )}
              <Bau nivel={nivel} />
            </div>
          </Celula>
        ))}
      </div>
      <h3>Erário composto (como aparece no centro da mesa)</h3>
      <div className="m3-faixa-celulas">
        {FAIXAS.map(({ nivel, amostra }) => (
          <Celula key={nivel} legenda={`${amostra} moedas → nível ${nivelErario(amostra)}`}>
            <Erario quantidade={amostra} />
          </Celula>
        ))}
      </div>
    </Folha>
  );
}

function RetratoAmostra({ legenda, testid, ...props }: { legenda: string; testid: string } & Partial<Parameters<typeof Retrato>[0]>) {
  return (
    <Celula legenda={legenda} testid={testid}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Retrato avatar="dama_corte" nome="Anny" influencias={2} {...props} />
        <Placa nome="Anny" ausente={props.ausente} />
      </div>
    </Celula>
  );
}

const ANEL_CHEIO: Relogio = { pct: 100, segundos: 15 };
const ANEL_METADE: Relogio = { pct: 50, segundos: 8 };
const ANEL_URGENTE: Relogio = { pct: 28, segundos: 4 };

export function FolhaEstados() {
  return (
    <Folha
      id="folha-estados"
      titulo="Estados do assento"
      nota="Moldura por influências (2, 1, 0), selos de ameaça, ausente, relógio em anel e sinais pixel. Todas as camadas são overlays CSS/SVG por cima do retrato neutro."
    >
      <h3>Moldura: 2, 1 e 0 influências</h3>
      <div className="m3-faixa-celulas">
        <RetratoAmostra legenda="2 · íntegra" testid="estado-integra" influencias={2} />
        <RetratoAmostra legenda="1 · rachada + curativo" testid="estado-rachada" influencias={1} />
        <RetratoAmostra legenda="0 · estilhaçada" testid="estado-estilhacada" influencias={0} />
      </div>
      <h3>Ameaça (informação pública) e ausente</h3>
      <div className="m3-faixa-celulas">
        <RetratoAmostra legenda="6 ou menos · sem selo" testid="estado-sem-ameaca" ameaca="nenhuma" />
        <RetratoAmostra legenda="7 a 9 · canhãozinho" testid="estado-canhao" ameaca="canhao" />
        <RetratoAmostra legenda="10+ · alvo pulsante" testid="estado-alvo" ameaca="alvo" />
        <RetratoAmostra legenda="ausente · cinza + zZz" testid="estado-ausente" ausente />
      </div>
      <h3>Relógio em anel</h3>
      <div className="m3-faixa-celulas">
        <RetratoAmostra legenda="cheio" testid="anel-cheio" relogio={ANEL_CHEIO} />
        <RetratoAmostra legenda="metade" testid="anel-metade" relogio={ANEL_METADE} />
        <RetratoAmostra legenda="últimos 5 s · vermelho + número" testid="anel-urgente" relogio={ANEL_URGENTE} />
      </div>
      <h3>Sinais pixel</h3>
      <div className="m3-faixa-celulas">
        <Celula legenda="passou">
          <Pix rows={SPRITE_PASSOU} paleta={PAL_PASSOU} px={4} />
        </Celula>
        <Celula legenda="a mesa espera">
          <span className="m3-anima m3-ponto m3-ponto-grande" />
        </Celula>
        <Celula legenda="ampulheta (legenda)">
          <Pix rows={SPRITE_AMPULHETA} paleta={PAL_AMPULHETA} px={4} />
        </Celula>
        <Celula legenda="dígitos do anel (DEC-21)">
          <div style={{ display: "flex", gap: U(8), flexWrap: "wrap", maxWidth: U(220) }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <Pix key={d} rows={spriteDigitos(d)} paleta={{ o: PAL.contorno, x: PAL.branco }} px={3} />
            ))}
          </div>
        </Celula>
        <Celula legenda="medalhão da vez (DEC-21)">
          <RetratoAmostraMedalhao />
        </Celula>
      </div>
    </Folha>
  );
}

function RetratoAmostraMedalhao() {
  return (
    <div style={{ paddingLeft: U(28) }}>
      <Retrato avatar="jovem_barao" nome="Barão do Café" influencias={2} medalhao />
    </div>
  );
}

export function FolhaBaralho() {
  const amostras = [20, 12, 5, 1];
  return (
    <Folha
      id="folha-baralho"
      titulo="Baralho da Corte por faixa"
      nota="Em vez de 'Corte · 21': pilha cheia, média, pouca e a última carta. O número fica pequeno embaixo, só como apoio."
    >
      <div className="m3-faixa-celulas">
        {amostras.map((n) => (
          <Celula key={n} legenda={ROTULO_BARALHO[faixaBaralho(n)]} testid={`baralho-${n}`}>
            <Baralho cartas={n} />
          </Celula>
        ))}
      </div>
    </Folha>
  );
}

export function FolhaEscala() {
  const degraus: Array<{ u: number; legenda: string }> = [
    { u: 1, legenda: "u = 1 (1280x720)" },
    { u: 1.5, legenda: "u = 1,5 (1920x1080)" },
    { u: 2, legenda: "u = 2 (2560x1440)" },
  ];
  return (
    <Folha
      id="folha-escala"
      titulo="DEC-13: régua de escala"
      nota="O mesmo assento nos três degraus. Sprites procedurais (fichas, selos, ✔) usam pixel de arte = 2u: 2, 3 e 4 px, sempre inteiros. Retrato (64x92) e cartas (40x56) são arquivos fixos: ficam 1x, 1,5x e 2x; o 1,5x é o meio degrau que o DEC-13 precisa aprovar."
    >
      <div className="m3-faixa-celulas" style={{ alignItems: "flex-end" }}>
        {degraus.map((d) => (
          <div key={d.u} style={estiloVars({ "--u": d.u })} data-testid={`escala-${d.u}`}>
            <Celula legenda={`${d.legenda}: retrato ${Math.round(70 * d.u)}x${Math.round(98 * d.u)} px`}>
              <div style={{ display: "flex", gap: U(8), alignItems: "flex-end" }}>
                <Retrato avatar="capitao_porto" nome="Caio" influencias={2} ameaca="canhao" />
                <FichasSprite n={7} v={0} />
              </div>
            </Celula>
          </div>
        ))}
      </div>
    </Folha>
  );
}

export default function Folhas({ u }: { u: number }) {
  return (
    <div className="m3-folhas" style={estiloEscala(u)} data-testid="folhas">
      <FolhaEstados />
      <FolhaFichas />
      <FolhaDec24 />
      <FolhaZero />
      <FolhaErario />
      <FolhaBaralho />
      <FolhaEscala />
    </div>
  );
}
