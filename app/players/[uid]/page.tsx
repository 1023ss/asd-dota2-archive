import Link from "next/link";
import { notFound } from "next/navigation";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PlayerTag } from "@/components/PlayerTag";
import { getPlayerEventActivity } from "@/lib/queries/activity";
import { getPlayerChampionships } from "@/lib/queries/championships";
import { getPlayerByUid } from "@/lib/queries/players";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PlayerPageProps {
  params: Promise<{ uid: string }>;
}

function PowerRow({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const display = value != null ? value : "—";
  const isNegative = typeof value === "number" && value < 0;
  return (
    <div className="flex items-center justify-between border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
      <span className="text-xs tracking-[0.12em] text-[var(--muted)] uppercase">
        {label}
      </span>
      <span
        className={`font-mono text-lg font-bold ${
          isNegative ? "text-[var(--accent-bright)]" : "text-white"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

export async function generateMetadata({ params }: PlayerPageProps) {
  const { uid } = await params;
  const player = await getPlayerByUid(uid);
  if (!player) return { title: "玩家未找到" };
  return {
    title: `${player.nickname} (${player.uid}) | ASD Dota2 社区档案馆`,
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { uid } = await params;
  const [player, championships, eventActivity] = await Promise.all([
    getPlayerByUid(uid),
    getPlayerChampionships(uid),
    getPlayerEventActivity(uid),
  ]);

  if (!player) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/leaderboard"
        className="mb-8 inline-flex items-center gap-2 text-sm tracking-wide text-[var(--muted)] transition hover:text-[var(--accent-bright)]"
      >
        <span className="text-[var(--accent)]">←</span> 返回排行榜
      </Link>

      <KuroPanel className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-[var(--accent)]">
              {player.uid}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl">
                {player.nickname || player.uid}
              </h1>
              {player.tag ? (
                <PlayerTag tag={player.tag} />
              ) : (
                <span className="inline-flex items-center border border-[var(--border)] px-2 py-1 text-[10px] tracking-[0.18em] text-[var(--muted)] uppercase">
                  未设置 tag
                </span>
              )}
            </div>
            {player.is_new_player && (
              <span className="mt-3 inline-block border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] tracking-[0.15em] text-emerald-400">
                NEW PLAYER
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--muted)] uppercase">
              当前战力
            </p>
            <p className="stat-value mt-1 text-4xl sm:text-5xl">
              {player.current_power ?? "—"}
            </p>
          </div>
        </div>

        {player.self_description && (
          <blockquote className="mt-8 border-l-2 border-[var(--accent)] pl-4 text-[var(--foreground)]/80 italic leading-relaxed">
            「{player.self_description}」
          </blockquote>
        )}

        <div className="my-8 h-px bg-gradient-to-r from-[var(--accent)]/50 via-[var(--border)] to-transparent" />

        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] tracking-[0.15em] text-[var(--muted)] uppercase">
              擅长位置
            </dt>
            <dd className="mt-1.5 text-white">{player.position || "—"}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-[10px] tracking-[0.15em] text-[var(--muted)] uppercase">
              活跃值
            </dt>
            <dd className="mt-1.5 font-mono text-lg font-bold text-[var(--accent-bright)]">
              {eventActivity}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] tracking-[0.15em] text-[var(--muted)] uppercase">
              Steam ID
            </dt>
            <dd className="mt-1.5 font-mono text-sm text-[var(--muted)]">
              {player.steam_id || "—"}
            </dd>
          </div>
        </dl>
      </KuroPanel>

      <section className="mt-10">
        <SectionHeader label="Power" title="战力构成" />
        <div className="grid gap-3 sm:grid-cols-2">
          <PowerRow label="基础战力" value={player.base_power} />
          <PowerRow label="活跃加成" value={player.activity_bonus} />
          <PowerRow
            label="表现调整"
            value={player.performance_adjustment}
          />
          <PowerRow label="排名调整" value={player.ranking_adjustment} />
        </div>
      </section>

      {championships.length > 0 && (
        <section className="mt-12">
          <SectionHeader label="Honors" title="冠军荣誉" />
          <div className="grid gap-3">
            {championships.map((c) => (
              <KuroPanel key={c.id} className="px-4 py-3 text-white">
                {c.event_name}
              </KuroPanel>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
