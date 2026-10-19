// Colinha das cartas e do jogo: botão "?" + UMA peça única (carta de referência que sobe, P22)
// com os 5 personagens em colunas, as ações livres e 5 regras curtas. O conteúdo vem de
// buildCheatSheet() (cheatsheet.ts, derivado do catálogo de cartas); só as regras curtas vêm de
// RULES_CARD. Visual no kit (variáveis `--k-*`: vale para os estilos A e B), em CheatSheet.module.css.
//
// NÃO pausa nada: os timers são do servidor e o jogo segue rodando enquanto a pessoa lê.
// Teclado: `?` abre/fecha; `Esc` fecha. O Esc é tratado em CAPTURA e interrompe a
// propagação, para não cancelar por baixo a mira de uma ação (GameBoard escuta Esc na
// bolha da window). Atalhos do jogo (Espaço/C/B) continuam funcionando, exceto Espaço/Enter
// em botão DENTRO do painel: aí é "ativar o botão", não "passar a reação".
"use client";

import { type ComponentPropsWithoutRef, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  buildCheatSheet,
  RULES_CARD,
  type ActionInfo,
  type BlockScope,
  type CharacterInfo,
} from "./cheatsheet";
import { artUrl, iconUrl, type IconName } from "./helpers";
import { CARD_BY_ID } from "@/src/lib/game/cards";
import { cx } from "@/src/components/ui/cx";
import { IconButton } from "@/src/components/ui/IconButton";
import { PixelButton } from "@/src/components/ui/PixelButton";
import { PixelPanel } from "@/src/components/ui/PixelPanel";
import ui from "@/src/components/ui/ui.module.css";
import c from "./CheatSheet.module.css";

const SHEET = buildCheatSheet();

const quemTxt = (q: BlockScope) => (q === "qualquer" ? "qualquer um" : "só o alvo");

function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

