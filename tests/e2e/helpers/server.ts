// Sobe o servidor REAL (Next em modo produção + Socket.IO) numa porta livre, para os
// testes E2E. Exige `npm run build` antes (o script test:e2e já faz isso).
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { freePort } from "./browser";

export interface TestServer {
  url: string;
  stop(): void;
}

export async function startServer(): Promise<TestServer> {
  const root = process.cwd();
  if (!existsSync(join(root, ".next", "BUILD_ID"))) {
    throw new Error("sem build de produção: rode `npm run build` (ou `npm run test:e2e`)");
  }
  const port = await freePort();
  const proc: ChildProcess = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  proc.stdout?.on("data", (d) => (log += String(d)));
  proc.stderr?.on("data", (d) => (log += String(d)));
  const t0 = Date.now();
  while (!log.includes("Server pronto")) {
    if (proc.exitCode !== null) throw new Error(`o servidor caiu ao subir:\n${log}`);
    if (Date.now() - t0 > 40000) {
      proc.kill();
      throw new Error(`o servidor não subiu em 40s:\n${log}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { url: `http://localhost:${port}`, stop: () => void proc.kill() };
}
