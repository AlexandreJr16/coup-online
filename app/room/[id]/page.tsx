"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react";

import { CheatSheetButton } from "@/src/components/game/CheatSheet";
import GameBoard from "@/src/components/game/GameBoard";
import { assignAvatars, avatarUrl, COLORS, iconUrl } from "@/src/components/game/helpers";
import { visaoDoPlacar } from "@/src/components/game/placar";
import { useScore } from "@/src/components/game/useScore";
import TableBackdrop, { SalonBg } from "@/src/components/game/TableBackdrop";
import { RoundStatusSlot } from "@/src/components/game/TurnBanner";
import TimerSettings, { DEFAULT_TIMERS } from "@/src/components/game/TimerSettings";
import { AparenciaButton } from "@/src/components/ui/AparenciaPanel";
import { Leitura, QuadroEscuro } from "@/src/components/ui/Campo";
import { fonteKit } from "@/src/components/ui/escala";
import { Hud } from "@/src/components/ui/Hud";
import { IconButton } from "@/src/components/ui/IconButton";
import { PixelButton } from "@/src/components/ui/PixelButton";
import { PixelPanel } from "@/src/components/ui/PixelPanel";
import { Tag } from "@/src/components/ui/Tag";
import { clearToken, readCrt, readToken, saveCrt, saveToken, subscribeCrt } from "@/src/lib/session";
import { usePrefs } from "@/src/lib/audio/usePrefs";
import { getSocket } from "@/src/lib/socket";
import type { GameConfig, GameView } from "@/src/types/game";
import type { JoinRoomAck, Player } from "@/src/types/socket";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const roomId = (params.id ?? "").toUpperCase();
  const name = searchParams.get("name") ?? "";
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [view, setView] = useState<GameView | null>(null);
  const [myId, setMyId] = useState("");
  const [error, setError] = useState("");
  // useSyncExternalStore: o servidor renderiza "off" e o cliente troca depois da hidratação,
  // sem erro #418 (ler localStorage direto no useState divergia do HTML do servidor).
  const [audio, setAudio] = usePrefs();
  const crt = useSyncExternalStore(subscribeCrt, readCrt, () => false);
  // Aplica o filtro no <html>: o CSS faz o resto (scanlines que não capturam cliques).
  useEffect(() => {
    document.documentElement.dataset.crt = crt ? "1" : "0";
    return () => {
      document.documentElement.dataset.crt = "0";
    };
  }, [crt]);
  const [timers, setTimers] = useState<GameConfig>(DEFAULT_TIMERS); // só o host usa

  // Só existe no cliente; o <code> usa suppressHydrationWarning (SSR renderiza vazio).
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : "";

  useEffect(() => {
    // Sem nome (entrou direto pelo link): manda de volta pra home pra digitar.
    if (!name) {
      router.replace(`/?join=${roomId}`);
      return;
    }

    const socket = getSocket();

    function onPlayers(list: Player[]) {
      setPlayers(list);
    }
    function onSpectators(list: Player[]) {
      setSpectators(list);
    }
    function onState(v: GameView) {
      setView(v);
    }
    socket.on("room:players", onPlayers);
    socket.on("room:spectators", onSpectators);
    socket.on("game_state", onState);

    function join() {
      // Reenvia o token a cada (re)conexão: o servidor devolve o MESMO assento.
      socket.emit("room:join", { roomId, name, token: readToken(roomId) }, (ack: JoinRoomAck) => {
        if (!ack.ok) {
          setError(ack.error);
          return;
        }
        setError("");
        setPlayers(ack.players);
        setSpectators(ack.spectators);
        setMyId(ack.you.id);
        saveToken(roomId, ack.you.token);
      });
    }

    // Garante o join mesmo se o socket reconectar.
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("room:players", onPlayers);
      socket.off("room:spectators", onSpectators);
      socket.off("game_state", onState);
      socket.off("connect", join);
    };
  }, [roomId, name, router]);

  const isHost = players[0]?.id === myId;
  // Só assiste: entrou com a partida em andamento (ou a sala cheia). O papel sai da lista de
  // jogadores, então a promoção na próxima partida vira jogador sem evento extra.
  const isSpectator = myId !== "" && !players.some((p) => p.id === myId);

  function startGame() {
    setError("");
    getSocket().emit("game_start", { config: timers }, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }

  // Sair de propósito: libera o assento (no lobby) e esquece a sessão desta sala.
  // Mesmo retrato no lobby e na mesa: o sorteio usa só a lista de ids, que é a mesma.
  const avatarSlugs = assignAvatars(players.map((p) => p.id));
  // P23.S3: placar da noite também na sala de espera (some enquanto a sala não jogou nenhuma partida).
  const placarLobby = visaoDoPlacar(useScore(), { matchNumber: 0, playerIds: players.map((p) => p.id), avatares: {} });

  function leave() {
    getSocket().emit("room:leave");
    clearToken(roomId);
    router.push("/");
  }

  return (
    <main
      style={{
        // Na partida, a altura precisa ser DEFINIDA (o palco mede a área e centraliza nela); o
        // body só tem min-height, então "100%" virava auto e a mesa media 0 (bug de 19/10).
        height: view ? "100dvh" : "100%",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
      }}
    >
      {/* HUD enxuto: logo, sala e botões do kit. A faixa de status da rodada entra no miolo
          (portal do TurnBanner). */}
      <Hud
        codigo={roomId}
        extra={
          spectators.length > 0 ? (
            <Tag
              tom="fora"
              data-testid="spectators-chip"
              title={`Assistindo: ${spectators.map((s) => s.name).join(", ")}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconUrl("olho") ?? undefined} alt="Espectadores" width={16} height={16} style={pixelImg} />
              {spectators.length}
            </Tag>
          ) : null
        }
        centro={<RoundStatusSlot />}
      >
        <IconButton
          icone={audio.muted ? "mudo" : "som"}
          rotulo={audio.muted ? "Ligar o som" : "Silenciar"}
          onClick={() => setAudio({ muted: !audio.muted })}
          data-testid="mute-toggle"
          aria-pressed={audio.muted}
        />
        <IconButton
          icone="crt"
          rotulo="Filtro CRT (scanlines)"
          forcado={crt ? "pressionado" : undefined}
          onClick={() => saveCrt(!crt)}
          data-testid="crt-toggle"
          aria-pressed={crt}
        />
        <CheatSheetButton />
        <AparenciaButton />
        <IconButton icone="sair" rotulo="Sair" onClick={leave} data-testid="leave-button" />
      </Hud>

      {view ? (
        // Partida em andamento: o tabuleiro ocupa todo o espaço restante.
        <TableBackdrop>
          <GameBoard
            key={view.matchNumber} // revanche = tabuleiro novo (feed e animações zeram)
            view={view}
            myId={myId}
            absentIds={players.filter((p) => !p.connected).map((p) => p.id)}
            spectator={isSpectator}
          />
        </TableBackdrop>
      ) : (
        // Lobby: painel do kit centralizado com link, jogadores e início.
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <SalonBg />
          {/* Rola por dentro se o painel não couber (o cenário de fundo fica parado). */}
          <div
            style={{
              position: "relative",
              height: "100%",
              overflowY: "auto",
              display: "flex",
              alignItems: "safe center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <PixelPanel titulo="Sala de espera" data-testid="lobby-panel" style={lobbyCard}>
              <p style={{ color: "var(--k-texto-fraco)", fontSize: fonteKit(5), marginTop: 0 }}>
                Compartilhe o link para os amigos entrarem:
              </p>
              <Leitura suppressHydrationWarning>{shareUrl || `…/room/${roomId}`}</Leitura>

              {error && <p style={{ color: "var(--k-pg-face)", fontSize: fonteKit(5) }}>{error}</p>}

              <h3 style={subtitulo}>Jogadores ({players.length})</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {players.map((p) => (
                  <li key={p.id} data-player={p.name} data-avatar={avatarSlugs[players.indexOf(p)]} style={playerItem}>
                    <span
                      style={{
                        width: 30,
                        height: 36,
                        border: `3px solid ${p.connected ? "var(--k-filete)" : "var(--k-tinta)"}`,
                        background: "var(--k-tinta)",
                        flex: "none",
                        overflow: "hidden",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarUrl(avatarSlugs[players.indexOf(p)])}
                        alt=""
                        draggable={false}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", imageRendering: "pixelated", display: "block" }}
                      />
                    </span>
                    <span style={{ fontWeight: p.id === myId ? 700 : 500, opacity: p.connected ? 1 : 0.5 }}>
                      {p.name}
                      {p.id === myId ? " (você)" : ""}
                      {!p.connected ? " · reconectando…" : ""}
                    </span>
                    {players[0]?.id === p.id && (
                      <Tag tom="ouro" style={{ marginLeft: "auto" }}>
                        host
                      </Tag>
                    )}
                  </li>
                ))}
              </ul>

              {placarLobby && placarLobby.partidas > 0 && (
                <div data-testid="lobby-placar">
                  <h3 style={subtitulo}>Placar da noite</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: fonteKit(5) }}>
                    {placarLobby.linhas.map((l) => (
                      <li key={l.id} data-testid="lobby-placar-linha">
                        {l.name}: {l.wins} {l.wins === 1 ? "vitória" : "vitórias"}
                      </li>
                    ))}
                  </ul>
                  <p style={{ margin: 0, fontSize: fonteKit(5), color: "var(--k-texto-fraco)" }}>{placarLobby.rotulo}</p>
                </div>
              )}

              {spectators.length > 0 && (
                <>
                  <h3 style={subtitulo}>Assistindo ({spectators.length})</h3>
                  <p data-testid="lobby-spectators" style={{ margin: 0, fontSize: fonteKit(5), color: "var(--k-texto-fraco)" }}>
                    {spectators.map((s) => `${s.name}${s.id === myId ? " (você)" : ""}`).join(", ")}
                  </p>
                </>
              )}

              {isSpectator ? (
                <p data-testid="spectator-notice" style={{ color: "var(--k-texto)", marginTop: 20, fontSize: fonteKit(5) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconUrl("olho") ?? undefined} alt="" width={16} height={16} style={{ ...pixelImg, marginRight: 6 }} />
                  Sala cheia: você está assistindo. Entra como jogador quando abrir uma vaga ou na
                  próxima partida.
                </p>
              ) : isHost ? (
                <>
                  <QuadroEscuro>
                    <TimerSettings value={timers} onChange={setTimers} />
                  </QuadroEscuro>
                  <div style={{ marginTop: 16 }}>
                    <PixelButton cheio onClick={startGame} disabled={players.length < 2}>
                      Iniciar jogo
                    </PixelButton>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--k-texto-fraco)", marginTop: 20, fontSize: fonteKit(5) }}>Aguardando o host iniciar…</p>
              )}
            </PixelPanel>
          </div>
        </div>
      )}
    </main>
  );
}

const pixelImg: CSSProperties = { display: "inline-block", verticalAlign: "-3px", marginRight: 4, imageRendering: "pixelated" };
const lobbyCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 440,
};
const subtitulo: CSSProperties = { margin: "16px 0 8px", fontSize: fonteKit(5), fontWeight: 400, color: "var(--k-texto-fraco)" };
const playerItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 10px",
  fontSize: fonteKit(5),
  background: "var(--k-slot)",
  color: "var(--k-texto)",
};
