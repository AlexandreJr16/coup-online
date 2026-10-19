# tools/art — geração de arte (IA local)

Pipeline: **prompt JSON → stable-diffusion.cpp (Vulkan) → PNG cru → postprocess → `public/art/<tema>/<id>/`**.
Contexto e decisões em `docs/SPIKE_ARTE.md`. Tudo pesado fica **fora do repo**, em `~/ai-art/` (ou `$SD_HOME`).

## Setup (uma vez; Arch, sem sudo)
Requisitos já presentes: `cmake`, `ninja`, `shaderc` (glslc), `vulkan-headers`, `vulkan-icd-loader`, `vulkan-radeon`.

```bash
mkdir -p ~/ai-art/models ~/ai-art/out && cd ~/ai-art

# 1) SPIRV-Headers local (o pacote spirv-headers pediria sudo)
git clone --depth 1 https://github.com/KhronosGroup/SPIRV-Headers.git spirv-headers
cmake -S spirv-headers -B spirv-headers/build -G Ninja -DCMAKE_INSTALL_PREFIX="$HOME/ai-art/prefix"
cmake --install spirv-headers/build

# 2) stable-diffusion.cpp com Vulkan
git clone --recursive https://github.com/leejet/stable-diffusion.cpp.git sdcpp
cd sdcpp
cmake -B build -G Ninja -DSD_VULKAN=ON -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_PREFIX_PATH="$HOME/ai-art/prefix" -DCMAKE_CXX_FLAGS="-I$HOME/ai-art/prefix/include"
cmake --build build -j"$(nproc)"
./build/bin/sd-cli --list-devices        # deve listar a RX 6600

# 3) Modelos (~7,5 GB) em ~/ai-art/models
cd ~/ai-art/models
curl -fL -O https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
curl -fL -O https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl.vae.safetensors
curl -fL -O https://huggingface.co/nerijs/pixel-art-xl/resolve/main/pixel-art-xl.safetensors
```

## Uso
```bash
# gerar (4 seeds por expressão para curar à mão; ~80 s por imagem)
npx tsx tools/art/generate.ts capoeira --expr neutro,blefe --seeds 4
# → ~/ai-art/out/capoeira_<expr>_s<seed>.png

# pós-processar a imagem escolhida (retrato + miniatura)
D=public/art/imperio/assassino
npx tsx tools/art/postprocess.ts ~/ai-art/out/capoeira_neutro_s1850.png $D/neutro.png    --size 88x124 --grid 8 --tol 70
npx tsx tools/art/postprocess.ts ~/ai-art/out/capoeira_neutro_s1850.png $D/neutro.sm.png --size 40x56  --grid 8 --kernel lanczos3 --tol 70
```
Revisar em `http://localhost:3000/dev/cartas` (com `npm run dev`).

## Flags do postprocess
`--size WxH` (alvo) · `--grid N` (reduz por blocos de N px; **use 8** com o pixel-art-xl a 704×1024) · `--kernel nearest|lanczos3|mitchell` (só afeta o redimensionamento final) · `--tol N` (tolerância do fundo; 70 funciona) · `--bg auto|#rrggbb` · `--preview N` (gera `.xN.png` ampliado) · `--margin N` (modo sem grid).

## Convenções
- `tools/art/palette.json` é a **única fonte** da paleta mestra.
- Prompts versionados em `tools/art/prompts/<id>.json`; subir `versao` ao mudar.
- Arquivos finais: `public/art/<tema>/<id-da-carta>/<expressao>.png` e `.sm.png`. `<id-da-carta>` é o id interno (`assassino`, não "capoeira").
- A carta só usa a imagem se `arte` em `src/lib/game/cards.ts` listar a expressão; senão, emoji.

