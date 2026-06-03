import { HistoryEvents } from "@/components/HistoryEvents";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getEventResults } from "@/lib/queries/event";
import { isSupabaseConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "历史比赛 | ASD Dota2 社区档案馆",
};

export default async function EventsPage() {
  const events = await getEventResults();
  const usingLocalData = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader
        label="Events"
        title="历史比赛"
        description={`社区赛事完整记录 · 共 ${events.length} 场`}
      />
      {usingLocalData && (
        <p className="mb-6 text-xs tracking-wide text-[var(--muted)]/70">
          配置 Supabase 后可从云端加载赛事数据
        </p>
      )}
      <HistoryEvents events={events} showHeader={false} />
    </div>
  );
}
