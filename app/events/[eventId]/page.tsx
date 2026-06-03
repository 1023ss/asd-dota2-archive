import Link from "next/link";
import { notFound } from "next/navigation";
import { EventMemberList } from "@/components/HistoryEvents";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getEventById, getEventTeams } from "@/lib/queries/event";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId: eventIdParam } = await params;
  const eventId = Number(eventIdParam);

  if (!eventId || Number.isNaN(eventId)) {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const [event, teams] = await Promise.all([
    getEventById(eventId),
    getEventTeams(eventId),
  ]);

  if (!event) {
    notFound();
  }

  const hasChampions = (event.champions?.length ?? 0) > 0;
  const hasSponsors = (event.sponsors?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/events"
        className="mb-8 inline-flex items-center gap-2 text-sm tracking-wide text-[var(--muted)] transition hover:text-[var(--accent-bright)]"
      >
        <span className="text-[var(--accent)]">←</span> 返回历史比赛
      </Link>

      <KuroPanel className="p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
          Event
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-wide text-white sm:text-4xl">
          {event.event_name}
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          开赛时间：{event.event_date || "未记录"}
        </p>

        {event.poster_url && (
          <img
            src={event.poster_url}
            alt={`${event.event_name} 海报`}
            className="mt-6 max-h-96 w-full border border-[var(--border)] object-cover"
          />
        )}

        {hasChampions && (
          <div className="mt-8">
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">
              冠军成员
            </p>
            <EventMemberList members={event.champions} />
          </div>
        )}

        {hasSponsors && (
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">
              赞助者
            </p>
            <EventMemberList members={event.sponsors} />
          </div>
        )}
      </KuroPanel>

      <section className="mt-12">
        <SectionHeader label="Teams" title="参赛队伍" />

        {teams.length === 0 ? (
          <KuroPanel className="p-5 text-sm text-[var(--muted)]">
            暂无参赛队伍与战力明细。
          </KuroPanel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((team) => (
              <KuroPanel key={team.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-white">
                    {team.team_name}
                  </h2>

                  <span className="font-mono text-sm text-[var(--accent-bright)]">
                    {team.total_power ?? "—"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between border border-[var(--border)] px-3 py-2"
                    >
                      <div>
                        {member.uid ? (
                          <Link
                            href={`/players/${member.uid}`}
                            className="text-sm text-[var(--accent-bright)] hover:underline"
                          >
                            {member.nickname}
                          </Link>
                        ) : (
                          <span className="text-sm text-white">
                            {member.nickname}
                          </span>
                        )}

                        {member.uid && (
                          <span className="ml-2 font-mono text-[10px] text-[var(--muted)]">
                            {member.uid}
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-sm text-white">
                        {member.power ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </KuroPanel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
