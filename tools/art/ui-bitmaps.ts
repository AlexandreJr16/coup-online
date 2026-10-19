// Dados da arte de UI procedural: legenda de cores (1 caractere = 1 cor da paleta mestra),
// bitmaps dos ícones (miolo 14x14, o contorno é automático), fonte bitmap do logo e
// geradores de formas (engrenagem, moeda, lente). Sem dependências e sem aleatoriedade.
// Os desenhos refinam os bitmaps aprovados nos mockups app/dev/v3/{kit,dock,vitoria,colinha}.

/** Caractere -> hex da paleta mestra (tools/art/palette.json). '.' = transparente. */
export const LEGENDA: Readonly<Record<string, string>> = {
  t: "#14101a", // tinta
  n: "#2b2236", // noite
  m: "#4a3d5c", // ameixa
  g: "#7c6f8a", // cinza-roxo
  p: "#bdb0a6", // pedra
  c: "#f6ecd6", // creme
  "1": "#3a2218",
  "2": "#4e2f20",
  "3": "#5e3a26",
  "4": "#734630",
  x: "#884028", // cobre escuro
  "5": "#8a5535",
  "6": "#a0643d",
  y: "#c0583a", // cobre claro
  u: "#b87a48", // couro
  e: "#cd9358", // areia
  k: "#dba26c", // pele
  h: "#efc89a", // pele clara
  V: "#5c1620", // vinho
  v: "#9a2a2a", // vermelho
  r: "#d0453a", // rubro
  o: "#f08a5d", // coral
  B: "#8a5a14", // bronze
  O: "#d9a028", // ouro
  Y: "#f7d56a", // ouro claro
  M: "#1f3a2a", // mata
  G: "#2f6b45", // verde
  f: "#6aa84f", // folha
  l: "#b5d86a", // limão
  N: "#1a2a4a", // marinho
  A: "#2f5d9a", // azul
  s: "#4aa3c7", // céu
  i: "#a8dce0", // gelo
  U: "#3b1f52", // uva
  R: "#7b3f8f", // roxo
  L: "#c58ad0", // lilás
  z: "#e8743b", // laranja
  w: "#fffaf0", // marfim
};

/** Lado do miolo dos ícones; o contorno de 1 px leva o bitmap final a 16x16. */
export const MIOLO = 14;

// ── Geradores de formas ─────────────────────────────────────────────────────
type Grade = string[][];

function grade(w: number, h: number): Grade {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
}
const linhas = (g: Grade): string[] => g.map((l) => l.join(""));

/** Engrenagem de 8 dentes em 14x14: corpo `p`, brilho `c` (alto-esquerda), sombra `g`. */
function engrenagem(): string[] {
  const g = grade(MIOLO, MIOLO);
  const c = (MIOLO - 1) / 2;
  for (let y = 0; y < MIOLO; y++) {
    for (let x = 0; x < MIOLO; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      const corpo = d <= 4.4;
      // dentes: setores centrados nos 8 eixos (cardeais e diagonais)
      const a = (Math.atan2(dy, dx) + Math.PI * 2 + Math.PI / 8) % (Math.PI / 4);
      const sobreEixo = Math.abs(a - Math.PI / 8) < 0.22;
      const naCoroa = d <= 6.9 && sobreEixo;
      if (d < 1.9) continue; // furo central
      if (!(corpo || naCoroa)) continue;
      const luz = dx + dy;
      g[y][x] = luz < -2.5 ? "c" : luz > 2.5 ? "g" : "p";
    }
  }
  return linhas(g);
}

/** Lente da lupa (anel `g`, vidro `i`, brilho `w`) e cabo diagonal em madeira. */
function lupa(): string[] {
  const g = grade(MIOLO, MIOLO);
  const cx = 4.5;
  const cy = 4.5;
  for (let y = 0; y < MIOLO; y++) {
    for (let x = 0; x < MIOLO; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 3.65) g[y][x] = "i";
      else if (d <= 4.75) g[y][x] = x + y > 9 ? "m" : "g";
    }
  }
  for (const [x, y] of [[2, 2], [3, 2], [2, 3]]) g[y][x] = "w";
  g[6][6] = "s";
  g[6][5] = "s";
  g[5][6] = "s";
  // cabo: diagonal de 2 px de largura, do canto da lente ao canto da imagem
  const cabo: Array<[number, number, string]> = [
    [8, 8, "6"], [9, 8, "5"], [8, 9, "6"], [9, 9, "5"], [10, 9, "4"], [9, 10, "4"],
    [10, 10, "6"], [11, 10, "5"], [10, 11, "6"], [11, 11, "5"], [12, 11, "4"], [11, 12, "4"],
    [12, 12, "O"], [13, 12, "O"], [12, 13, "O"], [13, 13, "B"],
  ];
  for (const [x, y, ch] of cabo) g[y][x] = ch;
  return linhas(g);
}

