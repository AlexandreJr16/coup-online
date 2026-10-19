// Tela de fim de partida: quem venceu (retrato da mesa em moldura), prêmios da partida
// (computeAwards), placar da noite (`room:score`) e o botão grande de revanche. Cobre a mesa,
// mas o dock continua visível; "Jogar de novo" (Enter ou R) inicia a revanche.
// Arte: ícones PNG pixel, nunca emoji do sistema. Movimento só com transform/opacity.
"use client";

import { useEffect, useRef } from "react";

import { computeAwards } from "@/src/lib/game/awards";
import type { GameView } from "@/src/types/game";
import { PixelButton } from "../ui/PixelButton";
import { PixelPanel } from "../ui/PixelPanel";
import { Tag } from "../ui/Tag";
import { assignAvatars, avatarUrl, type IconName, iconUrl } from "./helpers";
import { juntarNomes, resumoLinha, visaoDoPlacar } from "./placar";
import { particulas, teclaPedeRevanche } from "./victory";
import v from "./VictoryPanel.module.css";
import { useScore } from "./useScore";

const CHUVA = particulas();
const REVANCHE_RECARGA_MS = 1000; // segurar Enter/R não pede a revanche várias vezes

function Icone({ nome, className, testId }: { nome: IconName; className?: string; testId?: string }) {
  const src = iconUrl(nome, "sm");
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden draggable={false} className={className ?? v.icone} data-testid={testId} />;
}

