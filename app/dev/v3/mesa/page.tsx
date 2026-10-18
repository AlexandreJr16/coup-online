// Mockup P03.S2 (Fase 0): hierarquia NOVA da mesa, estática, sem socket, dados fictícios.
//   /dev/v3/mesa?n=2|4&res=1280|1920&acao=taxas|assassinar
// O estado mostrado: o Barão do Café declara (Taxas ou Assassinar), janela de reação aberta.
import Link from "next/link";

import "./mesa.css";
import { lerAcao, lerTamanho, montarCena } from "./cena";
import Decisoes from "./Decisoes";
import { RESOLUCOES, type Resolucao } from "./escala";
import Folhas from "./Folhas";
import { fontePixel } from "./fonte";
import Palco from "./Palco";

export const metadata = { title: "Mockup da mesa (v3)" };

interface Busca {
  n?: string;
  res?: string;
  acao?: string;
}

function Opcao({ ativo, destino, children }: { ativo: boolean; destino: string; children: string }) {
  return (
    <Link href={destino} className="m3-opcao" aria-current={ativo ? "page" : undefined} prefetch={false}>
      {children}
    </Link>
  );
}

export default async function MesaV3Page({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  const n = lerTamanho(q.n);
  const resolucao: Resolucao = q.res === "1920" ? 1920 : 1280;
  const acao = lerAcao(q.acao);
  const cena = montarCena(n, acao);
  const href = (p: Partial<{ n: number; res: number; acao: string }>) =>
    `/dev/v3/mesa?n=${p.n ?? n}&res=${p.res ?? resolucao}&acao=${p.acao ?? acao}`;

  return (
    <main className={`${fontePixel.variable} m3-pagina`} data-testid="mesa-v3">
      <nav className="m3-nav" aria-label="Navegação do mockup" data-testid="nav-mockup">
        <strong>Mesa v3 · mockup</strong>
        <span className="m3-grupo">
          jogadores
          <Opcao ativo={n === 2} destino={href({ n: 2 })}>2</Opcao>
          <Opcao ativo={n === 4} destino={href({ n: 4 })}>4</Opcao>
        </span>
        <span className="m3-grupo">
          tamanho
          <Opcao ativo={resolucao === 1280} destino={href({ res: 1280 })}>1280x720</Opcao>
          <Opcao ativo={resolucao === 1920} destino={href({ res: 1920 })}>1920x1080</Opcao>
        </span>
        <span className="m3-grupo">
          jogada
          <Opcao ativo={acao === "taxas"} destino={href({ acao: "taxas" })}>Taxas</Opcao>
          <Opcao ativo={acao === "assassinar"} destino={href({ acao: "assassinar" })}>Assassinar (com alvo)</Opcao>
        </span>
        <span className="m3-grupo">
          ir para
          <a href="#folha-estados" className="m3-opcao">estados</a>
          <a href="#folha-fichas" className="m3-opcao">fichas</a>
          <a href="#folha-erario" className="m3-opcao">erário</a>
          <a href="#folha-escala" className="m3-opcao">escala</a>
        </span>
      </nav>

      <Decisoes />

      <section className="m3-secao" aria-label="Palco">
        <h2>
          Mesa com {n} jogadores em {RESOLUCOES[resolucao].largura}x{RESOLUCOES[resolucao].altura} (--u = {RESOLUCOES[resolucao].u})
        </h2>
        <p className="m3-nota">
          Tudo no palco é medido em <code>--u</code>: 1 em 1280x720 e 1,5 em 1920x1080, então assentos, cartas e fichas ficam
          maiores no 1920 sem mudar o layout. O palco tem tamanho exato em px; em telas menores, role na horizontal.
        </p>
        <Palco cena={cena} resolucao={resolucao} />
      </section>

      <Folhas u={RESOLUCOES[resolucao].u} />
    </main>
  );
}
