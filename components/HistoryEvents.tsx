import Link from "next/link";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { EventMember, EventResult } from "@/lib/queries/event";

export function EventMemberList({ members }: { members: EventMember[] }) {
  if (!members?.length) {
    return <span className="text-sm text-[var(--muted)]">暂无</span>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {members.map((member, index) => {
        const key = `${member.uid ?? "no-uid"}-${member.nickname}-${index}`;

        if (member.uid) {
          return (
            <Link
              key={key}
              href={`/players/${member.uid}`}
              className="border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-bright)] transition hover:bg-[var(--accent)]/10"
            >
              {member.nickname}
              <span className="ml-1 font-mono text-[10px] text-[var(--muted)]">
                {member.uid}
              </span>
            </Link>
          );
        }

        return (
          <span
            key={key}
            className="border border-[var(--border)] px-2 py-1 text-xs text-[var(--foreground)]/80"
          >
            {member.nickname}
          </span>
        );
      })}
    </div>
  );
}

function EventCard({ event }: { event: EventResult }) {
  return (
    <KuroPanel className="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
        <Link 
         href={`/events/${event.id}`}
         className="text-lg font-bold tracking-wide text-white transition hover:text-[var(--accent-bright)]"
        >
         {event.event_name}
        </Link>

          <p className="mt-1 text-xs tracking-[0.12em] text-[var(--muted)] uppercase">
            开赛时间：{event.event_date || "未记录"}
          </p>

          <div className="mt-5">
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">
              冠军成员
            </p>
            <EventMemberList members={event.champions ?? []} />
          </div>

          {event.sponsors?.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold tracking-[0.15em] text-[var(--accent)] uppercase">
                赞助者
              </p>
              <EventMemberList members={event.sponsors} />
            </div>
          )}
        </div>

        {event.poster_url && (
          <img
            src={event.poster_url}
            alt={`${event.event_name} 海报`}
            className="h-32 w-full border border-[var(--border)] object-cover sm:w-48"
          />
        )}
      </div>
    </KuroPanel>
  );
}

interface HistoryEventsProps {
  events: EventResult[];
  showHeader?: boolean;
  title?: string;
  description?: string;
  viewAllHref?: string;
}

export function HistoryEvents({
  events,
  showHeader = true,
  title = "历史比赛",
  description,
  viewAllHref,
}: HistoryEventsProps) {
  const isPreview = Boolean(viewAllHref);

  return (
    <section className={showHeader ? "mt-16" : undefined}>
      {showHeader && (
        <SectionHeader
          label="Events"
          title={title}
          description={description}
          action={
            viewAllHref ? (
              <Link
                href={viewAllHref}
                className="text-sm tracking-wide text-[var(--accent-bright)] transition hover:text-white"
              >
                查看完整赛事记录 →
              </Link>
            ) : undefined
          }
        />
      )}

      {events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : isPreview ? (
        <KuroPanel className="p-8 text-center text-sm text-[var(--muted)]">
          暂无赛事记录
        </KuroPanel>
      ) : (
        <KuroPanel className="p-8 text-center text-sm text-[var(--muted)]">
          暂无历史比赛数据
        </KuroPanel>
      )}
    </section>
  );
}
