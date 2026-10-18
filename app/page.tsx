"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, Suspense, useState } from "react";

import { getSocket } from "@/src/lib/socket";
import type { CreateRoomAck } from "@/src/types/socket";
import { ALL_CHARACTERS, artUrl, COLORS } from "@/src/components/game/helpers";
import { CheatSheetButton } from "@/src/components/game/CheatSheet";
import { GithubLink } from "@/src/components/game/GithubLink";
import { SalonBg } from "@/src/components/game/TableBackdrop";
import { AparenciaButton } from "@/src/components/ui/AparenciaPanel";
import { Campo } from "@/src/components/ui/Campo";
import { Logo } from "@/src/components/ui/Logo";
import { PixelButton } from "@/src/components/ui/PixelButton";
import { fonteKit } from "@/src/components/ui/escala";
import { PixelPanel } from "@/src/components/ui/PixelPanel";

// Next 16 exige <Suspense> em volta de quem usa useSearchParams na página
// pré-renderizada ("/"); sem isso o `next build` (e o `npm start`) falha.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}

function Home() {
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
        // "safe center": se o conteúdo for maior que a tela (celular), alinha ao topo em vez
        // de cortar o início; o main rola (o fundo fica num wrapper fixo e não rola junto).
        justifyContent: "safe center",
        padding: "10px 24px",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        background: COLORS.bg,
      }}
    >
      <div aria-hidden style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <SalonBg />
      </div>
      <PixelPanel data-testid="home-panel" style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        {/* Os cinco personagens em leque, como numa mão de cartas */}
        <div data-testid="home-fan" style={{ display: "flex", justifyContent: "center", marginBottom: 10, height: 100 }}>
          {ALL_CHARACTERS.map((c, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c}
              src={artUrl(c, "neutro", "lg") ?? undefined}
              alt=""
              draggable={false}
              style={{
                width: 62,
                height: 88,
                marginLeft: i === 0 ? 0 : -6,
                border: "3px solid var(--k-tinta)",
                boxShadow: "3px 3px 0 var(--k-sombra)",
                imageRendering: "pixelated",
                objectFit: "cover",
                transform: `rotate(${(i - 2) * 6}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                zIndex: 5 - Math.abs(i - 2),
              }}
            />
          ))}
        </div>
        <h1 style={{ margin: 0, display: "flex", justifyContent: "center" }}>
          <Logo largura={260} />
        </h1>
        <p style={{ margin: "8px 0 16px", color: "var(--k-texto-fraco)", fontSize: fonteKit(5), textAlign: "center" }}>
          Blefe, dedução e traição — 2 a 6 jogadores.
        </p>

        <Campo
          rotulo="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Alex"
        />

        <PixelButton cheio onClick={handleCreate}>
          Criar sala
        </PixelButton>

        <div style={divider}>
          <span style={dividerLine} />
          <span style={{ color: "var(--k-texto-fraco)", fontSize: fonteKit(4) }}>ou entrar com código</span>
          <span style={dividerLine} />
        </div>

        <Campo
          rotulo="Código da sala"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ex: ABC23"
          style={{ letterSpacing: 3, textTransform: "uppercase" }}
        />

        <PixelButton cheio onClick={handleJoin}>
          Entrar na sala
        </PixelButton>

        {error && (
          <p role="alert" style={{ color: "var(--k-pg-face)", marginTop: 12, marginBottom: 0, fontSize: fonteKit(5) }}>
            {error}
          </p>
        )}
      </PixelPanel>
      {/* Acesso à Aparência ao lado do GitHub e da colinha: fora do painel, em fluxo normal
          (um botão solto no canto cobria o painel em celular). */}
      <div
        style={{
          position: "relative",
          marginTop: 6,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <GithubLink />
        <CheatSheetButton />
        <AparenciaButton />
      </div>
    </main>
  );
}

const divider: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "10px 0 14px",
};
const dividerLine: CSSProperties = {
  flex: 1,
  height: 3,
  background: "var(--k-filete)",
};