export function CheatSheetButton() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Teclado global (captura): `?` abre/fecha, Esc fecha, Tab fica preso no painel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) {
        if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        e.stopPropagation(); // não deixa o Esc cancelar a mira do GameBoard por baixo
        setOpen(false);
      } else if (e.key === "Tab") {
        e.preventDefault(); // o único elemento focável do painel é o botão de fechar
        closeRef.current?.focus();
      } else if (
        (e.key === " " || e.key === "Enter") &&
        e.target instanceof HTMLElement &&
        dialogRef.current?.contains(e.target) &&
        e.target.closest("button")
      ) {
        e.stopPropagation(); // ativar o botão do painel não pode virar "Passar" na mesa
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Foco: ao abrir vai para o painel; ao fechar volta para o botão "?" (só se o foco
  // se perdeu junto com o painel; nunca na montagem da página).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpen.current && btnRef.current && document.activeElement === document.body) {
      btnRef.current.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <IconButton
        ref={btnRef}
        icone="ajuda"
        rotulo="Colinha das cartas e regras (?)"
        data-testid="cheatsheet-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      {open &&
        createPortal(
          <div
            data-testid="cheatsheet-backdrop"
            className={ui.modalFundo}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="cheatsheet"
              className={c.peca}
            >
              <PixelPanel>
                <div className={c.topo}>
                  <Px src={iconUrl("coroa")} className={c.coroa} />
                  <h2 id={titleId} className={c.titulo}>
                    Colinha
                  </h2>
                  <span className={c.dica}>Esc ou ? fecha. O jogo continua rodando enquanto você lê.</span>
                  <PixelButton
                    ref={closeRef}
                    data-testid="cheatsheet-close"
                    aria-label="Fechar a colinha"
                    onClick={() => setOpen(false)}
                  >
                    Fechar
                  </PixelButton>
                </div>
                <CheatSheetBody />
              </PixelPanel>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Corpo da colinha (usado também pela página de revisão /dev/colinha). */
export function CheatSheetBody() {
  return (
    <div className={c.corpo} data-testid="cheatsheet-body">
      <div className={c.personagens} data-testid="colinha-personagens">
        {SHEET.characters.map((ch) => (
          <Coluna key={ch.id} ch={ch} />
        ))}
      </div>

      <div className={c.rodape}>
        <section data-testid="colinha-gerais" aria-label="Sem personagem">
          <h3 className={c.secao}>Sem personagem</h3>
          <ul className={c.lista}>
            {SHEET.generalActions.map((a) => (
              <li key={a.action} className={c.geral} data-action={a.action}>
                <span className={cx(c.geralSelo, a.action === "golpe" && c.geralPerigo)}>
                  <Px src={iconUrl(a.action)} className={c.seloImg} />
                </span>
                <div className={c.geralTexto}>
                  <div className={c.acaoNome}>{a.label}</div>
                  <div className={c.efeito}>{a.efeito}</div>
                </div>
                <Flags info={a} linha />
              </li>
            ))}
          </ul>
        </section>

        <section data-testid="colinha-regras" aria-label="Regras rápidas">
          <h3 className={c.secao}>Regras rápidas</h3>
          <ul className={c.lista}>
            {RULES_CARD.map((r) => (
              <li key={r.id} className={c.regra} data-regra={r.id}>
                <Px src={iconUrl(r.icone)} className={c.regraIcone} />
                <span>{r.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// Imagem pixel do kit (PNG de public/art/<tema>/). Decorativa por padrão (alt vazio).
function Px({
  src,
  className,
  alt = "",
  ...resto
}: { src: string | null; className: string } & Omit<ComponentPropsWithoutRef<"img">, "src" | "className">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...resto} src={src ?? undefined} alt={alt} className={className} draggable={false} />;
}

function Coluna({ ch }: { ch: CharacterInfo }) {
  const iconeDoPoder: IconName = ch.acao ? ch.acao.action : "bloquear";
  return (
    <div className={c.coluna} data-character={ch.id} data-action={ch.acao?.action ?? "nenhuma"}>
      <div className={c.retrato} style={{ background: CARD_BY_ID[ch.id].cor }}>
        <Px src={artUrl(ch.id, "neutro", "sm")} className={c.retratoImg} alt={ch.nome} />
        <span className={c.selo}>
          <Px src={iconUrl(iconeDoPoder)} className={c.seloImg} />
        </span>
      </div>
      <h3 className={c.nome}>{ch.nome}</h3>

      <div className={c.acao}>
        {ch.acao ? (
          <>
            <div className={c.acaoNome}>{ch.acao.label}</div>
            <div className={c.efeito}>{ch.acao.efeito}</div>
          </>
        ) : (
          <>
            <div className={cx(c.acaoNome, c.semAcao)}>Sem ação de turno</div>
            <div className={c.efeito}>Só defende: não joga no próprio turno.</div>
          </>
        )}
      </div>

      {ch.acao ? <Flags info={ch.acao} /> : <div className={c.flags} />}

      <div className={cx(c.bloqueia, ch.bloqueia.length === 0 && c.bloqueiaNada)} data-flag="bloqueia">
        <Px src={iconUrl("bloquear")} className={c.bloqueiaImg} />
        <div>
          {ch.bloqueia.length === 0 ? (
            "Não bloqueia nada"
          ) : (
            ch.bloqueia.map((b) => (
              <div key={b.action}>
                Bloqueia {b.label}
                <div className={c.escopo}>{quemTxt(b.quem)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Contestável e bloqueável: ícone certo/errado em pixel, com os retratos de quem bloqueia. */
function Flags({ info, linha = false }: { info: ActionInfo; linha?: boolean }) {
  const bloqueavel = info.bloqueadaPor.length > 0;
  const nomes = info.bloqueadaPor.map((b) => b.nome).join(" ou ");
  return (
    <div className={cx(c.flags, linha && c.flagsLinha)}>
      <div className={c.flag} data-flag="contestar">
        <Marca ok={info.contestavel} rotulo="Contestável" />
        <span className={c.rotulo}>Contestável</span>
      </div>
      <div className={c.flag} data-flag="bloquear" title={bloqueavel ? `Bloqueada por ${nomes}` : undefined}>
        <Marca ok={bloqueavel} rotulo="Bloqueável" />
        <span className={c.rotulo}>
          Bloqueável
          {bloqueavel && <span className={c.escopo}>{quemTxt(info.bloqueadaPor[0].quem)}</span>}
        </span>
        {bloqueavel && (
          <span className={c.minis}>
            {info.bloqueadaPor.map((b) => (
              <Px key={b.characterId} src={artUrl(b.characterId, "neutro", "sm")} className={c.mini} alt={b.nome} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function Marca({ ok, rotulo }: { ok: boolean; rotulo: string }) {
  return (
    <Px
      src={iconUrl(ok ? "certo" : "errado")}
      className={c.marca}
      alt={`${rotulo}: ${ok ? "sim" : "não"}`}
      data-mark={ok ? "sim" : "nao"}
    />
  );
}
