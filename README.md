# ASD Dota2 社区档案馆

基于 **Next.js 15**、**TypeScript**、**Tailwind CSS** 与 **Supabase** 的 ASD Dota2 社区玩家档案与战力排行网站。

## 功能

- **首页**：社区档案馆介绍、统计数据、战力 TOP 10
- **排行榜** (`/leaderboard`)：按当前战力排序的完整玩家列表
- **玩家详情** (`/players/[uid]`)：档案信息、战力构成明细

## 快速开始

```bash
cd asd-dota2-archive
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

未配置 Supabase 时，应用自动使用从上级目录 CSV 导入的 `lib/data/players.json` 本地数据。

## Supabase 配置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 执行 `supabase/schema.sql`
3. 复制 `.env.local.example` 为 `.env.local` 并填入 URL 与 Anon Key
4. 使用 `scripts/import-csv.mjs` 生成 JSON 后，可将数据批量导入 Supabase（或通过 Table Editor 手动导入）

## 从 CSV 更新本地数据

上级目录需包含 `users.csv` 与 `power_records.csv`：

```bash
node scripts/import-csv.mjs
```

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## 项目结构

```
app/
  page.tsx              # 首页
  leaderboard/page.tsx  # 排行榜
  players/[uid]/page.tsx # 玩家详情
components/             # UI 组件
lib/
  data/                 # 本地 JSON 数据
  queries/              # 数据查询（Supabase + 本地回退）
  supabase/             # Supabase 客户端
supabase/schema.sql     # 数据库 DDL
scripts/import-csv.mjs  # CSV → JSON 导入脚本
```
