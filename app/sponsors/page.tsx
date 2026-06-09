import Link from "next/link";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCommunityDate,
  getContentSummary,
  getPublishedSponsorPosts,
} from "@/lib/queries/community";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "赞助展示 | ASD Dota2 社区档案馆",
};

export default async function SponsorsPage() {
  const posts = await getPublishedSponsorPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader
        label="Sponsors"
        title="赞助展示"
        description="社区赞助与支持记录"
      />

      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((item) => (
            <Link key={item.id} href={`/sponsors/${item.id}`}>
              <KuroPanel className="group h-full p-6 transition hover:border-[var(--border-accent)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="section-label">Sponsor</p>
                  <span className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                    {formatCommunityDate(item.published_at)}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-white transition group-hover:text-[var(--accent-bright)]">
                  {item.title}
                </h2>
                {item.sponsor_name && (
                  <p className="mt-3 text-sm font-bold text-[var(--accent-bright)]">
                    {item.sponsor_name}
                  </p>
                )}
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {getContentSummary(item.content, 120)}
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