/** Moeda 12x12 de perfil frontal: aro em degradê e uma barra de relevo no meio. */
function moeda(): string[] {
  const n = 12;
  const g = grade(n, n);
  const c = (n - 1) / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      if (d > 5.7) continue;
      if (d > 4.4) g[y][x] = dx + dy < -1.5 ? "Y" : dx + dy > 1.5 ? "B" : "O";
      else g[y][x] = "O";
    }
  }
  for (let y = 3; y <= 8; y++) {
    g[y][5] = "B";
    g[y][6] = "B";
  }
  for (const [x, y] of [[3, 3], [3, 4], [4, 3]]) g[y][x] = "Y";
  return linhas(g);
}

/** Machado: cabo vertical em madeira e lâmina que alarga até o gume curvo (coluna clara). */
function machado(): string[] {
  const g = grade(MIOLO, MIOLO);
  for (let y = 0; y < MIOLO; y++) {
    g[y][4] = "6";
    g[y][5] = "5";
  }
  // meia-altura da lâmina em cada coluna (x = 6..13), centrada entre as linhas 4 e 5
  const meia = [1.4, 2.2, 3.0, 3.8, 4.4, 4.7, 4.7, 4.0];
  meia.forEach((m, i) => {
    const x = 6 + i;
    for (let y = 0; y < 10; y++) {
      const dy = y + 0.5 - 5;
      if (Math.abs(dy) > m) continue;
      const ultimaDaLinha = i === meia.length - 1 || Math.abs(dy) > meia[i + 1];
      g[y][x] = ultimaDaLinha ? "w" : dy < -m + 1.1 ? "c" : dy > m - 1.3 ? "g" : "p";
    }
  });
  // cabo termina em batente de ouro
  for (const x of [3, 4, 5, 6]) g[12][x] = "O";
  for (const x of [3, 4, 5, 6]) g[13][x] = x === 6 ? "B" : "O";
  return linhas(g);
}

/** Saco de moedas: nó vermelho, corpo areia e cifrão em marrom. */
function saco(): string[] {
  const cifrao = [
    "..#..",
    ".####",
    "#.#..",
    ".###.",
    "..#.#",
    "####.",
    "..#..",
  ];
  const larguras = [10, 12, 12, 12, 12, 12, 12];
  const corpo = cifrao.map((p, i) => {
    const meio = `ee${[...p].map((c) => (c === "#" ? "4" : "e")).join("")}eee`; // 10 colunas
    const cheio = `h${meio}u`; // 12 colunas
    const corte = (12 - larguras[i]) / 2;
    return `.${".".repeat(corte)}${cheio.slice(corte, 12 - corte)}${".".repeat(corte)}.`;
  });
  return [
    "....e.ee.e....",
    ".....eeee.....",
    ".....rrrr.....",
    "....rrvvrr....",
    "...eeeeeeee...",
    ...corpo,
    "...uuuuuuuu...",
  ];
}

// ── Ícones (miolo até 14x14; são centralizados e recebem contorno automático) ──
export interface IconeDef {
  rows: readonly string[];
  /** vizinhança do contorno: 4 (cantos arredondados, padrão) ou 8 (traços diagonais finos) */
  contorno?: 4 | 8;
}

