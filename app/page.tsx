import Image from "next/image";
import Link from "next/link";
import { HistoryEvents } from "@/components/HistoryEvents";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCommunityDate,
  getContentSummary,
  getLatestBulletin,
  getLatestSponsorPost,
} from "@/lib/queries/community";
import { getRecentEventResults } from "@/lib/queries/event";
import { getActivityLeaderboard, getArchiveStats } from "@/lib/queries/players";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const liveHref =
  "https://live.bilibili.com/7709026?live_from=84001&spm_id_from=333.337.0.0";

export default async function HomePage() {
  const [stats, activePlayers, recentEvents, bulletin, sponsorPost] =
    await Promise.all([
      getArchiveStats(),
      getActivityLeaderboard(10),
      getRecentEventResults(3),
      getLatestBulletin(),
      getLatestSponsorPost(),
    ]);

  const usingLocalData = !isSupabaseConfigured();

  return (
    <>
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
              当前使用本地数据，配置 Supabase 后可切换云端
            </p>
          )}
        </div>

        <div className="hero-banner__media" aria-hidden>
          <Image
            src="/img2.png"
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
              value="2022年5月"
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

        <section className="mt-16">
          <SectionHeader
            label="Community News"
            title="资讯展示区"
            description="ASD 社区公告、赞助记录与官方直播入口"
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <Link
              href={bulletin ? `/bulletins/${bulletin.id}` : "/bulletins"}
              className="group relative block overflow-hidden border border-[var(--border-accent)] bg-black/60 p-5 transition hover:border-[var(--accent-bright)] sm:p-6"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(214,40,40,0.3),transparent_36%),linear-gradient(135deg,rgba(0,0,0,0.18),rgba(0,0,0,0.9))]" />
              <div className="pointer-events-none absolute bottom-2 right-4 font-black leading-none text-[rgba(214,40,40,0.14)] text-[5rem] sm:text-[7rem]">
                ASD
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <p className="section-label">Bulletin</p>
                  <span className="shrink-0 text-sm tracking-wide text-[var(--accent-bright)] transition group-hover:text-white">
                    查看历史 →
                  </span>
                </div>

                <div className="mt-5">
                  <p className="mb-3 inline-flex border border-[var(--accent)] bg-[rgba(214,40,40,0.14)] px-3 py-1 text-xs font-bold tracking-[0.18em] text-[var(--accent-bright)] uppercase">
                    ASD 大字报
                  </p>
                  {bulletin ? (
                    <>
                      <h3 className="max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">
                        {bulletin.title}
                      </h3>
                      {bulletin.subtitle && (
                        <p className="mt-3 text-base text-[var(--foreground)]/75">
                          {bulletin.subtitle}
                        </p>
                      )}
                      <p className="mt-5 text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                        {formatCommunityDate(bulletin.published_at)}
                      </p>
                      <p className="mt-4 max-h-[420px] max-w-2xl overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-[var(--foreground)]/75">
                        {bulletin.content || "暂无内容"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">暂无内容</p>
                  )}
                </div>
              </div>
            </Link>

            <div className="grid gap-4">
              <Link
                href={sponsorPost ? `/sponsors/${sponsorPost.id}` : "/sponsors"}
                className="group block border border-[var(--border-accent)] bg-black/55 p-6 transition hover:border-[var(--accent-bright)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="section-label">Sponsor</p>
                  <span className="shrink-0 text-sm tracking-wide text-[var(--accent-bright)] transition group-hover:text-white">
                    查看历史 →
                  </span>
                </div>
                <div className="mt-6">
                  <h3 className="text-2xl font-black text-white">赞助展示</h3>
                  {sponsorPost ? (
                    <>
                      <p className="mt-3 text-lg font-bold text-[var(--accent-bright)]">
                        {sponsorPost.title}
                      </p>
                      {sponsorPost.sponsor_name && (
                        <p className="mt-2 text-sm text-white">
                          {sponsorPost.sponsor_name}
                        </p>
                      )}
                      <p className="mt-2 text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                        {formatCommunityDate(sponsorPost.published_at)}
                      </p>
                      <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/72">
                        {getContentSummary(sponsorPost.content)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--muted)]">暂无内容</p>
                  )}
                </div>
              </Link>

              <div className="overflow-hidden border border-[var(--border-accent)] bg-black/55">
                <div className="relative aspect-[16/9] w-full border-b border-[var(--border)]">
                  <Image
                    src="/live.png"
                    alt="官方直播间"
                    fill
                    sizes="(min-width: 1024px) 36vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <p className="section-label">Live Room</p>
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-sm tracking-wide text-[var(--accent-bright)] transition hover:text-white"
                    >
                      进入直播 →
                    </a>
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-white">
                    官方直播间
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/72">
                    观看 ASD 官方赛事直播与精彩回放。
                  </p>
                  <a
                    href={liveHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary btn-primary--sm mt-5 inline-flex"
                  >
                    进入直播间 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
