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
