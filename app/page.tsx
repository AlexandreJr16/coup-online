"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useState } from "react";

import { getSocket } from "@/src/lib/socket";
import type { CreateRoomAck } from "@/src/types/socket";
import { COLORS } from "@/src/components/game/helpers";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  // Veio de um link de sala sem nome? O código já chega no ?join= (consistente
  // entre SSR e cliente via useSearchParams — sem setState em effect).
  const [code, setCode] = useState(searchParams.get("join")?.toUpperCase() ?? "");
  const [error, setError] = useState("");

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
    <main
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `radial-gradient(ellipse at 50% 0%, #232347, ${COLORS.bg} 70%)`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#20203a",
          border: `1px solid ${COLORS.neutral}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: 0.5 }}>
          <span style={{ color: COLORS.gold }}>Coup</span>{" "}
          <span style={{ color: COLORS.text }}>Online</span>
        </h1>
        <p style={{ margin: "6px 0 22px", color: COLORS.dim, fontSize: 14 }}>
          Blefe, dedução e traição — 2 a 6 jogadores.
        </p>

        <label style={label}>
          Seu nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Alex"
            style={input}
          />
        </label>

        <button onClick={handleCreate} style={primaryBtn}>
          Criar sala
        </button>

        <div style={divider}>
          <span style={dividerLine} />
          <span style={{ color: COLORS.dim, fontSize: 12 }}>ou entrar com código</span>
          <span style={dividerLine} />
        </div>

        <label style={label}>
          Código da sala
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ex: ABC23"
            style={{ ...input, letterSpacing: 3, textTransform: "uppercase" }}
          />
        </label>

        <button onClick={handleJoin} style={secondaryBtn}>
          Entrar na sala
        </button>

        {error && (
          <p style={{ color: COLORS.red, marginTop: 14, marginBottom: 0, fontSize: 14 }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

const label: CSSProperties = {
  display: "block",
  marginBottom: 14,
  fontSize: 13,
  fontWeight: 600,
  color: COLORS.dim,
};
const input: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "11px 12px",
  fontSize: 15,
  color: COLORS.text,
  background: "#15152b",
  border: `1px solid ${COLORS.neutral}`,
  borderRadius: 10,
  outline: "none",
};
const baseBtn: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 700,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
};
const primaryBtn: CSSProperties = {
  ...baseBtn,
  color: "#1a1a2e",
  background: COLORS.gold,
};
const secondaryBtn: CSSProperties = {
  ...baseBtn,
  color: COLORS.text,
  background: COLORS.neutral,
};
const divider: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "20px 0",
};
const dividerLine: CSSProperties = {
  flex: 1,
  height: 1,
  background: "rgba(255,255,255,0.1)",
};
