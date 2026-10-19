"use client";
// Aba de Aparência (P27.S4): painel do kit sobre a tela, aberto pela engrenagem do HUD da
// sala e pelo canto da home. Três escolhas (fonte, estilo do kit, barra de baixo), prévia ao
// vivo (o `useAparencia` troca os data-* do <html> na hora e salva no localStorage) e um slot
// para a futura linha de Efeitos (P27.S6).
//
// Convivência com a mesa (mesmo contrato da colinha): NÃO pausa nada; o Esc é tratado em
// CAPTURA e interrompe a propagação, para não cancelar por baixo a mira de uma ação (o
// GameBoard escuta Esc na bolha da window); Espaço/Enter num botão DENTRO do painel ativa o
// botão e não vira "Passar" na mesa; clicar fora fecha. Tab fica preso no painel.
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AMOSTRA_FONTE,
  descreverPainel,
  escolhaDoPainel,
  GRUPOS_DO_PAINEL,
  ROTULO_DO_GRUPO,
  type GrupoDoPainel,
} from "./aparenciaOpcoes";
import { IconButton } from "./IconButton";
import { PixelButton } from "./PixelButton";
import { PixelPanel } from "./PixelPanel";
import { Tag } from "./Tag";
import { useAparencia } from "./useAparencia";
import s from "./ui.module.css";

const FOCAVEIS = "button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function AparenciaPanel({ onFechar, efeitos }: { onFechar: () => void; efeitos?: ReactNode }) {
  const [aparencia, mudar] = useAparencia();
  const caixaRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const descricao = descreverPainel(aparencia);

  // `onFechar` muda a cada render do pai; o efeito de teclado não pode reiniciar (e roubar o
  // foco para o botão Fechar) toda vez que uma opção é escolhida.
  const fecharAtual = useRef(onFechar);
  useEffect(() => {
    fecharAtual.current = onFechar;
  });

  useEffect(() => {
    fecharRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return; // outro painel (colinha) já tratou esta tecla
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // não deixa o Esc cancelar a mira do GameBoard por baixo
        fecharAtual.current();
      } else if (e.key === "Tab") {
        const itens = [...(caixaRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])];
        if (itens.length === 0) return;
        const i = itens.indexOf(document.activeElement as HTMLElement);
        const alvo = e.shiftKey ? itens[i <= 0 ? itens.length - 1 : i - 1] : itens[i === -1 || i === itens.length - 1 ? 0 : i + 1];
        e.preventDefault();
        alvo.focus();
      } else if (
        (e.key === " " || e.key === "Enter") &&
        e.target instanceof HTMLElement &&
        caixaRef.current?.contains(e.target) &&
        e.target.closest("button")
      ) {
        e.stopPropagation(); // ativar o botão do painel não pode virar "Passar" na mesa
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  function escolher(grupo: GrupoDoPainel, valor: string) {
    const parcial = escolhaDoPainel(aparencia, grupo, valor);
    if (parcial) mudar(parcial);
  }

  return (
    <div
      className={s.modalFundo}
      data-testid="aparencia-backdrop"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className={s.modalCaixa} ref={caixaRef} role="dialog" aria-modal="true" aria-labelledby={tituloId} data-testid="aparencia-panel">
        <PixelPanel>
          <div className={s.modalTopo}>
            <h2 id={tituloId} className={s.modalTitulo}>
              Aparência
            </h2>
            <PixelButton ref={fecharRef} data-testid="aparencia-close" onClick={onFechar}>
              Fechar
            </PixelButton>
          </div>

          <fieldset className={s.grupo} data-testid="aparencia-grupo-fonte">
            <legend className={s.grupoRotulo}>{ROTULO_DO_GRUPO.fonte}</legend>
            <div className={s.opcoes}>
              {descricao.fonte.map((o) => (
                <PixelButton
                  key={o.valor}
                  className={s.opcaoFonte}
                  style={{ fontFamily: o.familia }}
                  forcado={o.selecionada ? "pressionado" : undefined}
                  aria-pressed={o.selecionada}
                  data-testid={`aparencia-fonte-${o.valor}`}
                  onClick={() => escolher("fonte", o.valor)}
                >
                  <span style={{ fontSize: `calc(var(--u) * 5 * ${o.escala})` }}>
                    {o.nome}
                    {o.padrao ? " (padrão)" : ""}
                  </span>
                  <span style={{ fontSize: `calc(var(--u) * 4 * ${o.escala})` }}>{AMOSTRA_FONTE}</span>
                </PixelButton>
              ))}
            </div>
          </fieldset>

          {GRUPOS_DO_PAINEL.filter((g) => g !== "fonte").map((g) => (
            <fieldset key={g} className={s.grupo} data-testid={`aparencia-grupo-${g}`}>
              <legend className={s.grupoRotulo}>{ROTULO_DO_GRUPO[g]}</legend>
              <div className={s.opcoes}>
                {(g === "estilo" ? descricao.estilo : descricao.dock).map((o) => (
                  <PixelButton
                    key={o.valor}
                    forcado={o.selecionada ? "pressionado" : undefined}
                    aria-pressed={o.selecionada}
                    data-testid={`aparencia-${g}-${o.valor}`}
                    onClick={() => escolher(g, o.valor)}
                  >
                    {o.nome}
                    {o.emBreve ? <Tag tom="fora">em breve</Tag> : null}
                  </PixelButton>
                ))}
              </div>
              {g === "dock" ? (
                <p className={s.nota}>Cavalete e bandeja só guardam a escolha por enquanto: o visual chega com a nova barra.</p>
              ) : null}
            </fieldset>
          ))}

          {efeitos ? (
            <fieldset className={s.grupo} data-testid="aparencia-grupo-efeitos">
              <legend className={s.grupoRotulo}>Efeitos</legend>
              {efeitos}
            </fieldset>
          ) : null}

          <p className={s.nota}>A escolha vale na hora e fica salva neste navegador. Esc ou clique fora fecha.</p>
        </PixelPanel>
      </div>
    </div>
  );
}

/** Botão de engrenagem + o painel (portal no <body>). Usado no HUD da sala e na home. */
export function AparenciaButton({ efeitos }: { efeitos?: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Foco: ao fechar volta para a engrenagem (só se o foco se perdeu junto com o painel).
  const estavaAberto = useRef(false);
  useEffect(() => {
    if (!aberto && estavaAberto.current && btnRef.current && document.activeElement === document.body) {
      btnRef.current.focus();
    }
    estavaAberto.current = aberto;
  }, [aberto]);

  return (
    <>
      <IconButton
        ref={btnRef}
        icone="engrenagem"
        rotulo="Aparência"
        data-testid="aparencia-toggle"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      />
      {aberto &&
        createPortal(<AparenciaPanel onFechar={() => setAberto(false)} efeitos={efeitos} />, document.body)}
    </>
  );
}
