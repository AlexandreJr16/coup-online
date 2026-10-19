# tools/art/fx — gerador procedural de FX (P20)

Peças pequenas de efeito (VIDA_E_BLEFE seção 13), desenhadas **em código**, em pixels inteiros e só com
a paleta mestra (`tools/art/palette.json`). Determinístico: seeds fixas, dois runs geram os mesmos bytes.

```bash
npx tsx tools/art/fx.ts                 # todos os grupos -> public/art/imperio/fx/
npx tsx tools/art/fx.ts dano            # só um grupo
npx tsx tools/art/fx.ts todos --out /tmp/fx --folha /tmp/contato.png --zoom 3   # fora do repo + folha de contato
npx tsx tools/art/fx.ts --lista         # grupos registrados
node --import tsx --test tools/art/fx/*.test.ts
```

Saída: `public/art/imperio/fx/<grupo>/<nome>/<quadro>.png` (quadros de 1 a N) e `<quadro>.sm.png` quando há
versão pequena. Fundo transparente, alfa só 0 ou 255.

## Arquivos
- `paleta.ts` carrega a paleta e dá apelidos (`ouro`, `lacre`, `prata`, `areia`, `cinza`...). Cor = apelido, hex da paleta ou índice.
- `canvas.ts` classe `Tela` (guarda índices da paleta). `set`/`get` estritos (inteiro e dentro da tela); primitivas (linha, retângulo, elipse, polígono, carimbar, espelhar, deslocar, ampliar, contorno) exigem inteiros e recortam o que sai.
- `fonte.ts` micro-fonte 5x7 (A-Z, 0-9, `! ? $ - _ . : / +`, acentos Á Ã Â É Ê Í Ó Ô Õ Ú Ç). Acento ocupa 2 linhas acima do glifo; cedilha, 2 abaixo.
- `sheet.ts` `tira()` (quadros lado a lado) e `folhaDeContato()`.
- `peca.ts` contrato `Peca` e nomes de arquivo. `gerar.ts` registro dos grupos e gravação. `lerpng.ts` leitor de PNG (usado para fatiar o ícone da máscara).
- `grupos/<grupo>.ts` um arquivo por grupo, exportando `gerarX(): Peca[]`.

## Como acrescentar um grupo
1. `grupos/<nome>.ts` com `export function gerarX(): Peca[]` (kebab-case sem acento no `nome`).
2. Registrar em `GRUPOS` (`gerar.ts`).
3. Acrescentar as peças e dimensões na tabela `ESPERADO` de `fx.test.ts` e ajustar a contagem por grupo.

## Feito (S1 + S2)
| Grupo | Peça | Quadros | Tamanho | .sm |
|---|---|---|---|---|
| dano | rachadura | 1 | 64x92 | não |
| dano | curativo | 1 | 64x92 | não |
| dano | hematoma (opcional) | 1 | 64x92 | não |
| dano | estilhacos | 4 | 64x92 | não |
| carta | rachadura | 3 | 88x124 | 40x56 |
| carta | mascara-estilhacando | 4 | 88x80 | 44x40 |
| carta | carimbo-verdade / -blefe / -exilado | 1 | 96x28, 84x28, 96x28 | 49x15, 43x15, 49x15 |
| duelo | faixa-vs | 2 | 104x44 | não |
| duelo | gota-suor | 3 | 11x24 | não |
| duelo | mao-apontando | 2 | 44x22 | não |

Camadas de dano são overlays do retrato neutro: posicionar em `left:0; top:0` sobre a arte 64x92 (a borda de 3 px é do CSS e fica fora do overlay).
A gota de suor se posiciona por proporção (~69% x, ~22% y da moldura). A máscara e os carimbos se centralizam na carta (a máscara tem tela maior que o ícone para os cacos voarem).
Os carimbos são mais largos que a arte da carta (88 / 40) de propósito (carimbo de borracha que passa da borda); reduzir no CSS se não agradar.
`mascara-estilhacando` fatia `public/art/imperio/icones/mascara.png` (e `.sm.png`): se o ícone mudar, regenerar.

