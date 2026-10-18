// Cabeçalho da sala em formato de HUD enxuto: logo à esquerda, código da sala, um miolo livre
// (a faixa de status da rodada entra aqui por portal) e, à direita, os botões do kit.
// A unidade `--u` é definida no CSS do HUD (2 px até 1599 px de largura, 3 px acima).
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import s from "./ui.module.css";

export function CodigoSala({ codigo }: { codigo: string }) {
  return (
    <span className={s.sala}>
      <span>SALA</span>
      <span className={s.salaCodigo} data-testid="sala-codigo">
        {codigo}
      </span>
    </span>
  );
}

export function Hud({ codigo, extra, centro, children }: { codigo: string; extra?: ReactNode; centro?: ReactNode; children: ReactNode }) {
  return (
    <header className={s.hud} data-testid="hud">
      <div className={s.hudEsq}>
        <Logo />
        <CodigoSala codigo={codigo} />
        {extra}
      </div>
      <div className={s.hudCentro}>{centro}</div>
      <div className={s.hudDir}>{children}</div>
    </header>
  );
}
