import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const vals = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (c === "," && !inQ) {
        vals.push(cur);
        cur = "";
        continue;
      }
      cur += c;
    }
    vals.push(cur);
    const o = {};
    headers.forEach((h, i) => {
      o[h.trim()] = vals[i]?.trim() ?? "";
    });
    return o;
  });
}

const users = parseCsv(fs.readFileSync(path.join(root, "users.csv"), "utf8"));
const powers = parseCsv(
  fs.readFileSync(path.join(root, "power_records.csv"), "utf8")
);
const powerMap = Object.fromEntries(powers.map((p) => [p.uid, p]));

const players = users
  .map((u) => {
    const p = powerMap[u.uid] || {};
    return {
      uid: u.uid,
      nickname: u.nickname,
      group_id: u.group_id || null,
      avatar_url: u.avatar_url || null,
      position: u.position || null,
      self_description: u.self_description || null,
      is_new_player: u.is_new_player === "TRUE",
      steam_id: u.steam_id || null,
      base_power: p.base_power ? Number(p.base_power) : null,
      activity_bonus: p.activity_bonus ? Number(p.activity_bonus) : null,
      performance_adjustment: p.performance_adjustment
        ? Number(p.performance_adjustment)
        : null,
      ranking_adjustment: p.ranking_adjustment
        ? Number(p.ranking_adjustment)
        : null,
      current_power: p.current_power ? Number(p.current_power) : null,
    };
  })
  .filter((p) => p.current_power != null)
  .sort((a, b) => (b.current_power ?? 0) - (a.current_power ?? 0));

const outDir = path.join(__dirname, "../lib/data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "players.json"), JSON.stringify(players));
console.log(`Exported ${players.length} players to lib/data/players.json`);
