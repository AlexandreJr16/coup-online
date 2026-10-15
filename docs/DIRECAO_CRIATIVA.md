# Direção Criativa — Coup Online (Brasil Império)

> Status: **rascunho para revisão**. Os 5 personagens são propostas a refinar uma a uma.

## Objetivo
Sair do "funcional" para um jogo com cara de pronto: visual com **juice** estilo Balatro, **pixel art + voz por personagem** estilo Undertale e **clima aconchegante** estilo Stardew, ambientado no **Brasil Império (1822–1889)**. Jogabilidade fluida acima de tudo.

## Universo
Corte e interior do Império: lampiões a gás, fazendas de café, Guarda Nacional, cortiços do Rio, rios amazônicos.

| Original | No jogo |
|---|---|
| Moedas | mil-réis / réis |
| Tesouro | Erário Imperial |
| Lobby | Gabinete |
| Selo de cera | Lacre imperial (já existe) |

Referências visuais de domínio público: Debret, Rugendas, litografias e rótulos de café da época, azulejaria. Xilogravura de cordel como ornamento de UI.

## Mistura de estilos
| Fonte | O que pegamos |
|---|---|
| Balatro | Tilt 3D no hover, brilho foil/holo, screen shake, hit-stop curto, números que "pulam", fundo em redemoinho, CRT/scanlines leve |
| Undertale | Pixel art em poucas cores, caixa de diálogo com typewriter, blip de voz por personagem, 3–4 expressões por carta (neutro, blefe, atingido, eliminado) |
| Stardew | Paleta quente e saturada-suave, cenário aconchegante, ciclo de luz (tarde → noite conforme a partida avança) |

**Regra de ouro:** efeito nunca bloqueia input nem atrasa a percepção do turno. Efeitos de gameplay ≤ ~400 ms, todos não-bloqueantes, respeitando `prefers-reduced-motion`.

## Personagens (proposta)
Os **ids internos** (`duque`, `assassino`, `capitao`, `embaixador`, `condessa`) ficam como estão, para não tocar engine nem testes. Muda só `nome`/`cor`/`icone`/arte em `src/lib/game/cards.ts`.

| Papel | Proposta | Por quê | Alternativa |
|---|---|---|---|
| Duque (Taxas +3, bloqueia Ajuda Externa) | **Barão do Café** | Poder econômico do Vale do Paraíba | Visconde |
| Assassino (Assassinar) | **Capoeira** (navalha, gangue de rua carioca, contratado por políticos) | Figura real do Rio imperial, visual forte | Capanga |
| Capitão (Extorquir, bloqueia extorsão) | **Coronel da Guarda Nacional** | Patente comprada, poder local, achaque | Tropeiro |
| Embaixador (Trocar, bloqueia extorsão) | **Regatão** (comerciante fluvial) | Escambo; aceno à Manaus | Mascate |
| Condessa (bloqueia assassinato) | **Benzedeira** ("corpo fechado") | Proteção contra dano, folclore brasileiro | Frei capuchinho |

Cuidado: **evitar "capitão-do-mato"** como personagem (violência da escravidão). Se a escravidão aparecer no universo, tratar com seriedade, não como figura "legal".

### Ficha a preencher por personagem
- Paleta de 4–5 cores (derivada da paleta mestra)
- Silhueta e props
- 4 expressões: neutro, blefe, atingido, eliminado
- Voz: forma de onda + altura do blip
- Instrumento-tema
- Bordão curto para a caixa de texto

## Pipeline de arte (IA + pós-processo)
1. **Prompt-base versionado** por personagem (JSON em `tools/art/prompts/`): bloco de estilo fixo + bloco do personagem + expressão.
2. **Consistência:** mesmo seed/LoRA ou imagem de referência por personagem. Gerar em lote e curar à mão.
3. **Pós-processo em script** (`tools/art/`): remover fundo → reduzir por blocos inteiros (`--grid 8`) → quantizar (CIELAB) para a **paleta mestra** (36 cores) → PNG → `public/art/<tema>/`. Retrato 88×124 e miniatura 40×56, renderizados com `image-rendering: pixelated` em escala 1:1. Composição em **busto**.
4. **Curadoria humana obrigatória**: cada retrato é aprovado antes de entrar. Retoque no Aseprite se precisar.
5. **Fallback:** sem imagem, `Card.tsx` continua com emoji. Migração gradual, nada quebra.

Pendente (spike da Fase 2): gerador local (ComfyUI com SDXL/Flux + LoRA de pixel art, depende da GPU) ou API paga. Verificar licença e termos de uso comercial do modelo escolhido.

## Pontos em aberto
- ~~Coronel vs Tropeiro~~ → **Coronel** (decidido: já aponta pro coronelismo). Faltam fechar os outros 4.
- GPU/orçamento → gerador de imagem e de música.
- ~~Resolução e paleta~~ → decididos no spike da Fase 2 (retrato 88×124, miniatura 40×56, paleta de 36 cores). Ver `docs/SPIKE_ARTE.md`.
- ~~Gerador de imagem~~ → stable-diffusion.cpp (Vulkan) + SDXL + pixel-art-xl, local na RX 6600. Gerador de música continua em aberto (Fase 8).
- Capoeira mantido como assassino, tratado com dignidade (malandro carismático, ginga, navalha), sem estereótipo.
- Libs novas (PixiJS, framer-motion): **aceitas em princípio**. Ainda assim avisar qual e por quê antes de instalar.
- Atualizar o `DESIGN.md`: a nova direção contradiz "sem imagem externa", "sem avatar com imagem" e "sem fonte decorativa".