## Dicas aprendidas (Fases 2–3)
- **Curar por seeds:** gere 6 por personagem (`--seeds 6`, ~8 min) e escolha olhando uma folha de contato. A variedade é grande e a qualidade, alta.
- **Fundo:** o modelo ignora "fundo magenta" e devolve branco/cinza liso; o `postprocess` detecta pela cor mais frequente da borda e só semeia o preenchimento no topo e nos lados (o busto é cortado embaixo e o branco da roupa seria apagado).
- **Verso e cenário** (sem fundo a remover): `--bg "#ff00ff" --tol 0`. Verso em `--size 88x128` (o CSS cobre e corta 2 px); cenário `--size 168x96`, exibido suavizado/desfocado.
- **Expressões:** `--from neutro --strength 0.55..0.75` (img2img) preserva a identidade mas **quase não muda o rosto**; por isso o jogo usa 1 retrato por personagem e traduz reações em efeito.
- Se uma cor do retrato virar vermelho/laranja demais, meça com a paleta e acrescente o tom que falta em `palette.json` (foi assim que entraram os cobres).
- **Cuidado no shell:** `ls` aqui é alias do `eza` e pode travar em segundo plano; use `command ls`.

## Arte de UI (procedural)
Ícones de interface, prêmios, logo e favicon **não usam IA de imagem**: são bitmaps desenhados em texto e renderizados por script, 100% determinísticos.

```bash
npx tsx tools/art/ui-icons.ts                    # regrava ícones, logo e favicon
npx tsx tools/art/ui-icons.ts --contato /tmp/contato-ui.png   # + folha de contato p/ curar
node --import tsx --test tools/art/ui-icons.test.ts           # confere tudo
```

- **Determinismo / seed:** não há semente nem aleatoriedade. Mesma entrada, mesmos bytes (o teste roda duas vezes e compara, e compara também com o que está em disco; se editar um bitmap, rode o comando acima antes de testar).
- **Método:** `tools/art/ui-bitmaps.ts` guarda a legenda (1 caractere = 1 cor da `palette.json`; `.` = transparente), os bitmaps dos ícones, a fonte 5x7 do logo e alguns geradores de forma (engrenagem, moeda, lupa, machado, saco). `tools/art/ui-icons.ts` centraliza cada miolo em 14x14, **acrescenta o contorno tinta de 1 px automaticamente** (vizinhança 4; `contorno: 8` para traços diagonais finos), amplia por vizinho mais próximo e grava com `tools/art/png.ts`. O PNG só tem pixels da paleta mestra, alfa 0 ou 255.
- **Tamanhos:** base 16x16 (miolo 14 + contorno). `<nome>.png` = base x4 = 64x64; `<nome>.sm.png` = base x2 = 32x32 (mesmo padrão dos ícones de ação).
- **Nomes:** `public/art/imperio/icones/<nome>.png` + `<nome>.sm.png`, `snake_case` sem acento. Todo nome novo entra em `IconName` e `ICONS_AVAILABLE` (`src/components/game/helpers.ts`); o teste falha se algo gerado não estiver registrado ou se a lista apontar para arquivo inexistente.
- **Ícones gerados (19):** `contestar`, `trofeu`, `olho` (espectador), `ajuda` (?), `som`, `mudo`, `sair`, `engrenagem`, `crt`, `coroa`, `certo`, `errado`, `ampulheta`, `moeda` e os prêmios `carrasco`, `ricaco`, `mentiroso`, `desconfiado`, `olho_de_lince`. Os ícones de ação (renda, golpe, trocar, ...) continuam vindo do pipeline de IA e **não** são regerados aqui.
- **Logo:** `public/art/imperio/logo.png` (x4) e `logo.sm.png` (x2, ~42 px de altura): coroa de 5 pontas sobre `COUP IMPÉRIO` na fonte 5x7 própria (hastes de 2 px, face ouro em degradê, sombra bronze, contorno tinta).
- **Favicon:** `app/icon.png` (64x64, o Next usa sozinho). `app/favicon.ico` (antigo) continua existindo; remover se quiser só o novo.
- **Adicionar um ícone:** inclua o bitmap (até 14x14) em `ICONES` e o nome em `ORDEM_ICONES` (`ui-bitmaps.ts`), rode o comando, registre em `IconName`/`ICONS_AVAILABLE` e olhe a folha de contato.
