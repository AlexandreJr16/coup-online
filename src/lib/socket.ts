// Singleton do client Socket.IO no browser.
// Conecta ao mesmo host que serve a página (custom server na mesma porta).
"use client";

import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/src/types/socket";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | undefined;

export function getSocket(): AppSocket {
  if (!socket) {
    // URL vazia => mesma origin. autoConnect padrão (true).
    socket = io();
  }
  return socket;
}
