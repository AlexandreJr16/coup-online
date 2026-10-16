"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react";

import { CheatSheetButton } from "@/src/components/game/CheatSheet";
import GameBoard from "@/src/components/game/GameBoard";
import { assignAvatars, avatarColor, avatarUrl, CINZEL, COLORS } from "@/src/components/game/helpers";
import TableBackdrop, { SalonBg } from "@/src/components/game/TableBackdrop";
import { RoundStatusSlot } from "@/src/components/game/TurnBanner";
import TimerSettings, { DEFAULT_TIMERS } from "@/src/components/game/TimerSettings";
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
    function onState(v: GameView) {
      setView(v);
    }
    socket.on("room:players", onPlayers);
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
        setMyId(ack.you.id);
        saveToken(roomId, ack.you.token);
      });
    }

    // Garante o join mesmo se o socket reconectar.
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("room:players", onPlayers);
      socket.off("game_state", onState);
      socket.off("connect", join);
    };
  }, [roomId, name, router]);

  const isHost = players[0]?.id === myId;

  function startGame() {
    setError("");
    getSocket().emit("game_start", { config: timers }, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }

  // Sair de propósito: libera o assento (no lobby) e esquece a sessão desta sala.
  // Mesmo retrato no lobby e na mesa: o sorteio usa só a lista de ids, que é a mesma.
  const avatarSlugs = assignAvatars(players.map((p) => p.id));

  function leave() {
    getSocket().emit("room:leave");
    clearToken(roomId);
    router.push("/");
  }

  return (
    <main
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
      }}
    >
      {/* Barra superior slim: identidade, sala e sair */}
      <header style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{ fontFamily: CINZEL, fontWeight: 800, letterSpacing: 0.5, whiteSpace: "nowrap" }}
          >
            <span style={{ color: COLORS.gold }}>Coup</span> Online
          </span>
          <span style={roomChip}>Sala {roomId}</span>
        </div>

        {/* Miolo do cabeçalho: a faixa de status da rodada entra aqui (portal do TurnBanner) */}
        <RoundStatusSlot />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheatSheetButton />
          <button
            onClick={() => setAudio({ muted: !audio.muted })}
            className="game-btn"
            style={toggleBtn}
            data-testid="mute-toggle"
            aria-pressed={audio.muted}
            title={audio.muted ? "Ligar o som" : "Silenciar"}
          >
            {audio.muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => saveCrt(!crt)}
            className="game-btn"
            style={toggleBtn}
            data-testid="crt-toggle"
            aria-pressed={crt}
            title="Filtro CRT (scanlines)"
          >
            📺 CRT {crt ? "on" : "off"}
          </button>
          <button onClick={leave} className="game-btn" style={leaveBtn}>
            Sair
          </button>
        </div>
      </header>

      {view ? (
        // Partida em andamento: o tabuleiro ocupa todo o espaço restante.
        <TableBackdrop>
          <GameBoard
            key={view.matchNumber} // revanche = tabuleiro novo (feed e animações zeram)
            view={view}
            myId={myId}
            absentIds={players.filter((p) => !p.connected).map((p) => p.id)}
          />
        </TableBackdrop>
      ) : (
        // Lobby: card centralizado com link, jogadores e início.
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <SalonBg />
          <div className="panel-salon" style={lobbyCard}>
            <h2 style={{ margin: "0 0 4px", fontFamily: CINZEL, fontSize: 24, fontWeight: 800 }}>
              Sala de espera
            </h2>
            <p style={{ color: COLORS.dim, fontSize: 14, marginTop: 0 }}>
              Compartilhe o link para os amigos entrarem:
            </p>
            <code style={shareBox} suppressHydrationWarning>
              {shareUrl || `…/room/${roomId}`}
            </code>

            {error && <p style={{ color: COLORS.red, fontSize: 14 }}>{error}</p>}

            <h3 style={{ margin: "20px 0 8px", fontSize: 15, color: COLORS.dim }}>
              Jogadores ({players.length})
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {players.map((p) => (
                <li key={p.id} data-player={p.name} data-avatar={avatarSlugs[players.indexOf(p)]} style={playerItem}>
                  <span
                    style={{
                      width: 30,
                      height: 36,
                      borderRadius: 6,
                      border: `2px solid ${p.connected ? COLORS.gold : "#555"}`,
                      background: avatarColor(p.name),
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
                    <span style={{ marginLeft: "auto", fontSize: 12, color: COLORS.gold }}>
                      host
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {isHost ? (
              <>
                <TimerSettings value={timers} onChange={setTimers} />
                <button
                  onClick={startGame}
                  disabled={players.length < 2}
                  className="game-btn"
                  style={startBtn}
                >
                  Iniciar jogo
                </button>
              </>
            ) : (
              <p style={{ color: COLORS.dim, marginTop: 20 }}>Aguardando o host iniciar…</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

const topBar: CSSProperties = {
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 16px",
  background: "linear-gradient(#2b1f1c, #1a1214)",
  borderBottom: "2px solid rgba(240,165,0,0.6)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
  color: COLORS.text,
};
const roomChip: CSSProperties = {
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  color: COLORS.gold,
  background: "rgba(240,165,0,0.12)",
  border: "1px solid rgba(240,165,0,0.4)",
  borderRadius: 999,
  whiteSpace: "nowrap",
};
// Cor base via --c; o gradiente/sombra/press vêm da classe .game-btn.
const toggleBtn = {
  padding: "7px 12px",
  fontSize: 13,
  color: COLORS.text,
  borderRadius: 8,
  whiteSpace: "nowrap",
  "--c": COLORS.neutral,
} as CSSProperties;
const leaveBtn = {
  padding: "7px 12px",
  fontSize: 13,
  color: COLORS.text,
  borderRadius: 8,
  "--c": "#3a3550",
} as CSSProperties;
const lobbyCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 440,
  padding: 28,
  color: COLORS.text,
};
const shareBox: CSSProperties = {
  display: "block",
  padding: "10px 12px",
  fontSize: 13,
  color: COLORS.text,
  background: "rgba(14,8,10,0.7)",
  border: "1px solid rgba(240,165,0,0.35)",
  borderRadius: 10,
  userSelect: "all",
  wordBreak: "break-all",
};
const playerItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
};
const startBtn = {
  width: "100%",
  marginTop: 20,
  padding: "12px 16px",
  fontSize: 15,
  color: "#1a1a2e",
  borderRadius: 10,
  "--c": COLORS.gold,
} as CSSProperties;
