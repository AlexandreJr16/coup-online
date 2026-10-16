// Token de sessão por sala, guardado em sessionStorage (por ABA): sobrevive ao F5 e
// a quedas de rede, mas duas abas do mesmo navegador continuam sendo dois jogadores
// (importante para testar sozinho). É um segredo do jogador — nunca vai em URL/view.
// Sempre em try/catch: o storage pode estar bloqueado (aba anônima, política do site).

const key = (roomId: string) => `coup:session:${roomId}`;

export function readToken(roomId: string): string | undefined {
  try {
    return sessionStorage.getItem(key(roomId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveToken(roomId: string, token: string): void {
  try {
    sessionStorage.setItem(key(roomId), token);
  } catch {
    /* sem storage: o jogo funciona, só não reconecta sozinho após F5 */
  }
}

export function clearToken(roomId: string): void {
  try {
    sessionStorage.removeItem(key(roomId));
  } catch {
    /* idem */
  }
}

// Preferência do "passar automático" (por aba, como o token): só espelha o que o servidor guarda.
export function readAutoPass(): boolean {
  try {
    return sessionStorage.getItem("coup:autopass") === "1";
  } catch {
    return false;
  }
}

export function saveAutoPass(enabled: boolean): void {
  try {
    sessionStorage.setItem("coup:autopass", enabled ? "1" : "0");
  } catch {
    /* sem storage: a preferência vale só até recarregar */
  }
}

// Filtro CRT (scanlines): preferência do jogador, vale entre salas (localStorage).
export function readCrt(): boolean {
  try {
    return localStorage.getItem("coup:crt") === "1";
  } catch {
    return false;
  }
}

export function saveCrt(on: boolean): void {
  try {
    localStorage.setItem("coup:crt", on ? "1" : "0");
  } catch {
    /* sem storage: vale só nesta sessão */
  }
  window.dispatchEvent(new Event(CRT_EVENT)); // avisa quem assina (useSyncExternalStore)
}

export const CRT_EVENT = "coup:crt";

/** Para useSyncExternalStore: lê a preferência sem divergir do HTML do servidor na hidratação. */
export function subscribeCrt(onChange: () => void): () => void {
  window.addEventListener(CRT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CRT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
