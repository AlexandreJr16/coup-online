/** Junta nomes de classe ignorando os falsos (para `cond && s.classe`). */
export function cx(...partes: Array<string | false | null | undefined>): string {
  return partes.filter(Boolean).join(" ");
}
