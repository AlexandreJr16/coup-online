// Grupo DANO (VIDA_E_BLEFE 6.1): camadas sobre o retrato NEUTRO da moldura 64x92. Fundo
// transparente; tudo posicionado por proporção da moldura (o overlay tem exatamente 64x92).
// Estados: 1 influência = rachadura + curativo (+ hematoma opcional); 0 = estilhaços.
import { Tela, type Ponto } from "../canvas";
import type { Peca } from "../peca";
import { centro, mover, MOLDURA, poligonoPontilhado, trinca } from "./comum";

const { w: W, h: H } = MOLDURA;

// Trincas nos cantos (ramo principal + dois ramos curtos), coordenadas da moldura 64x92.
const CANTO_SE: readonly (readonly Ponto[])[] = [
  [[0, 0], [5, 5], [7, 11], [13, 15], [14, 23]],
  [[7, 11], [3, 19]],
  [[13, 15], [20, 14]],
];
const CANTO_ID: readonly (readonly Ponto[])[] = [
  [[63, 91], [58, 86], [56, 79], [49, 75], [48, 65]],
  [[56, 79], [61, 72]],
  [[49, 75], [43, 76]],
];
// Trincas extras: só no estado estilhaçado.
const EXTRAS: readonly (readonly Ponto[])[] = [
  [[63, 0], [57, 5], [53, 13], [45, 17], [42, 27]],
  [[53, 13], [60, 19]],
  [[0, 91], [6, 85], [9, 77], [16, 73], [18, 63]],
  [[9, 77], [3, 70]],
  [[32, 28], [27, 40], [33, 47], [28, 58], [32, 68]],
  [[33, 47], [41, 51]],
];
const TODAS = [...CANTO_SE, ...CANTO_ID, ...EXTRAS];

// Cacos: quatro nos cantos e dois no miolo.
const CACOS: readonly (readonly Ponto[])[] = [
  [[0, 0], [13, 0], [8, 6], [4, 12], [0, 11]],
  [[63, 0], [63, 14], [58, 9], [53, 3]],
  [[0, 91], [0, 79], [6, 84], [11, 91]],
  [[63, 91], [51, 91], [56, 85], [62, 81]],
  [[26, 17], [37, 21], [35, 30], [25, 28]],
  [[37, 56], [48, 54], [51, 64], [40, 68]],
];

function rachadura(): Tela {
  const t = new Tela(W, H);
  for (const ramo of [...CANTO_SE, ...CANTO_ID]) trinca(t, ramo, 2);
  // Lasquinhas escuras na ponta das trincas principais (a moldura "morde").
  t.poligono([[0, 0], [6, 0], [3, 4], [0, 6]], "tinta");
  t.poligono([[63, 91], [57, 91], [60, 87], [63, 85]], "tinta");
  return t;
}

/** Curativo: tira diagonal na testa, com almofada central e uma gota de sangue. */
function curativo(): Tela {
  const cx = 40;
  const cy = 25;
  const c = (l: number, m: number): Ponto => {
    const a = (-32 * Math.PI) / 180; // inclinação da tira
    return [Math.round(cx + Math.cos(a) * l - Math.sin(a) * m), Math.round(cy + Math.sin(a) * l + Math.cos(a) * m)];
  };
  const tira = new Tela(W, H);
  tira.poligono([c(-9, -3), c(9, -3), c(9, 3), c(-9, 3)], "peleClara");
  const t = new Tela(W, H);
  t.carimbar(tira.contorno("tinta"), -1, -1);
  // sombra: pixel claro cuja vizinha de baixo é a borda vira peleMedia (dá volume)
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      if (t.get(x, y) === 17 && t.get(x, y + 1) === 0) t.set(x, y, "peleMedia");
    }
  }
  // almofada central (losango pequeno) com gota de sangue
  const almofada = new Tela(W, H);
  almofada.poligono([c(-3, -2), c(3, -2), c(3, 2), c(-3, 2)], "creme");
  t.carimbar(almofada, 0, 0);
  t.set(cx, cy, "vermelho");
  return t;
}

function hematoma(): Tela {
  const t = new Tela(W, H);
  const cx = 22;
  const cy = 44;
  // Mancha: elipse sólida roxa com borda pontilhada (mistura com a pele) e realces.
  const borda = new Tela(W, H);
  borda.elipse(cx, cy, 7, 5, "roxo");
  const miolo = new Tela(W, H);
  miolo.elipse(cx, cy, 5, 3, "roxo");
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (miolo.get(x, y) !== null) t.set(x, y, "roxo");
      else if (borda.get(x, y) !== null && (x + y) % 2 === 0) t.set(x, y, "roxo");
    }
  }
  t.elipse(cx + 1, cy + 1, 3, 2, "uva");
  t.set(cx - 3, cy - 2, "lilas");
  t.set(cx - 2, cy - 2, "lilas");
  t.set(cx - 4, cy - 1, "lilas");
  return t;
}

function estilhacos(): Tela[] {
  // Quadro 1: o impacto. Trincas finas a partir dos cantos e do centro, com faíscas.
  const q1 = new Tela(W, H);
  for (const r of [CANTO_SE[0], CANTO_ID[0], EXTRAS[4]]) trinca(q1, r, 1);
  for (const [x, y] of [[14, 23], [48, 65], [32, 68], [32, 28]] as const) {
    q1.set(x, y, "branco");
    q1.set(x + 1, y, "ouroClaro");
    q1.set(x, y + 1, "ouroClaro");
  }
  // Quadro 2: a rede de trincas inteira.
  const q2 = new Tela(W, H);
  for (const r of TODAS) trinca(q2, r, 2);
  // Quadro 3: os cacos se soltam (deslocados para fora, com brilho de vidro nas arestas).
  const q3 = new Tela(W, H);
  for (const r of TODAS) trinca(q3, r, 2);
  for (const caco of CACOS) {
    const [px, py] = centro(caco);
    const dx = Math.sign(px - W / 2) * 2;
    const dy = Math.sign(py - H / 2) * 2;
    const p = mover(caco, dx, dy);
    poligonoPontilhado(q3, p, "tinta", 0.5);
    q3.polilinha([...p, p[0]], "creme", 1);
  }
  // Quadro 4: estado final (é o que fica na mesa): cacos escuros e trincas.
  const q4 = new Tela(W, H);
  for (const caco of CACOS) poligonoPontilhado(q4, caco, "tinta", 0.75);
  for (const r of TODAS) trinca(q4, r, 2);
  return [q1, q2, q3, q4];
}

export function gerarDano(): Peca[] {
  return [
    { grupo: "dano", nome: "rachadura", quadros: [rachadura()], uso: "1 influência: overlay 64x92 sobre o retrato (6.1). Persistente." },
    { grupo: "dano", nome: "curativo", quadros: [curativo()], uso: "1 influência: overlay 64x92, na testa (6.1). Pode 'pipocar' com scale." },
    { grupo: "dano", nome: "hematoma", quadros: [hematoma()], uso: "Opcional: overlay 64x92 na bochecha (6.1)." },
    { grupo: "dano", nome: "estilhacos", quadros: estilhacos(), uso: "0 influências / exílio (6.1, 8.2): 4 quadros em 300 ms; o último é o estado persistente." },
  ];
}
