import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventTeams } from "@/lib/queries/event";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatEventType(type?: string | null) {
  switch (type) {
    case "daily":
      return "日赛";
    case "weekly":
      return "周赛";
    case "monthly":
      return "月赛";
    case "special":
      return "特殊比赛";
    default:
      return "赛事";
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) {
    notFound();
  }

  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const teams = await getEventTeams(eventId);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          Event Detail
        </p>

        <h1 className="text-3xl font-black text-white sm:text-5xl">
          {event.event_name}
        </h1>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
          <span>{formatEventType(event.event_type)}</span>

          {event.event_date && <span>{event.event_date}</span>}

          {event.status && <span>状态：{event.status}</span>}
        </div>
      </div>

      <section className="border border-white/10 bg-black/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent-title)]">
              Teams
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">参赛队伍</h2>
          </div>

          <Link
            href="/events"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            返回历史比赛
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="mt-6 border border-white/10 bg-black/40 p-5 text-sm text-[var(--muted)]">
            暂无队伍信息。
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="border border-white/10 bg-black/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-title)]">
                      {team.team_no ? `Team ${team.team_no}` : "Team"}
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-white">
                      {team.team_name || `队伍${team.team_no || ""}`}
                    </h3>

                    {team.captain_uid && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        队长：
                        <span className="font-mono text-[var(--accent)]">
                          {team.captain_uid}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[var(--muted)]">总战力</p>
                    <p className="font-mono text-2xl font-black text-white">
                      {team.total_power ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {team.members.length === 0 ? (
                    <div className="border border-white/10 px-3 py-2 text-sm text-[var(--muted)]">
                      暂无成员。
                    </div>
                  ) : (
                    team.members.map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--muted)]">
                              #{index + 1}
                            </span>

                            {member.uid ? (
                              <Link
                                href={`/players/${member.uid}`}
                                className="truncate text-sm text-[var(--accent)] hover:underline"
                              >
                                {member.nickname || member.uid}
                              </Link>
                            ) : (
                              <span className="truncate text-sm text-white">
                                {member.nickname || "未知玩家"}
                              </span>
                            )}
                          </div>

                          {member.uid && (
                            <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                              {member.uid}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-[var(--muted)]">战力</p>
                          <p className="font-mono text-sm font-bold text-white">
                            {member.power ?? 0}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
