# Relatório da noite (2026-10-15 → 16)

Branch **`noite/mesa-v2`** (worktree `../coup-online-noite`): 9 commits à frente da `main`,
**nada foi para a `main` nem para o GitHub**. Para revisar: `git log main..noite/mesa-v2`,
`git diff main...noite/mesa-v2`. Aprovou? `git merge noite/mesa-v2`. Não gostou? Descarte a branch.

## O que ficou pronto (todos com testes dos 3 níveis)
| Passo | O que é |
|---|---|
| **4.2 Selos de ação** | Botões viraram selos com ícone pixel art, estados pronto/blefe (máscara)/fora da vez/travado (cadeado)/obrigatório. 10 ícones; `contestar` e `assassinar` caem no emoji até a 2ª leva ser curada |
| **4.3 Jogada na mesa** | Carta virada no centro com lacre da ação e anel de tempo; Erário à esquerda e baralho (com contagem) à direita; halo de lampião no turno; **arrastar** o poder até o oponente ou para a mesa (clicar continua valendo) |
| **4.4 Animações de baralho** | Distribuição do baralho, moedas voando (roubo vai direto entre jogadores), carta revelada na contestação com tremor se foi blefe, cartas da Troca saindo do baralho. Web Animations API: **nenhuma biblioteca instalada** |
| **4.7 Rapidez** | Espaço passa, C contesta, B bloqueia; **passar automático** (servidor passa por você, exceto se é o alvo) |
| **4.8 Fim de partida** | Estatísticas na engine, 5 prêmios (Mentiroso do ano, Maior desconfiado, Olho de lince, Carrasco, Ricaço), tela de vitória com revanche |
| **4.9 Juice** | Tilt 3D da carta, foil nas cartas suas, contador que pula, filtro CRT opcional (botão 📺) |
| **Fase 5 Áudio** | Efeitos sintetizados (sem arquivo), trilha procedural em lá menor, botão 🔊/🔇, `/dev/audio` |

Números: **143 testes** (unidade + integração) e **40 cenários de navegador**, todos verdes.
O E2E pegou 5 bugs reais no caminho (cronômetro da revelação, erro de hidratação do CRT,
layout com 6 jogadores, `pointermove` em aba de fundo, teste acoplado ao emoji).

## O que NÃO fiz (precisa de você)
- **Áudio: eu não consigo ouvir.** Medi pico/RMS/duração de cada som (nenhum estoura nem é mudo), mas **o timbre é por sua conta**: abra `/dev/audio` e clique em "Tocar". Se algo estiver feio, diga qual.
- **4.5 Retratos de convidados** e **4.6 coerência do site** (veludo da mesa, menu/lobby): dependem de você escolher as imagens geradas.
- Fase 6 (caixa de texto e vozes) e música por IA.

## Imagens (lote da GPU, independente da sessão)
Pasta `~/ai-art/out/`, folhas de contato em **`~/ai-art/noite/folhas/`**, andamento em
`~/ai-art/noite/STATUS.md`. Ordem: avatares (16 tipos × 4), peças de UI, cenários, veludo,
novas tentativas da Benzedeira/Coronel/Regatão, poses de vitória. Uma 2ª leva (ícones
`contestar`, `assassinar`, `trocar`) começa sozinha quando a 1ª termina. Estimativa de fim: ~4h da manhã.
Os avatares já estão ótimos (folha `avatares_p1.png`).

## Como testar a branch
```bash
cd ../coup-online-noite && npm run dev -- (use outra porta: PORT=3100 npm run dev)
# páginas de revisão: /dev/selos /dev/mesa /dev/audio /dev/cartas
```
