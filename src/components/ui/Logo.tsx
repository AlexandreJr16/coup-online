// Logo "COUP IMPÉRIO": a imagem pixel de public/art/imperio/logo.png (P05). `largura` em px
// (padrão 130, a versão pequena); acima disso usa a grande. Arte pixel: renderização nítida.
import { dimensoesDaLogo } from "./logo";
import s from "./ui.module.css";

export function Logo({ largura }: { largura?: number }) {
  const { src, width, height } = dimensoesDaLogo(largura);
  return (
    <div className={s.logo} data-testid="logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={width} height={height} alt="Coup Império" draggable={false} className={s.logoImg} />
    </div>
  );
}
