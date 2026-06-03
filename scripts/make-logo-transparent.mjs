import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_SOURCES = [
  process.argv[2],
  path.join(
    projectRoot,
    "../.cursor/projects/c-Users-Administrator-Desktop/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_691921ba4d72081de6c37cfff7ed4ec6_images_wknpfw3zc9rga0cygc89fdhw7g-removed-bg-35476c56-d6d7-4ff8-aa48-dfdcb78b8293.png"
  ),
  "C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_691921ba4d72081de6c37cfff7ed4ec6_images_wknpfw3zc9rga0cygc89fdhw7g-removed-bg-35476c56-d6d7-4ff8-aa48-dfdcb78b8293.png",
  path.join(projectRoot, "public/logo-allstarts.png"),
].filter(Boolean);

const dst = path.join(projectRoot, "public/logo-allstarts.png");

const src = DEFAULT_SOURCES.find((p) => fs.existsSync(p));
if (!src) {
  console.error("No logo source found.");
  process.exit(1);
}

const BG_MAX = 50;
const STROKE_BLUR = 3.2;
const GLOW_BLUR = 10;
const STROKE_BOOST = 2.4;

function buildRgbaFromMask(maskData, width, height, rgb, alphaScale = 1) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < maskData.length; i++) {
    const a = Math.min(255, Math.round(maskData[i] * alphaScale));
    const o = i * 4;
    out[o] = rgb[0];
    out[o + 1] = rgb[1];
    out[o + 2] = rgb[2];
    out[o + 3] = a;
  }
  return out;
}

async function maskFromSource(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const alpha = data[i + 3];
    const idx = i / 4;
    if (alpha > 20 && brightness > BG_MAX) {
      mask[idx] = Math.min(255, alpha + (brightness - BG_MAX));
    } else if (brightness > BG_MAX) {
      mask[idx] = Math.min(255, (brightness - BG_MAX) * 3);
    } else {
      mask[idx] = 0;
    }
  }
  return { mask, width: info.width, height: info.height };
}

async function thickenMask(mask, width, height) {
  const boosted = await sharp(mask, {
    raw: { width, height, channels: 1 },
  })
    .blur(STROKE_BLUR)
    .linear(STROKE_BOOST, -40)
    .blur(0.8)
    .raw()
    .toBuffer();

  return boosted;
}

async function glowMask(coreMask, width, height) {
  return sharp(coreMask, { raw: { width, height, channels: 1 } })
    .blur(GLOW_BLUR)
    .linear(1.2, 10)
    .raw()
    .toBuffer();
}

function trimRgba(rgba, width, height, threshold = 8) {
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3];
      if (a > threshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const newW = maxX - minX + 1;
  const newH = maxY - minY + 1;
  const out = Buffer.alloc(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const src = ((minY + y) * width + (minX + x)) * 4;
      const dst = (y * newW + x) * 4;
      out[dst] = rgba[src];
      out[dst + 1] = rgba[src + 1];
      out[dst + 2] = rgba[src + 2];
      out[dst + 3] = rgba[src + 3];
    }
  }

  return { rgba: out, width: newW, height: newH };
}

function compositeLayers(width, height, coreMask, glowMask) {
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < coreMask.length; i++) {
    const glowA = Math.min(255, Math.round(glowMask[i] * 0.55));
    const coreA = Math.min(255, Math.round(coreMask[i] * 1.15));

    const totalA = Math.min(255, glowA + coreA * 0.85);
    const o = i * 4;

    if (totalA <= 0) {
      out[o + 3] = 0;
      continue;
    }

    const coreWeight = coreA / (glowA + coreA + 0.001);
    const r = Math.round(255 * coreWeight + 255 * (1 - coreWeight) * 0.92);
    const g = Math.round(248 * coreWeight + 220 * (1 - coreWeight) * 0.85);
    const b = Math.round(248 * coreWeight + 220 * (1 - coreWeight) * 0.85);

    out[o] = Math.min(255, r);
    out[o + 1] = Math.min(255, g);
    out[o + 2] = Math.min(255, b);
    out[o + 3] = totalA;
  }

  return out;
}

const input = fs.readFileSync(src);
const { mask, width, height } = await maskFromSource(input);
const coreMask = await thickenMask(mask, width, height);
const glow = await glowMask(coreMask, width, height);
const rgbaFull = compositeLayers(width, height, coreMask, glow);
const { rgba, width: outW, height: outH } = trimRgba(rgbaFull, width, height);

await sharp(rgba, { raw: { width: outW, height: outH, channels: 4 } })
  .png({ compressionLevel: 9, force: true })
  .toFile(dst);

const meta = await sharp(dst).metadata();
console.log(`Enhanced logo saved: ${dst} (${meta.width}x${meta.height}) from ${src}`);