export const ICONES: Readonly<Record<string, IconeDef>> = {
  // balão vermelho com exclamação (Contestar)
  contestar: {
    rows: [
      "..oooooooooo..",
      ".orrrrrrrrrrv.",
      "orrrrrwwrrrrrv",
      "orrrrrwwrrrrrv",
      "orrrrrwwrrrrrv",
      "orrrrrwwrrrrrv",
      "orrrrrrrrrrrrv",
      "orrrrrwwrrrrrv",
      "orrrrrwwrrrrrv",
      ".vrrrrrrrrrrv.",
      "..vvvvvvvvvv..",
      "....rrv.......",
      "....rv........",
      "....v.........",
    ],
  },
  // troféu dourado com alças e base
  trofeu: {
    rows: [
      "..YYYYYYYYYB..",
      "OOYwYYYYYYOBOO",
      "O.YwYYYYYYOB.O",
      "O.YwYYYYYOOB.O",
      ".OYwYYYYYOOBO.",
      "..YwYYYYYOOB..",
      "...YYYYYOOB...",
      "....YYYOOB....",
      ".....YOOB.....",
      "......OB......",
      "......OB......",
      ".....OOBB.....",
      "...6666666B...",
      "...3333333B...",
    ],
  },
  // olho do espectador
  olho: {
    rows: [
      "....wwwwww....",
      "..wwwAAAAwww..",
      ".wwwAwAAAAwww.",
      "wwwwAAttAAwwww",
      ".wwwAAttAAwww.",
      "..wwwAAAAwww..",
      "....pppppp....",
    ],
  },
  // ajuda: disco azul com interrogação
  ajuda: {
    rows: [
      "....ssAAAA....",
      "..sssAAAAAAA..",
      ".ssAAAAAAAAAA.",
      ".sAAAwwwwAAAAN",
      "sAAAwwAAwwAAAN",
      "sAAAAAAAwwAAAN",
      "sAAAAAAwwAAAAN",
      "AAAAAAwwAAAAAN",
      "AAAAAAwwAAAAAN",
      "AAAAAAAAAAAAAN",
      "AAAAAAwwAAAAAN",
      ".AAAAAwwAAAANN",
      ".NAAAAAAAAANN.",
      "..NNNNNNNNNN..",
    ],
  },
  // alto-falante com ondas
  som: {
    rows: [
      "....cp....Y.",
      "...ccp.Y...Y",
      "..cccp..Y..Y",
      "ccccpp..Y..Y",
      "ccccpp..Y..Y",
      "ccccpp..Y..Y",
      "ccccpp..Y..Y",
      "..cccp..Y..Y",
      "...ccp.Y...Y",
      "....cp....Y.",
    ],
  },
  // alto-falante cortado (X vermelho no lugar das ondas)
  mudo: {
    rows: [
      "....cp.......",
      "...ccp.......",
      "..cccp.rr..rr",
      "ccccpp..rrrr.",
      "ccccpp...rr..",
      "ccccpp...rr..",
      "ccccpp..rrrr.",
      "..cccp.rr..rr",
      "...ccp.......",
      "....cp.......",
    ],
  },
  // porta aberta com seta para fora
  sair: {
    rows: [
      "cccccc........",
      "cppppp........",
      "cp............",
      "cp.......Y....",
      "cp.......YY...",
      "cp.......YYY..",
      "cp..YYYYYYYYYY",
      "cp..OOOOOOOOOO",
      "cp.......OOO..",
      "cp.......OO...",
      "cp.......O....",
      "cp............",
      "cppppp........",
      "cccccc........",
    ],
  },
  engrenagem: { rows: engrenagem() },
  // monitor de tubo (efeito CRT) com linhas de varredura
  crt: {
    rows: [
      "cccccccccccccc",
      "cppppppppppppg",
      "cpGGGGGGGGGGpg",
      "cpMffMMMMMMMpg",
      "cpGfGGGGGGGGpg",
      "cpMMMMMMMMMMpg",
      "cpGGGGGGGGGGpg",
      "cpMMMMMMMMMMpg",
      "cpppppppppppgg",
      "....pppppp....",
      "..gggggggggg..",
    ],
  },
  // coroa com 3 pontas e gemas
  coroa: {
    rows: [
      "Y.....YY.....Y",
      "YY....YY....YY",
      "YYY..YYYY..YYY",
      "YYYY.YYYY.YYYY",
      "YYYYYYYYYYYYYO",
      "OOsOOOrrOOOsOO",
      "OOOOOOrrOOOOOO",
      "BBBBBBBBBBBBBB",
    ],
  },
  // marca de certo
  certo: {
    rows: [
      "..........ll",
      ".........lff",
      "........lffG",
      "ll.....lffG.",
      "lff...lffG..",
      ".lff.lffG...",
      "..lfffffG...",
      "...ffGGG....",
      "....fG......",
    ],
  },
  // marca de errado
  errado: {
    rows: [
      "oo........vv",
      "orr......rvv",
      ".orr....rrv.",
      "..orr..rrv..",
      "...orrrrv...",
      "....rrrv....",
      "....rrrv....",
      "...orrrrv...",
      "..orr..rrv..",
      ".orr....rrv.",
      "orr......rvv",
      "oo........vv",
    ],
    contorno: 8,
  },
  // ampulheta de espera
  ampulheta: {
    rows: [
      "666666666666",
      "555555555555",
      ".iiiiiiiiii.",
      "..iYYYYYYi..",
      "...iYYYYi...",
      "....iYYi....",
      ".....YY.....",
      ".....YY.....",
      "....iOOi....",
      "...iOOOOi...",
      "..iOOOOOOi..",
      ".iOOOOOOOOi.",
      "555555555555",
      "444444444444",
    ],
  },
  moeda: { rows: moeda() },
  // prêmios da noite ------------------------------------------------------
  // carrasco: machado
  carrasco: { rows: machado() },
  // ricaço: saco de moedas com cifrão
  ricaco: { rows: saco() },
  // mentiroso: máscara roxa com pena
  mentiroso: {
    rows: [
      "..........YY..",
      ".........rYY..",
      "........rrr...",
      "..LLRRRRRRr...",
      ".LRRRRYYRRRRR.",
      ".RRRttRRttRRR.",
      ".RRtttRRtttRR.",
      ".URRRRRRRRRRU.",
      "..URRRRRRRRU..",
      "...UURRRRUU...",
      ".....UUUU.....",
    ],
  },
  // desconfiado: lupa
  desconfiado: { rows: lupa() },
  // olho de lince: íris dourada com pupila em fenda e sobrancelha
  olho_de_lince: {
    rows: [
      ".3444444444433",
      "..............",
      "....wwwwww....",
      "..wwwYYYYwww..",
      ".wwwYOttOYwww.",
      "wwwwYOttOYwwww",
      ".wwwYOttOYwww.",
      "..wwwYYYYwww..",
      "....wwwwww....",
    ],
  },
};

