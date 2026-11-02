// Gera as versões otimizadas (WebP, em várias larguras) das fotos do site.
// Os originais em alta resolução ficam em assets/originais/ e não vão para o site publicado.
// Trocou uma foto? Substitua o arquivo em assets/originais/ (mesmo nome) e rode: npm run imagens
//
// Uso: node scripts/imagens.mjs [pasta-de-saida] [--force]
//   (o build chama com dist/assets/img para regenerar no deploy)
import { readdir, stat, mkdir } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

// Larguras geradas por foto, pensadas no tamanho em que cada uma aparece na tela
// (inclusive em telas de alta densidade). Uma largura só = arquivo sem sufixo.
// A textura de fundo aparece quase transparente, então aceita qualidade bem menor.
export const IMAGES = {
  "hero-autora": { widths: [640, 960, 1280, 1920] },
  "paisagem-ancestral": { widths: [640, 960, 1280, 1920] },
  "manuscrito-cafe": { widths: [560, 840, 1120] },
  "editora-retrato": { widths: [460, 616] },
  "padrao-textil": { widths: [420, 760], quality: 45 },
};

const SRC = "assets/originais";

export async function optimizeImages(outDir = "assets/img", { force = false } = {}) {
  await mkdir(outDir, { recursive: true });
  const files = await readdir(SRC);
  let made = 0;
  for (const file of files) {
    const { name } = parse(file);
    if (!IMAGES[name]) continue;
    const { widths, quality = 76 } = IMAGES[name];
    const src = join(SRC, file);
    const srcTime = (await stat(src)).mtimeMs;
    for (const w of widths) {
      const out = join(outDir, widths.length > 1 ? `${name}-${w}.webp` : `${name}.webp`);
      if (!force) {
        const done = await stat(out).catch(() => null);
        if (done && done.mtimeMs >= srcTime) continue; // já está atualizada
      }
      await sharp(src)
        .rotate() // respeita a orientação da câmera
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(out);
      made++;
    }
  }
  return made;
}

if (process.argv[1] && process.argv[1].endsWith("imagens.mjs")) {
  const args = process.argv.slice(2);
  const out = args.find((a) => !a.startsWith("--")) || "assets/img";
  const n = await optimizeImages(out, { force: args.includes("--force") });
  console.log(n ? `${n} imagem(ns) gerada(s) em ${out}` : "Imagens já estavam atualizadas.");
}
