// Gera as expressões de um personagem a partir de tools/art/prompts/<id>.json
// usando o stable-diffusion.cpp (Vulkan). ROADMAP Fase 2.
//
// Uso:
//   npx tsx tools/art/generate.ts capoeira [--expr neutro,blefe] [--seeds 3] [--seed 1850]
//   npx tsx tools/art/generate.ts capoeira --expr blefe --from neutro [--strength 0.6]
//     (img2img: parte da imagem `neutro` da MESMA seed — mantém o personagem e deixa
//      só o rosto/pose mudarem. Strength baixo = mais fiel; alto = mais expressivo.)
//
// Ambiente (opcional): SD_HOME = pasta com sdcpp/ e models/ (padrão ~/ai-art).
// Saída: $SD_HOME/out/<id>_<expressao>_s<seed>.png  (curar à mão e depois rodar postprocess.ts)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

interface PromptFile {
  id: string;
  estilo: string;
  personagem: string;
  expressoes: Record<string, string>;
  negativo: string;
  geracao: {
    modelo: string;
    vae: string;
    lora: string;
    lora_peso: number;
    largura: number;
    altura: number;
    passos: number;
    cfg: number;
    sampler: string;
    seed_base: number;
    img2img_strength?: number; // padrão do --from
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const id = args[0];
  if (!id || id.startsWith("--")) {
    throw new Error("Uso: generate.ts <id> [--expr a,b] [--seeds N] [--seed S]");
  }
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const prompt = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "prompts", `${id}.json`), "utf8"),
  ) as PromptFile;
  const g = prompt.geracao;

  const home = process.env.SD_HOME ?? join(homedir(), "ai-art");
  const bin = join(home, "sdcpp", "build", "bin", "sd-cli");
  const models = join(home, "models");
  const outDir = join(home, "out");
  if (!existsSync(bin)) throw new Error(`sd-cli não encontrado em ${bin}`);
  mkdirSync(outDir, { recursive: true });

  const expressions = (flag("expr") ?? Object.keys(prompt.expressoes).join(",")).split(",");
  const baseSeed = Number(flag("seed") ?? g.seed_base);
  const seedCount = Number(flag("seeds") ?? 1);
  const from = flag("from"); // expressão-base para img2img
  const strength = Number(flag("strength") ?? g.img2img_strength ?? 0.6);

  for (const expr of expressions) {
    const expression = prompt.expressoes[expr];
    if (!expression) throw new Error(`Expressão desconhecida: ${expr}`);
    const text = `${prompt.estilo}, ${prompt.personagem}, ${expression} <lora:${g.lora}:${g.lora_peso}>`;
    for (let k = 0; k < seedCount; k++) {
      const seed = baseSeed + k;
      const suffix = from ? `_from-${from}-${strength}` : "";
      const out = join(outDir, `${prompt.id}_${expr}_s${seed}${suffix}.png`);
      const init = from ? join(outDir, `${prompt.id}_${from}_s${seed}.png`) : null;
      if (init && !existsSync(init)) throw new Error(`imagem-base não encontrada: ${init}`);
      console.log(`→ ${expr} seed=${seed}${from ? ` (img2img de ${from}, strength ${strength})` : ""}`);
      // Array de argumentos (sem shell): o texto do prompt nunca é interpretado como comando.
      const res = spawnSync(
        bin,
        [
          "-m", join(models, g.modelo),
          "--vae", join(models, g.vae),
          "--lora-model-dir", models,
          "-p", text,
          "-n", prompt.negativo,
          "-W", String(g.largura),
          "-H", String(g.altura),
          "--steps", String(g.passos),
          "--cfg-scale", String(g.cfg),
          "--sampling-method", g.sampler,
          "-s", String(seed),
          "--vae-tiling",
          ...(init ? ["-i", init, "--strength", String(strength)] : []),
          "-o", out,
        ],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
      if (res.status !== 0) throw new Error(`sd-cli falhou (${expr}, seed ${seed})`);
      console.log(`  ok ${out}`);
    }
  }
}

try {
  main();
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
