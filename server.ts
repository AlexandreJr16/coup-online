// Custom server: HTTP + Next.js request handler + Socket.IO no mesmo servidor.
// Doc base: node_modules/next/dist/docs/01-app/02-guides/custom-server.md
// Rodado via `tsx` (ver scripts no package.json). Não passa pelo compiler do Next.
// A lógica de jogo/salas/timers vive em src/server/socket.ts (testada em integração).

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

import { attachGameSocket, type GameIO } from "./src/server/socket";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io: GameIO = new Server(httpServer);
  attachGameSocket(io);

  httpServer.listen(port, () => {
    console.log(
      `> Server pronto em http://localhost:${port} (${dev ? "dev" : process.env.NODE_ENV})`,
    );
  });
});
