"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import GameBoard from "@/src/components/GameBoard";
import { getSocket } from "@/src/lib/socket";
import type { GameView } from "@/src/types/game";
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
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(`${window.location.origin}/room/${roomId}`);
  }, [roomId]);

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
      setMyId(socket.id ?? "");
      socket.emit("room:join", { roomId, name }, (ack: JoinRoomAck) => {
        if (!ack.ok) setError(ack.error);
        else setPlayers(ack.players);
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
    getSocket().emit("game_start", {}, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 640 }}>
      <h1>Sala {roomId}</h1>

      {view ? (
        // Partida em andamento: o tabuleiro assume.
        <GameBoard view={view} myId={myId} />
      ) : (
        <>
          <p>
            Compartilhe:{" "}
            <code style={{ userSelect: "all" }}>
              {shareUrl || `…/room/${roomId}`}
            </code>
          </p>

          {error && <p style={{ color: "crimson" }}>{error}</p>}

          <h2>Jogadores ({players.length})</h2>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.name}
                {p.id === myId ? " (você)" : ""}
                {players[0]?.id === p.id ? " — host" : ""}
              </li>
            ))}
          </ul>

          {isHost && (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              style={{ marginTop: 16, padding: "8px 16px" }}
            >
              Iniciar jogo
            </button>
          )}
          {!isHost && <p>Aguardando o host iniciar…</p>}
        </>
      )}

      <button onClick={() => router.push("/")} style={{ marginTop: 16 }}>
        Sair
      </button>
    </main>
  );
}
