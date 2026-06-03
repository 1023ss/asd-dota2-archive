import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const src =
  process.argv[2] ||
  path.join(projectRoot, "public/logo-allstarts-source.png");
const dst = path.join(projectRoot, "public/logo-allstarts.png");

if (!fs.existsSync(src)) {
  console.error("Source not found:", src);
  process.exit(1);
}

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const bg = new Uint8Array(width * height);

function isGrayBg(r, g, b) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  return spread < 28 && lum >= 208 && lum <= 234;
}

const visited = new Uint8Array(width * height);
const queue = [];
for (let x = 0; x < width; x++) {
  queue.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y++) {
  queue.push([0, y], [width - 1, y]);
}

while (queue.length) {
  const [x, y] = queue.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const idx = y * width + x;
  if (visited[idx]) continue;
  visited[idx] = 1;

  const o = idx * 4;
  if (!isGrayBg(data[o], data[o + 1], data[o + 2])) continue;

  bg[idx] = 1;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const DILATE = 5;
for (let pass = 0; pass < DILATE; pass++) {
  const next = new Uint8Array(bg);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (bg[idx]) {
        next[idx] = 1;
        continue;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (bg[ny * width + nx]) next[idx] = 1;
        }
      }
    }
  }
  bg.set(next);
}

const out = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i++) {
  const o = i * 4;
  const si = i * 3;
  const r = data[si];
  const g = data[si + 1];
  const b = data[si + 2];
  const lum = (r + g + b) / 3;
  const di = i * 4;

  if (bg[i] || lum < 90) {
    out[di + 3] = 0;
    continue;
  }

  const CUT_LOW = 235;
  const CUT_HIGH = 246;
  let alpha = 0;
  if (lum >= CUT_HIGH) alpha = 255;
  else if (lum > CUT_LOW) {
    alpha = Math.round(((lum - CUT_LOW) / (CUT_HIGH - CUT_LOW)) * 255);
  }

  out[di] = 255;
  out[di + 1] = 255;
  out[di + 2] = 255;
  out[di + 3] = alpha;
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 12 })
  .png({ compressionLevel: 9 })
  .toFile(dst);

const meta = await sharp(dst).metadata();
console.log(
  `Transparent logo: ${dst} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`
);
