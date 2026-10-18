import type { Metadata } from "next";
import { Cinzel, Geist, Geist_Mono, Pixelify_Sans, Press_Start_2P, Silkscreen, VT323 } from "next/font/google";
import { APARENCIA_PADRAO, SCRIPT_TEMA, atributosDoTema } from "@/src/lib/aparencia";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cinzel: capitulares romanas gravadas (corte renascentista / brasão / cunhagem).
// Usada só em título, marca e nomes de carta — o corpo segue em sans (Geist).
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

// Fontes pixel da interface (DEC-11): as 4 ficam disponíveis e o jogador escolhe em
// `data-fonte` (src/lib/aparencia.ts). Só a padrão (Pixelify Sans) tem preload; as outras
// só baixam quando escolhidas. latin-ext cobre os acentos pt-BR. As opções do next/font
// precisam ser literais (o Next as lê na compilação): sem spread nem constantes.
const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const pressStart = Press_Start_2P({
  variable: "--font-press",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Coup Online",
  description: "Jogo de blefe online para 2–6 jogadores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${pixelify.variable} ${silkscreen.variable} ${vt323.variable} ${pressStart.variable} h-full antialiased`}
      // O SSR sempre envia o tema padrão; o script abaixo troca os data-* pela preferência
      // salva antes da primeira pintura. Por isso o <html> (e só ele) difere do servidor.
      {...atributosDoTema(APARENCIA_PADRAO)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
