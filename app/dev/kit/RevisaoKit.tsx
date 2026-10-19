"use client";
// Revisão ao vivo do kit REAL (src/components/ui). O seletor troca fonte/estilo/dock no <html>
// e salva na preferência (coup:aparencia), exatamente como a futura aba de Aparência (P27).
import { useState, type ReactNode } from "react";
import { IconButton } from "@/src/components/ui/IconButton";
import { ICONES, type IconeId } from "@/src/components/ui/icones";
import { Logo } from "@/src/components/ui/Logo";
import { PixelButton } from "@/src/components/ui/PixelButton";
import { PixelIcon } from "@/src/components/ui/PixelIcon";
import { PixelPanel } from "@/src/components/ui/PixelPanel";
import { ResourceBar } from "@/src/components/ui/ResourceBar";
import { Tag } from "@/src/components/ui/Tag";
import { useAparencia } from "@/src/components/ui/useAparencia";
import { DOCKS_PREF, ESTILOS_PREF, FONTES_PREF } from "@/src/lib/aparencia";
import s from "./revisao.module.css";

const NOME_FONTE = {
  pixelify: "Pixelify Sans (padrão)",
  silkscreen: "Silkscreen",
  vt323: "VT323",
  press: "Press Start 2P",
} as const;
const NOME_ESTILO = { A: "A: madeira e latão (padrão)", B: "B: pergaminho e tinta" } as const;
const NOME_DOCK = { mesa: "Mão sobre a mesa (padrão)", cavalete: "Cavalete", bandeja: "Bandeja de couro" } as const;

function Grupo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={s.grupo}>
      <span className={s.grupoRotulo}>{rotulo}</span>
      {children}
    </div>
  );
}

function Opcoes<T extends string>({
  nome,
  rotulo,
  valores,
  nomes,
  atual,
  aoEscolher,
}: {
  nome: string;
  rotulo: string;
  valores: readonly T[];
  nomes: Record<T, string>;
  atual: T;
  aoEscolher: (v: T) => void;
}) {
  return (
    <Grupo rotulo={rotulo}>
      <div className={s.linha} role="group" aria-label={rotulo}>
        {valores.map((v) => (
          <PixelButton
            key={v}
            forcado={v === atual ? "pressionado" : undefined}
            aria-pressed={v === atual}
            data-testid={`opcao-${nome}-${v}`}
            onClick={() => aoEscolher(v)}
          >
            {nomes[v]}
          </PixelButton>
        ))}
      </div>
    </Grupo>
  );
}

export function RevisaoKit() {
  const [aparencia, mudar] = useAparencia();
  const [cliques, setCliques] = useState(0);

  return (
    <main className={s.pagina} data-testid="kit-real">
      <div className={s.miolo}>
        <header>
          <h1 className={s.titulo}>Kit de UI (componentes reais)</h1>
          <p className={s.sub}>
            Revisão dos componentes de src/components/ui. Escolha fonte e estilo abaixo: o tema muda ao vivo no
            documento inteiro e a escolha fica salva neste navegador (coup:aparencia). A migração das telas é a
            próxima entrega.
          </p>
        </header>

        <PixelPanel titulo="Aparência" data-testid="painel-aparencia">
          <Opcoes
            nome="fonte"
            rotulo="FONTE"
            valores={FONTES_PREF}
            nomes={NOME_FONTE}
            atual={aparencia.fonte}
            aoEscolher={(fonte) => mudar({ fonte })}
          />
          <Opcoes
            nome="estilo"
            rotulo="ESTILO DO KIT"
            valores={ESTILOS_PREF}
            nomes={NOME_ESTILO}
            atual={aparencia.estilo}
            aoEscolher={(estilo) => mudar({ estilo })}
          />
          <Opcoes
            nome="dock"
            rotulo="BARRA DE BAIXO (só a preferência; as 3 variações visuais vêm no P09)"
            valores={DOCKS_PREF}
            nomes={NOME_DOCK}
            atual={aparencia.dock}
            aoEscolher={(dock) => mudar({ dock })}
          />
          <Grupo rotulo="PREFERÊNCIA ATUAL">
            <p className={s.estado} data-testid="aparencia-atual">
              fonte={aparencia.fonte} estilo={aparencia.estilo} dock={aparencia.dock}
            </p>
          </Grupo>
        </PixelPanel>

        <div className={s.grade}>
          <PixelPanel titulo="Botões" data-testid="painel-botoes">
            <Grupo rotulo="NORMAL / PERIGO">
              <div className={s.linha}>
                <PixelButton data-testid="btn-normal" onClick={() => setCliques((n) => n + 1)}>
                  Confirmar
                </PixelButton>
                <PixelButton variante="perigo" data-testid="btn-perigo" onClick={() => setCliques((n) => n + 1)}>
                  Contestar
                </PixelButton>
              </div>
              <p className={s.corpo} data-testid="contador-cliques">
                Cliques: {cliques}
              </p>
            </Grupo>
            <Grupo rotulo="ESTADOS (hover, pressionado forçados; desabilitado)">
              <div className={s.linha}>
                <PixelButton forcado="hover">Hover</PixelButton>
                <PixelButton forcado="pressionado">Pressionado</PixelButton>
                <PixelButton disabled data-testid="btn-desabilitado">
                  Desabilitado
                </PixelButton>
                <PixelButton variante="perigo" disabled>
                  Perigo off
                </PixelButton>
              </div>
            </Grupo>
            <Grupo rotulo="ICONBUTTON (alvo >= 44px)">
              <div className={s.linha}>
                {(Object.keys(ICONES) as IconeId[]).map((id) => (
                  <IconButton key={id} icone={id} rotulo={id} data-testid={`iconbtn-${id}`} />
                ))}
                <IconButton icone="sair" rotulo="sair (desabilitado)" disabled />
              </div>
            </Grupo>
          </PixelPanel>

          <PixelPanel titulo="Tags, barras e ícones" data-testid="painel-dados">
            <Grupo rotulo="TAG">
              <div className={s.linha}>
                <Tag tom="ouro" data-testid="tag-ouro">
                  Sua vez
                </Tag>
                <Tag tom="perigo">Perigo</Tag>
                <Tag tom="bloqueio">Bloqueio</Tag>
                <Tag tom="fora">Fora</Tag>
                <Tag tom="blefe">Blefe</Tag>
              </div>
            </Grupo>
            <Grupo rotulo="RESOURCEBAR">
              <div className={s.coluna}>
                <ResourceBar rotulo="Moedas" valor={7} max={10} cor="var(--p-ouro)" testId="barra-moedas" />
                <ResourceBar rotulo="Influências" valor={1} max={2} cor="var(--p-rubro)" />
                <ResourceBar rotulo="Tempo" valor={12} max={20} cor="var(--p-ceu)" unidade="s" />
              </div>
            </Grupo>
            <Grupo rotulo="PIXELICON (cor do texto, tamanhos 1x e 2x)">
              <div className={s.linha}>
                {(Object.keys(ICONES) as IconeId[]).map((id) => (
                  <PixelIcon key={id} nome={id} celula={2} titulo={id} />
                ))}
              </div>
            </Grupo>
            <Grupo rotulo="LOGO (provisória; a definitiva vem do P05)">
              <Logo />
            </Grupo>
          </PixelPanel>
        </div>

        <PixelPanel titulo="Texto (acentos pt-BR)" data-testid="painel-texto">
          <p className={s.corpo} data-testid="texto-amostra">
            Barão do Café, Benzedeira, Ação, Você — 0123456789 · → − ! ?
          </p>
        </PixelPanel>
      </div>
    </main>
  );
}
