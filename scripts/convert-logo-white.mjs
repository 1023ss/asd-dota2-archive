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

const { data, info } = await sharp(src)
  .flatten({ background: "#ffffff" })
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const bg = new Uint8Array(width * height);

function isWhite(r, g, b) {
  return (r + g + b) / 3 >= 232;
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

  const o = idx * 3;
  if (!isWhite(data[o], data[o + 1], data[o + 2])) continue;

  bg[idx] = 1;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const out = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i++) {
  const si = i * 3;
  const lum = (data[si] + data[si + 1] + data[si + 2]) / 3;
  const di = i * 4;

  if (bg[i]) {
    out[di + 3] = 0;
    continue;
  }

  const alpha = Math.min(255, Math.round((245 - lum) * 2.2));
  out[di] = 255;
  out[di + 1] = 255;
  out[di + 2] = 255;
  out[di + 3] = alpha > 8 ? alpha : 0;
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 10 })
  .png({ compressionLevel: 9 })
  .toFile(dst);

const meta = await sharp(dst).metadata();
console.log(`Logo: ${dst} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