## A fazer (depois da curadoria do Alexandre; nada disso foi gerado)
| Grupo | Peças (quadros) | Seção |
|---|---|---|
| carta | carimbo CONTESTADO (1; redesenhar o de `WaxSeal` no kit) | 7.3 |
| bloqueio | escudo descendo (3) | 7.7 |
| tempo | ampulheta (4), medalhão da vez (1) | 7.2, 6.4 |
| ameaca | canhãozinho (1), alvo vermelho (2) (reaproveitar os desenhos aprovados de `app/dev/v3/mesa/bitmaps.ts`) | 6.3 |
| acao | navalha (3), gota vermelha (1), canhão (4), projétil (2), impacto (3), mão que puxa (3), saquinho (3) | 9 |
| exilio | fundo do cais (1), mar (4), barco a vapor (4), jangada (4), canoa (4), fumaça (4) | 8.2 |
| coroa | coroa (1) | 8.3 |
| plateia | 3 silhuetas x 2 quadros | 6.6 |
| emotes | suor, calma, "?", sorriso suspeito, "!", raiva, "$", "zZz" (2 quadros cada) | 6.5, 7.9 |
| particulas | estrela, faísca, poeira, confete, fagulha (1 a 2) | geral |
| baralho | cheio, médio, pouco, última (1 cada) | Fase B |
| fichas | 36 (Fase B3; hoje placeholders em `app/dev/v3/mesa/fichas.ts`) | B3 |
| retrato | G10 (rostos que reagem), só se o teste de expressões passar (P20.S7) | H8 |

Não gerado ainda e sem registro em `tools/art/README.md` (arquivo de outro agente): registrar o método "FX procedural" lá quando a edição for liberada.

## Fichas (P07.S1): `tools/art/fichas.ts`
Gerador à parte do `fx.ts` (a saída tem outra estrutura de pastas), mas na mesma infra: `Tela`, apelidos da paleta
mestra, `mulberry32` e a micro-fonte da folha de contato. Pixels inteiros, alfa só 0 ou 255, contorno de 1 px.

```bash
npx tsx tools/art/fichas.ts                                  # grava public/art/imperio/fichas/**
npx tsx tools/art/fichas.ts --out /tmp/f --folha /tmp/contato-fichas.png --zoom 4   # fora do repo + folha de contato
node --import tsx --test tools/art/fichas.test.ts src/components/game/fichas.test.ts
```

| Arquivo | Qtd | Tamanho | Conteúdo |
|---|---|---|---|
| `fichas/<n>/<a\|b\|c>.png` (n = 1..10) | 30 | 32x26 | a arrumada (colunas retas de até 5), b torta (colunas inclinadas + uma deitada), c espalhada (deitadas e em pé) |
| `fichas/monte/<11-15\|16-25\|26+>/<a\|b>.png` | 6 | cresce com a faixa | montes do Erário (colunas de alturas diferentes + fichas caídas) |
| `fichas/bau/<vazio\|11-15\|16-25\|26+>.png` | 4 | 30x26 | baú que enche (0 a 10 = vazio) |

Não há `.sm.png`: os sprites já são pequenos; o CSS amplia por fator inteiro. 0 fichas não tem sprite.
Quem escolhe o arquivo é `chipSprite(count, playerId)` em `src/components/game/fichas.ts` (hash FNV-1a de
jogador e quantidade; mesmo par, mesma pilha). O teste `fichas.test.ts` confere que o que está versionado em
`public/` é igual ao que o gerador produz: mexeu no desenho, rode o comando e commite os PNGs.
Para retocar à mão, edite as peças (`LADO`, `DEITADA_*`, `DE_FRENTE`), as `SLOTS_C` (variante c) ou as
alturas em `MONTES`, e regenere; a folha de contato mostra 1..10 x A/B/C, os montes e o baú sobre o verde da mesa.
