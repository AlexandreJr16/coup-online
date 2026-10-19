// Revisão do kit de UI REAL (P04) com seletor ao vivo de fonte/estilo/dock (núcleo do P27).
// Diferente de /dev/v3/kit (mockup aprovado), aqui são os componentes de src/components/ui.
import type { Metadata } from "next";
import { RevisaoKit } from "./RevisaoKit";

export const metadata: Metadata = { title: "Kit de UI (revisão)" };

export default function KitPage() {
  return <RevisaoKit />;
}
