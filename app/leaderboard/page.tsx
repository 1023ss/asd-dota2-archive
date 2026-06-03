import { LeaderboardWithFilters } from "@/components/LeaderboardWithFilters";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getLeaderboard } from "@/lib/queries/players";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "战力排行榜 | ASD Dota2 社区档案馆",
};

export default async function LeaderboardPage() {
  const players = await getLeaderboard();
  const usingLocalData = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader
        label="Leaderboard"
        title="战力排行榜"
        description="按当前战力降序排列 · 支持 UID、位置、战力筛选"
      />
      {usingLocalData && (
        <p className="mb-6 text-xs tracking-wide text-[var(--muted)]/70">
          数据来源：本地 CSV 导入数据
        </p>
      )}
      <LeaderboardWithFilters players={players} />
    </div>
  );
}
