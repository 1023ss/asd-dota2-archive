import Link from "next/link";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCommunityDate,
  getSponsorPostById,
} from "@/lib/queries/community";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SponsorDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SponsorDetailPageProps) {
  const { id } = await params;
  const sponsor = await getSponsorPostById(id);
  return {
    title: sponsor
      ? `${sponsor.title} | 赞助展示`
      : "赞助展示 | 暂无内容",
  };
}

export default async function SponsorDetailPage({
  params,
}: SponsorDetailPageProps) {
  const { id } = await params;
  const sponsor = await getSponsorPostById(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/sponsors"
        className="mb-8 inline-flex text-sm tracking-wide text-[var(--muted)] transition hover:text-[var(--accent-bright)]"
      >
        ← 返回赞助历史
      </Link>

      {sponsor ? (
        <>
          <SectionHeader
            label="Sponsor"
            title={sponsor.title}
            description={sponsor.sponsor_name ?? undefined}
          />
          <KuroPanel className="p-6 sm:p-8">
            <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
              {formatCommunityDate(sponsor.published_at)}
            </p>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-8 text-[var(--foreground)]/82">
              {sponsor.content || "暂无内容"}
            </div>
          </KuroPanel>
        </>
      ) : (
        <KuroPanel className="p-10 text-center text-sm text-[var(--muted)]">
          暂无内容
        </KuroPanel>
      )}
    </div>
  );
}
