// Legenda de uma linha no centro da mesa (P08.S1): o que a mesa espera agora e o aviso dos 5s.
// O texto vem de centerCaption (função pura de status.ts, testada); aqui só a apresentação.
"use client";

import { PixelPanel } from "../ui/PixelPanel";
import { U } from "./escalaMesa";

export default function CenterCaption({ text, warning }: { text: string; warning: boolean }) {
  return (
    <div
      data-testid="center-caption"
      data-warning={warning ? "sim" : undefined}
      style={{
        position: "absolute",
        left: "50%",
        top: "36%",
        transform: "translate(-50%, -50%)",
        maxWidth: "46%",
        zIndex: 2,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: warning ? "#ff8f80" : undefined,
        fontSize: U(13),
      }}
    >
      <PixelPanel>{text}</PixelPanel>
    </div>
  );
}
