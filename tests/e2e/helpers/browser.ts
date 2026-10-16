// Mini-driver de Chrome via DevTools Protocol (sem dependências: usa fetch/WebSocket
// nativos do Node). Serve aos testes E2E: abre abas, executa JS, CLICA com mouse real
// e acumula erros de console/exceções da página.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
}

class Cdp {
  private id = 0;
  private waiting = new Map<number, (m: CdpMessage) => void>();
  private listeners: Array<(m: CdpMessage) => void> = [];
  private constructor(private ws: WebSocket) {
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(String(e.data)) as CdpMessage;
      if (m.id !== undefined) this.waiting.get(m.id)?.(m);
      else for (const l of this.listeners) l(m);
    });
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise<void>((res, rej) => {
      ws.addEventListener("open", () => res());
      ws.addEventListener("error", () => rej(new Error("falha ao conectar no Chrome")));
    });
    return new Cdp(ws);
  }
  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, (m) => {
        this.waiting.delete(id);
        if (m.error) reject(new Error(`${method}: ${m.error.message}`));
        else resolve((m.result ?? {}) as T);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(cb: (m: CdpMessage) => void): void {
    this.listeners.push(cb);
  }
  close(): void {
    this.ws.close();
  }
}

export class Browser {
  private constructor(
    private proc: ChildProcess,
    private port: number,
    private dir: string,
  ) {}

  static async launch(): Promise<Browser> {
    const port = await freePort();
    const dir = mkdtempSync(join(tmpdir(), "coup-e2e-"));
    const proc = spawn(
      process.env.CHROME ?? "google-chrome-stable",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${dir}`,
        "--window-size=1280,800",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    for (let i = 0; i < 80; i++) {
      try {
        await fetch(`http://127.0.0.1:${port}/json/version`);
        return new Browser(proc, port, dir);
      } catch {
        await sleep(150);
      }
    }
    proc.kill();
    throw new Error("o Chrome não subiu (defina CHROME com o caminho do executável)");
  }

  /** Abre uma aba NOVA (sessionStorage próprio — cada aba é um jogador). */
  async open(
    url: string,
    size: { w: number; h: number } = { w: 1280, h: 720 },
    opts: { reducedMotion?: boolean } = {},
  ): Promise<Page> {
    const res = await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: "PUT" });
    const target = (await res.json()) as { webSocketDebuggerUrl: string };
    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    const page = new Page(cdp);
    await page.init(size);
    if (opts.reducedMotion) await page.emulateReducedMotion();
    await page.goto(url);
    return page;
  }

  async close(): Promise<void> {
    const exited = new Promise<void>((r) => this.proc.once("exit", () => r()));
    this.proc.kill();
    await Promise.race([exited, sleep(3000)]);
    // O Chrome ainda pode estar gravando o perfil por um instante: tenta de novo e ignora.
    try {
      rmSync(this.dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
    } catch {
      /* sobra de /tmp: sem consequência */
    }
  }
}

export class Page {
  /** console.error, exceções não tratadas e recursos que falharam. Os testes exigem vazio. */
  errors: string[] = [];

  constructor(private cdp: Cdp) {}