/** Ordem estável de geração e de folha de contato. */
export const ORDEM_ICONES: readonly string[] = [
  "contestar", "trofeu", "olho", "ajuda", "som", "mudo", "sair", "engrenagem", "crt", "coroa",
  "certo", "errado", "ampulheta", "moeda", "carrasco", "ricaco", "mentiroso", "desconfiado", "olho_de_lince",
];

/** Coroa larga do logo (21x9, 5 pontas). */
export const COROA_LOGO: readonly string[] = [
  "..........Y..........",
  "Y........YYY........Y",
  "YY...Y...YYY...Y...YY",
  "YYY..YY.YYYYY.YY..YYY",
  "YYYY.YYYYYYYYYYY.YYYY",
  "YYYYYYYYYYYYYYYYYYYYO",
  "OOOsOOOOOrrrOOOOOsOOO",
  "OOOOOOOOOrrrOOOOOOOOO",
  "BBBBBBBBBBBBBBBBBBBBB",
];

// ── Fonte bitmap 5x7 do logo (2 px de haste) ────────────────────────────────
export const FONTE: Readonly<Record<string, readonly string[]>> = {
  C: [".###.", "##.##", "##...", "##...", "##...", "##.##", ".###."],
  O: [".###.", "##.##", "##.##", "##.##", "##.##", "##.##", ".###."],
  U: ["##.##", "##.##", "##.##", "##.##", "##.##", "##.##", ".###."],
  P: ["####.", "##.##", "##.##", "####.", "##...", "##...", "##..."],
  I: ["##", "##", "##", "##", "##", "##", "##"],
  M: ["##...##", "###.###", "#######", "##.#.##", "##...##", "##...##", "##...##"],
  E: ["#####", "##...", "##...", "####.", "##...", "##...", "#####"],
  R: ["####.", "##.##", "##.##", "####.", "##.##", "##.##", "##.##"],
  // E com acento agudo: a linha extra de cima só tem o acento
  "É": ["...##", "#####", "##...", "##...", "####.", "##...", "##...", "#####"],
};

/** Dígitos 3x5 para numerar a folha de contato. */
export const DIGITOS: Readonly<Record<string, readonly string[]>> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};
