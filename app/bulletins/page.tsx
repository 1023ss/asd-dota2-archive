import Link from "next/link";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCommunityDate,
  getContentSummary,
  getPublishedBulletins,
} from "@/lib/queries/community";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "ASD 大字报 | ASD Dota2 社区档案馆",
};

export default async function BulletinsPage() {
  const bulletins = await getPublishedBulletins();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader
        label="Bulletins"
        title="ASD 大字报"
        description="社区公告与重要信息归档"
      />

      {bulletins.length > 0 ? (
        <div className="grid gap-4">
          {bulletins.map((item) => (
            <Link key={item.id} href={`/bulletins/${item.id}`}>
              <KuroPanel className="group p-6 transition hover:border-[var(--border-accent)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-label mb-3">Bulletin</p>
                    <h2 className="text-2xl font-black text-white transition group-hover:text-[var(--accent-bright)]">
                      {item.title}
                    </h2>
                  </div>
                  <span className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                    {formatCommunityDate(item.published_at)}
                  </span>
                </div>
                {item.subtitle && (
                  <p className="mt-3 text-sm text-[var(--foreground)]/75">
                    {item.subtitle}
                  </p>
                )}
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {getContentSummary(item.content, 140)}
                </p>
              </KuroPanel>
            </Link>
          ))}
        </div>
      ) : (
        <KuroPanel className="p-10 text-center text-sm text-[var(--muted)]">
          暂无内容
        </KuroPanel>
      )}
    </div>
  );
}
