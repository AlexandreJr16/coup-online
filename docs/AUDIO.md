# Áudio — Coup Online

> Status: **rascunho para revisão**.

## SFX procedurais (Web Audio, sem arquivo, sem dependência)
| Evento | Som |
|---|---|
| Moeda | dois blips square subindo |
| Flip de carta | ruído filtrado curto |
| Selo / lacre | thump grave + ruído |
| Contestar | sting ascendente |
| Eliminação | queda de tom |
| Vitória | arpejo |
| Timer < 30% | tick acelerando |

## Voz estilo Undertale
Um blip sintetizado por personagem (forma de onda + altura), tocado enquanto o typewriter escreve na caixa de texto.

## Trilha (IA, instrumentação brasileira de época)
Gêneros: choro, lundu, modinha, polca. Instrumentos: viola, rabeca, flauta, pandeiro, zabumba.

| Faixa | Uso |
|---|---|
| Menu / Gabinete | lobby |
| Mesa | loop calmo durante o turno |
| Tensão | janela de reação |
| Vitória | fim de jogo |

Stretch: stems em camadas que entram conforme a tensão.

## Regras técnicas
- Áudio só desbloqueia no primeiro gesto do usuário (autoplay policy).
- Botão de mute e volume persistido em `localStorage`, sempre com `try/catch`.
- Loops sem corte audível.
- Os sons disparam pelo mesmo diff de views do `useGameEvents.ts`, num hook `useGameAudio`. Nenhuma mudança no servidor.
- Verificar a licença e os termos de uso do gerador de música antes de publicar.