/** Moedas caindo (padrão). Posição determinística; oculta sob prefers-reduced-motion. */
function ChuvaDeMoedas() {
  const src = iconUrl("moeda", "sm");
  if (!src) return null;
  return (
    <div aria-hidden className={v.chuva} data-testid="victory-fx" data-fx="moedas" data-particulas={CHUVA.length}>
      {CHUVA.map((p, i) => (
        <div
          key={i}
          className={v.moeda}
          style={{
            left: `${p.esquerda}%`,
            ["--dx" as string]: `${p.desvio}px`,
            ["--dur" as string]: `${p.duracao}s`,
            ["--atraso" as string]: `${p.atraso}s`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className={v.moedaImg} style={{ ["--giro" as string]: `${p.giro}s` }} />
        </div>
      ))}
    </div>
  );
}

// `onRematch` ausente = espectador: só aguarda (ele entra na próxima partida).
export default function VictoryPanel({ view, onRematch }: { view: GameView; onRematch?: () => void }) {
  const ids = view.players.map((p) => p.id);
  const slugs = assignAvatars(ids); // o MESMO retrato da mesa
  const avatares = Object.fromEntries(ids.map((id, i) => [id, slugs[i]]));
  const winnerIdx = view.players.findIndex((p) => p.id === view.winnerId);
  const winner = winnerIdx >= 0 ? view.players[winnerIdx] : undefined;
  const names = Object.fromEntries(view.players.map((p) => [p.id, p.name]));
  const awards = computeAwards(view.stats, names);
  const placar = visaoDoPlacar(useScore(), { matchNumber: view.matchNumber, playerIds: ids, avatares });

  // Atalho: Enter ou R. Espaço fica de fora (na mesa é Passar).
  const rematchRef = useRef(onRematch);
  const ultimoPedido = useRef(0);
  useEffect(() => {
    rematchRef.current = onRematch;
  });
  const podeRevanche = Boolean(onRematch);
  useEffect(() => {
    if (!podeRevanche) return;
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target instanceof HTMLElement ? e.target : null;
      const ok = teclaPedeRevanche({
        key: e.key,
        repeat: e.repeat,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        defaultPrevented: e.defaultPrevented,
        alvoTag: alvo?.tagName.toLowerCase() ?? "body",
        alvoEditavel: Boolean(alvo?.isContentEditable),
        alvoEmDialogo: Boolean(alvo?.closest('[role="dialog"], dialog')),
        temModalAberto: Boolean(document.querySelector('[aria-modal="true"]')),
      });
      if (!ok) return;
      const agora = Date.now();
      if (agora - ultimoPedido.current < REVANCHE_RECARGA_MS) return;
      ultimoPedido.current = agora;
      e.preventDefault();
      rematchRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [podeRevanche]);

  return (
    <div data-testid="victory" className={v.veu}>
      <ChuvaDeMoedas />
      <PixelPanel className={v.painel} data-testid="victory-panel" aria-label="Fim de partida">
        <div className={v.rolagem}>
          <div className={v.corpo}>
            {/* Vencedor */}
            <section className={v.vencedor} data-testid="victory-winner">
              <div className={v.retratoBox}>
                <span aria-hidden className={v.pulso} />
                <div className={v.moldura}>
                  {winner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl(slugs[winnerIdx])}
                      alt={winner.name}
                      draggable={false}
                      className={v.retrato}
                      data-testid="victory-retrato"
                      data-avatar={slugs[winnerIdx]}
                    />
                  ) : (
                    <div className={v.retrato} />
                  )}
                </div>
                {winner && <Icone nome="coroa" className={v.coroa} testId="victory-coroa" />}
                <Icone nome="trofeu" className={v.trofeu} testId="victory-trofeu" />
              </div>
              <span className={v.partida}>PARTIDA {view.matchNumber}</span>
              <h2 className={v.nome} data-testid="victory-title">
                {winner ? `${winner.name} vence!` : "Empate"}
              </h2>
              <div className={v.acoes}>
                {onRematch ? (
                  <>
                    <PixelButton
                      className={v.revanche}
                      data-testid="revanche"
                      aria-keyshortcuts="Enter R"
                      onClick={onRematch}
                    >
                      <Icone nome="trocar" className="" />
                      Jogar de novo
                    </PixelButton>
                    <span className={v.atalho} aria-hidden>
                      <kbd>Enter</kbd> ou <kbd>R</kbd>
                    </span>
                  </>
                ) : (
                  <p data-testid="victory-wait" className={v.espera}>
                    <Icone nome="ampulheta" className="" />
                    <span>Você está assistindo: se um jogador pedir a revanche, você entra na próxima partida.</span>
                  </p>
                )}
              </div>
            </section>

            {/* Prêmios da partida */}
            <section>
              <h3 className={v.titulo}>Prêmios da partida</h3>
              <ul className={v.lista} data-testid="victory-awards">
                {awards.length === 0 && <li className={v.vazio}>Partida tranquila: ninguém levou prêmio.</li>}
                {awards.map((a) => (
                  <li key={a.id} data-award={a.id} className={v.item}>
                    <Icone nome={a.icone} />
                    <span className={v.texto}>
                      <b className={v.nomeLinha}>{a.titulo}</b>
                      <span className={v.detalhe}>
                        {juntarNomes(a.names)} · {a.detalhe}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Placar da noite */}
            <section data-testid="placar">
              <h3 className={v.titulo}>Placar da noite</h3>
              {placar ? (
                <>
                  <ul className={v.lista} data-testid="placar-linhas">
                    {placar.linhas.map((l) => (
                      <li
                        key={l.id}
                        data-player={l.id}
                        data-lider={l.lider ? "sim" : undefined}
                        className={`${v.item} ${l.lider ? v.itemLider : ""}`}
                      >
                        {l.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl(l.avatar)} alt="" draggable={false} className={v.avatar} />
                        ) : (
                          <span aria-hidden className={v.semAvatar} />
                        )}
                        <span className={v.texto}>
                          <span className={v.linhaNome}>
                            <b className={v.nomeLinha}>{l.name}</b>
                            {l.lider && <Tag tom="ouro">Líder</Tag>}
                          </span>
                          <span className={v.detalhe}>{resumoLinha(l.wins, l.played)}</span>
                        </span>
                        <span className={v.vitorias}>
                          {l.ultimoVencedor && <Tag tom="ouro">+1</Tag>}
                          <b data-testid="placar-vitorias">{l.wins}</b>
                          <Icone nome="trofeu" />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {placar.ocultas > 0 && <p className={v.rodape}>e mais {placar.ocultas} que já saíram da sala</p>}
                  {placar.titulos.length > 0 && (
                    <div className={v.titulosNoite} data-testid="placar-titulos">
                      <h3 className={v.titulo}>Títulos da noite</h3>
                      <ul className={v.lista}>
                        {placar.titulos.map((t) => (
                          <li key={t.id} data-title={t.id} className={`${v.item} ${v.itemCompacto}`} title={`${t.titulo}: ${t.quem} · ${t.detalhe}`}>
                            <Icone nome={t.icone} />
                            <span className={v.texto}>
                              <b className={v.nomeLinha}>{t.titulo}</b>
                              <span className={v.detalhe}>{t.quem} · {t.detalhe}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className={v.rodape}>{placar.rotulo}. O placar zera quando a sala fecha.</p>
                </>
              ) : (
                <p className={v.vazio} data-testid="placar-vazio">
                  O placar da noite aparece em instantes.
                </p>
              )}
            </section>
          </div>
        </div>

      </PixelPanel>
    </div>
  );
}
