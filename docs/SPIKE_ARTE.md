# Spike de arte (Fase 2) — relatório

Data: 2026-10-15. Pergunta: dá para gerar a arte do jogo na máquina do Alexandre (RX 6600, 8 GB, Arch, sem ROCm) com qualidade aceitável?

**Resposta: sim.** stable-diffusion.cpp com backend Vulkan + SDXL base + LoRA `pixel-art-xl`.

## Ambiente que funcionou
| Item | Valor |
|---|---|
| GPU | AMD Radeon RX 6600 LE (RADV Navi 23), ~8,5 GB VRAM, via Vulkan (`vulkan-radeon`/mesa), **sem ROCm** |
| Gerador | [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp), `-DSD_VULKAN=ON` |
| Modelo | `sd_xl_base_1.0.safetensors` + VAE `sdxl.vae.safetensors` (fp16-fix) |
| LoRA | `nerijs/pixel-art-xl` (peso 1.0, sem trigger word) |
| Local | `~/ai-art/` (fora do repo; modelos ocupam ~11 GB) |

Setup reproduzível em `tools/art/README.md`. Único tropeço: faltou o pacote `spirv-headers` (o `pacman` pede sudo); resolvido instalando os headers do Khronos num prefixo local.

## Medidas
| Teste | Tempo | VRAM |
|---|---|---|
| SD 1.5, 512×512, 20 passos | **13 s** | ~2,8 GB |
| SDXL + LoRA, 704×1024, 28 passos | **75–84 s** | ~4,9 GB (text encoder vai para a RAM sozinho) |

Uma carta com 4 expressões leva ~5,5 min. Curar 4 seeds por expressão leva ~20 min por personagem.

## Resultados
**O que funcionou bem**
- Qualidade: pixel art limpo, paleta quente, clima Stardew. Muito acima do esperado para uma 6600.
- **Consistência de identidade:** mesma seed + mesmo prompt-base mantém o mesmo personagem (rosto, chapéu, lenço, camisa) nas 4 expressões.
- O LoRA gera numa **grade de blocos de 8 px** (704/8 = 88 colunas). Reduzir por bloco inteiro (`--grid 8`) preserva os pixels originais e dá arte nítida em escala 1:1.
- Integração: `Card.tsx` mostra o retrato e **cai no emoji** se faltar arquivo ou der erro de carga. Estados blefe/perdida reaproveitam expressão + filtro cinza.

**O que não funcionou / limites**
- **Expressões ficam sutis.** Com seed fixa, a composição trava; palavras de expressão (mesmo com peso `(x:1.4)`) mudam pouco. A 88 px o rosto tem ~14 px de largura. Neutro e eliminado ficam bons; blefe e atingido diferem pouco do neutro.
- **O modelo ignora "fundo magenta"** e devolve branco liso. Sem problema: o pós-processo detecta o fundo sozinho. O prompt agora pede fundo branco.
- **Fidelidade de prompt:** v1 virou "colar de ouro" onde pedi lenço; corrigido com negativo (`necklace, beads…`) e descrição explícita.
- Pele alaranjada em blefe/atingido vem da própria imagem gerada (iluminação), não do pós-processo.
- Bolsões de fundo entre braço e tronco (não conectados à borda) ficam brancos. Pequeno; tratar na curadoria ou com prompt.
- Lanczos + quantização produziu manchas; o modo `--grid` evitou isso.

## Decisões
| Tema | Decisão | Motivo |
|---|---|---|
| Gerador | stable-diffusion.cpp (Vulkan) + SDXL + pixel-art-xl | Funciona local, sem ROCm, qualidade alta |
| Retrato | **88×124 nativo** (704×1024 → grade 8 → 88×128, corta 4 linhas) | 44×62 deixou o rosto ilegível. 88×124 = tamanho da carta `lg` em 1:1 |
| Miniatura | **40×56** (`.sm.png`), derivada | Mesa usa carta `sm`; arquivo próprio mantém pixels inteiros |
| Paleta | **v1, 36 cores** (+4 marrons/peles médios) | A v0 empurrava a pele para laranja/vermelho |
| Quantização | CIELAB (não RGB nem redmean) | Escolhe cores por percepção |
| Composição | **Busto** (cabeça, ombros, peito) | Corpo inteiro não cabe em 88×124 |
| "Eliminado" | Reusar o filtro cinza que o jogo já aplica a cartas perdidas | Menos arte por personagem |

## Para a Fase 3 (arte das 5 cartas)
1. **Curar por seeds:** `generate.ts --seeds 4` por expressão e escolher a melhor à mão. É assim que se compensa a sutileza das expressões.
2. Se ainda ficar fraco: *img2img* a partir do neutro com `strength` ~0.5, ou *inpaint* só do rosto (o sd.cpp suporta ambos).
3. Variar o ângulo/pose entre cartas (ginga do Capoeira, mãos) para ficar mais caracterizado. O busto atual é correto mas "genérico".
4. Fundo da carta por personagem (hoje a cor sólida do catálogo aparece atrás da transparência).
5. Padronizar prompts dos outros 4 personagens a partir de `tools/art/prompts/capoeira.json`.

## Licenças (revisar antes de publicar)
SDXL base 1.0 (OpenRAIL++), pixel-art-xl e SD 1.5 (CreativeML OpenRAIL-M). Licenças da família OpenRAIL permitem uso, mas com restrições de uso. Ler os termos antes de distribuir o jogo; este relatório não é parecer jurídico.

## Arquivos entregues
- `tools/art/generate.ts` (gera expressões a partir do prompt JSON), `tools/art/postprocess.ts` (fundo → grade → paleta → PNG), `tools/art/palette.json`, `tools/art/prompts/capoeira.json`
- `public/art/imperio/assassino/{neutro,blefe,atingido,eliminado}[.sm].png`
- `app/dev/cartas/page.tsx`: galeria de revisão em `/dev/cartas`
- `Card.tsx`, `helpers.ts` (`ART_THEME`, `artUrl`), `cards.ts` (`arte`, nome "Capoeira")

## Addendum — Fase 3 (arte das 5 cartas)
- **6 seeds por personagem** deram variedade e qualidade suficientes para escolher a melhor de cada: Barão (1852), Capoeira (1850), Coronel (1856), Regatão (1853), Benzedeira (1859). Verso 1863 e cenário 1872.
- **img2img não resolve expressão**: strength 0.55 e 0.75 mantêm a identidade e mexem pouco no rosto. Decisão: 1 retrato por personagem + efeitos (Fase 4).
- **Bugs do pipeline encontrados e corrigidos:** média dos cantos como cor de fundo (falhava em bustos); preenchimento semeado na borda inferior apagava roupa branca; paleta sem cobres deixava a pele vermelha.
- **O prompt nem sempre é obedecido:** pedi benzedeira *idosa*; vieram quase só jovens de turbante (lê como baiana). Escolhi a mais fiel (arruda nas mãos, lenço simples). O Coronel veio com várias caps do século XX e uma com bandeira dos EUA (descartada).
- **Cenário a 168×96 ampliado ~8× vira mosaico**; solução: suavizar e desfocar atrás da mesa.
