"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSocket } from "@/src/lib/socket";
import type { CreateRoomAck } from "@/src/types/socket";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Veio de um link de sala sem nome? Pré-preenche o código.
  useEffect(() => {
    const join = new URLSearchParams(window.location.search).get("join");
    if (join) setCode(join.toUpperCase());
  }, []);

  function go(roomId: string) {
    router.push(`/room/${roomId}?name=${encodeURIComponent(name.trim())}`);
  }

  function handleCreate() {
    if (!name.trim()) return setError("Digite seu nome.");
    setError("");
    // Pede um código novo ao servidor, depois navega para a sala.
    getSocket().emit("room:create", (ack: CreateRoomAck) => go(ack.roomId));
  }

  function handleJoin() {
    if (!name.trim()) return setError("Digite seu nome.");
    if (!code.trim()) return setError("Digite o código da sala.");
    setError("");
    go(code.trim().toUpperCase());
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 420 }}>
      <h1>Coup Online</h1>

      <label style={{ display: "block", marginTop: 16 }}>
        Seu nome:
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <button onClick={handleCreate} style={{ marginTop: 16, padding: "8px 16px" }}>
        Criar sala
      </button>

      <hr style={{ margin: "24px 0" }} />

      <label style={{ display: "block" }}>
        Código da sala:
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex: ABC23"
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>
      <button onClick={handleJoin} style={{ marginTop: 16, padding: "8px 16px" }}>
        Entrar na sala
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
