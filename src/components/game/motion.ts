// Utilitários de animação (Web Animations API, sem biblioteca). Tudo respeita
// `prefers-reduced-motion` e NUNCA bloqueia clique: as animações são só decoração em cima
// do estado real, que já mudou.

export const MAX_FLYING_COINS = 6;

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export interface Point {
  x: number;
  y: number;
}

export function centerOf(el: Element, rel?: Element): Point {
  const r = el.getBoundingClientRect();
  const o = rel?.getBoundingClientRect();
  return { x: r.left + r.width / 2 - (o?.left ?? 0), y: r.top + r.height / 2 - (o?.top ?? 0) };
}

// ── Plano dos voos de moeda ──────────────────────────────────────────────────
export interface CoinFlight {
  from: string; // "erario" ou id do jogador
  to: string;
  count: number;
}

/**
 * Converte as variações de moeda (por jogador) em voos. O Erário absorve a diferença
 * (as moedas são conservadas). Roubo (Extorquir): o Erário não muda e há um perdedor e um
 * ganhador, então o voo vai direto de um jogador ao outro.
 */
export function planCoinFlights(deltas: Record<string, number>): CoinFlight[] {
  const entries = Object.entries(deltas).filter(([, d]) => d !== 0);
  const pos = entries.filter(([, d]) => d > 0);
  const neg = entries.filter(([, d]) => d < 0);
  const cap = (n: number) => Math.min(MAX_FLYING_COINS, Math.abs(n));
  const net = entries.reduce((a, [, d]) => a + d, 0);

  if (net === 0 && pos.length === 1 && neg.length === 1) {
    return [{ from: neg[0][0], to: pos[0][0], count: cap(Math.min(pos[0][1], -neg[0][1])) }];
  }
  return [
    ...pos.map(([id, d]) => ({ from: "erario", to: id, count: cap(d) })),
    ...neg.map(([id, d]) => ({ from: id, to: "erario", count: cap(d) })),
  ];
}

// ── Voos concretos ───────────────────────────────────────────────────────────
/** Anima `el` saindo de `from` (em coordenadas da tela) até a posição em que já está. */
export function flyIn(el: HTMLElement, from: Point, opts: { delay?: number; duration?: number } = {}): void {
  if (reducedMotion() || !el.animate) return;
  const r = el.getBoundingClientRect();
  const dx = from.x - (r.left + r.width / 2);
  const dy = from.y - (r.top + r.height / 2);
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.55) rotate(-14deg)`, opacity: 0 },
      { opacity: 1, offset: 0.25 },
      { transform: "none", opacity: 1 },
    ],
    { duration: opts.duration ?? 480, delay: opts.delay ?? 0, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
  );
}

/** Solta `count` moedas que voam de `from` a `to` (coordenadas relativas à `layer`). */
export function spawnCoins(layer: HTMLElement, from: Point, to: Point, count: number, iconUrl: string | null): void {
  if (reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const coin = document.createElement(iconUrl ? "img" : "span");
    coin.setAttribute("data-coin-fly", "");
    if (coin instanceof HTMLImageElement && iconUrl) {
      coin.src = iconUrl;
      coin.alt = "";
      coin.draggable = false;
    } else {
      coin.textContent = "🪙";
    }
    Object.assign(coin.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "16px",
      height: "16px",
      fontSize: "14px",
      lineHeight: "16px",
      imageRendering: "pixelated",
      pointerEvents: "none",
      willChange: "transform",
    });
    layer.appendChild(coin);
    const jitter = (i - (count - 1) / 2) * 7;
    const mid = { x: (from.x + to.x) / 2 + jitter, y: Math.min(from.y, to.y) - 36 - (i % 2) * 10 };
    const at = (p: Point, s = 1) => `translate(${p.x - 8}px, ${p.y - 8}px) scale(${s})`;
    const anim = coin.animate(
      [
        { transform: at(from, 0.7), opacity: 0 },
        { transform: at(mid, 1.15), opacity: 1, offset: 0.45 },
        { transform: at({ x: to.x + jitter * 0.3, y: to.y }, 0.9), opacity: 0.9 },
      ],
      { duration: 620, delay: i * 70, easing: "cubic-bezier(0.3, 0.1, 0.3, 1)", fill: "both" },
    );
    anim.onfinish = () => coin.remove();
  }
}

// ── Inclinação 3D da carta (estilo Balatro) ─────────────────────────────────
/**
 * Graus de rotação X/Y para uma carta de w×h com o mouse em (x,y) dentro dela.
 * No centro = 0; nas bordas = ±max. O topo "afunda" (rotateX positivo) e a direita avança.
 */
export function tiltFromPointer(x: number, y: number, w: number, h: number, max = 9): { rx: number; ry: number } {
  const nx = Math.max(-1, Math.min(1, (x / w - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, (y / h - 0.5) * 2));
  return { rx: -ny * max, ry: nx * max };
}