  async init(size: { w: number; h: number }): Promise<void> {
    this.cdp.on((m) => {
      if (m.method === "Runtime.exceptionThrown") {
        const d = (m.params as { exceptionDetails: { text: string; exception?: { description?: string } } })
          .exceptionDetails;
        this.errors.push(`exceção: ${d.exception?.description ?? d.text}`);
      } else if (m.method === "Runtime.consoleAPICalled") {
        const p = m.params as { type: string; args: Array<{ value?: unknown; description?: string }> };
        if (p.type === "error") {
          this.errors.push(`console.error: ${p.args.map((a) => String(a.value ?? a.description)).join(" ").slice(0, 400)}`);
        }
      } else if (m.method === "Log.entryAdded") {
        const e = (m.params as { entry: { level: string; text: string; url?: string } }).entry;
        if (e.level === "error") this.errors.push(`log: ${e.text} ${e.url ?? ""}`);
      }
    });
    await this.cdp.send("Runtime.enable");
    await this.cdp.send("Log.enable");
    await this.cdp.send("Page.enable");
    await this.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: size.w,
      height: size.h,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  /** Liga prefers-reduced-motion: reduce (as animações decorativas devem sumir). */
  async emulateReducedMotion(): Promise<void> {
    await this.cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  }

  async goto(url: string): Promise<void> {
    await this.cdp.send("Page.navigate", { url });
  }

  async reload(): Promise<void> {
    await this.cdp.send("Page.reload", { ignoreCache: true });
  }

  async eval<T>(expression: string): Promise<T> {
    const r = await this.cdp.send<{ result: { value?: T }; exceptionDetails?: { text: string } }>(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
    );
    if (r.exceptionDetails) throw new Error(`eval falhou: ${r.exceptionDetails.text} em ${expression.slice(0, 120)}`);
    return r.result.value as T;
  }

  /** Espera a expressão JS ficar verdadeira (ou estoura com uma mensagem útil). */
  async waitFor(expression: string, what: string, ms = 8000): Promise<void> {
    const t0 = Date.now();
    for (;;) {
      try {
        if (await this.eval<boolean>(`Boolean(${expression})`)) return;
      } catch {
        /* a página pode estar navegando */
      }
      if (Date.now() - t0 > ms) {
        const txt = await this.text().catch(() => "?");
        throw new Error(`timeout esperando: ${what}\nerros: ${this.errors.join(" | ") || "nenhum"}\ntexto: ${txt.slice(0, 500)}`);
      }
      await sleep(60);
    }
  }

  text(): Promise<string> {
    return this.eval<string>("document.body.innerText");
  }

  /** Espera um trecho de texto aparecer na página. */
  waitText(trecho: string, ms?: number): Promise<void> {
    return this.waitFor(`document.body.innerText.includes(${JSON.stringify(trecho)})`, `texto "${trecho}"`, ms);
  }

  /**
   * Clique com MOUSE REAL no centro do elemento. Falha se o elemento não existe, está
   * desabilitado ou se OUTRO elemento está por cima (sobreposição que bloqueia o clique).
   */
  async click(selector: string, text?: string): Promise<void> {
    await this.waitFor(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].some(e => !${JSON.stringify(text ?? "")} || e.innerText.includes(${JSON.stringify(text ?? "")}))`,
      `elemento ${selector}${text ? ` com "${text}"` : ""}`,
    );
    const pt = await this.eval<{ x: number; y: number; hit: boolean; top: string; disabled: boolean }>(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = els.find(e => !${JSON.stringify(text ?? "")} || e.innerText.includes(${JSON.stringify(text ?? "")}));
      el.scrollIntoView({ block: "center", inline: "center" });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return { x, y, hit: !!top && (top === el || el.contains(top)), top: top ? top.tagName + "." + String(top.className).slice(0, 40) : "nada", disabled: el.disabled === true };
    })()`);
    if (pt.disabled) throw new Error(`clique em elemento desabilitado: ${selector} ${text ?? ""}`);
    if (!pt.hit) throw new Error(`clique BLOQUEADO em ${selector} ${text ?? ""}: há ${pt.top} por cima`);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await this.cdp.send("Input.dispatchMouseEvent", {
        type,
        x: pt.x,
        y: pt.y,
        button: type === "mouseMoved" ? "none" : "left",
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    }
  }

  /** Arrasta com o mouse: pressiona no centro de `from`, move em passos e solta no centro de `to`. */
  async drag(from: string, to: string): Promise<void> {
    // Eventos contínuos (pointermove) só são entregues a cada quadro renderizado: numa aba
    // em segundo plano cada um leva segundos (o arrasto estourava o turno). Traz para a frente.
    await this.cdp.send("Page.bringToFront");
    const center = (sel: string) =>
      this.eval<{ x: number; y: number } | null>(`(() => {
        const el = document.querySelector(${JSON.stringify(sel)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
    await this.waitFor(`document.querySelector(${JSON.stringify(from)}) && document.querySelector(${JSON.stringify(to)})`, `arrastar ${from} → ${to}`);
    const a = (await center(from))!;
    const b = (await center(to))!;
    const mouse = (type: string, x: number, y: number) =>
      this.cdp.send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: type === "mouseMoved" ? 0 : 1 });
    await mouse("mouseMoved", a.x, a.y);
    await mouse("mousePressed", a.x, a.y);
    for (let i = 1; i <= 12; i++) {
      await mouse("mouseMoved", a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
      await sleep(16);
    }
    await mouse("mouseReleased", b.x, b.y);
  }

  /** Clique de mouse real numa coordenada da viewport (ex.: fora de um painel). */
  async clickAt(x: number, y: number): Promise<void> {
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await this.cdp.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" ? "none" : "left",
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    }
  }

  /** Move o mouse (sem clicar) para a posição relativa (fx, fy ∈ [0,1]) do elemento. */
  async mouseTo(selector: string, fx = 0.5, fy = 0.5): Promise<void> {
    await this.cdp.send("Page.bringToFront"); // pointermove só chega a aba visível
    const p = await this.eval<{ x: number; y: number }>(`(() => {
      const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: r.left + r.width * ${fx}, y: r.top + r.height * ${fy} };
    })()`);
    await this.cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y, button: "none" });
  }

  /** Tecla de verdade (keyDown+keyUp). Aceita "Escape", " " (Espaço), "?" ou uma letra. */
  async key(key: string): Promise<void> {
    const special: Record<string, { code: string; vk: number; text?: string }> = {
      Escape: { code: "Escape", vk: 27 },
      " ": { code: "Space", vk: 32, text: " " },
      "?": { code: "Slash", vk: 191, text: "?" },
    };
    const sp = special[key];
    const base = {
      key,
      code: sp?.code ?? `Key${key.toUpperCase()}`,
      windowsVirtualKeyCode: sp?.vk ?? key.toUpperCase().charCodeAt(0),
    };
    const text = sp ? sp.text : key;
    await this.cdp.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", ...base, ...(text ? { text } : {}) });
    await this.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  }

  async screenshot(): Promise<Buffer> {
    const r = await this.cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
    return Buffer.from(r.data, "base64");
  }

  close(): void {
    this.cdp.close();
  }
}
