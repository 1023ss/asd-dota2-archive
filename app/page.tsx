import Link from "next/link";
import Image from "next/image";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getActivityLeaderboard, getArchiveStats } from "@/lib/queries/players";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { HistoryEvents } from "@/components/HistoryEvents";
import { getRecentEventResults } from "@/lib/queries/event";
export default async function HomePage() {
  const [stats, activePlayers, recentEvents] = await Promise.all([
    getArchiveStats(),
    getActivityLeaderboard(10),
    getRecentEventResults(3),
  ]);

  const usingLocalData = !isSupabaseConfigured();

  return (
    <>
      {/* Hero */}
      <section className="hero-banner overflow-hidden border-b border-[var(--border)]">
        <div className="hero-banner__content mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="section-label mb-5">Community Archive</p>
          <h1 className="hero-title">
            <span className="hero-title__line hero-title__line--main">
              <span className="hero-title__accent">A</span>
              <span className="hero-title__white">LL</span>
              <span className="hero-title__accent">S</span>
              <span className="hero-title__white">TARS</span>
            </span>
            <span className="hero-title__line hero-title__line--sub hero-title__white">
              DOTA2
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--foreground)]/75 drop-shadow-[0_1px_12px_rgba(0,0,0,0.8)]">
            记录赛事与玩家成长历程
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/leaderboard" className="btn-primary">
              查看战力排行榜
            </Link>
            <Link href="/events" className="btn-ghost">
              查看历史比赛
            </Link>
          </div>

          {usingLocalData && (
            <p className="mt-6 text-xs tracking-wide text-[var(--muted)]/70">
              当前使用本地数据 · 配置 Supabase 后可切换云端
            </p>
          )}
        </div>

        <div className="hero-banner__media" aria-hidden>
          <Image
            src="/hero-nevermore-bg.png"
            alt=""
            fill
            priority
            quality={90}
            sizes="100vw"
            className="hero-banner__image"
          />
          <div className="hero-banner__overlay" />
          <div className="hero-banner__glow" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Stats */}
        <section className="mb-16">
          <SectionHeader
            label="Statistics"
            title="社区数据"
            description="实时档案统计概览"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="注册玩家"
              value={stats.totalPlayers}
              hint="社区档案总数"
              index={0}
            />
            <StatCard
              label="社区成立时间"
              value="2022年9月"
              hint="ALLSTARS 社区启航"
              index={1}
            />
            <StatCard
              label="举办赛事场数"
              value={stats.eventCount}
              hint="历史赛事总场数"
              index={2}
            />
          </div>
        </section>

        <HistoryEvents
          events={recentEvents}
          title="最近赛事"
          description="最近三场社区比赛记录"
          viewAllHref="/events"
        />

        {/* Active Top 10 */}
        <section className="mt-16">
          <SectionHeader
            label="Activity"
            title="活跃玩家 TOP 10"
            description="按历史比赛参赛记录统计，每参加一场 +1"
            action={
              <Link
                href="/leaderboard"
                className="text-sm tracking-wide text-[var(--accent-bright)] transition hover:text-white"
              >
                查看战力排行 →
              </Link>
            }
          />
          {activePlayers.length > 0 ? (
            <LeaderboardTable
              players={activePlayers}
              showAll={false}
              variant="activity"
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              暂无参赛记录，配置赛事队伍数据后将自动统计。
            </p>
          )}
        </section>
      </div>
    </>
  );
}
