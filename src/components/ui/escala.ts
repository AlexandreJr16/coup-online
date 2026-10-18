// Tamanho de texto na escala do kit: `n` unidades `--u` vezes o fator `--fe` da fonte escolhida
// (compensa a altura de x de cada fonte pixel). Telas que usam estilos inline devem usar isto
// em vez de px fixos, para o texto acompanhar a fonte e a escala do tema.
export function fonteKit(n: number): string {
  return `calc(var(--u) * ${n} * var(--fe))`;
}
