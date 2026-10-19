/** Segmentos da barra de recursos: `true` = bloco cheio. Valor é limitado a 0..max e arredondado. */
export function segmentosDaBarra(valor: number, max: number): boolean[] {
  const total = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0;
  const cheios = Number.isFinite(valor) ? Math.min(total, Math.max(0, Math.floor(valor))) : 0;
  return Array.from({ length: total }, (_, i) => i < cheios);
}
