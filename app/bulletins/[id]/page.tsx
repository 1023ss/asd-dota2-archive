import Link from "next/link";
import { KuroPanel } from "@/components/ui/KuroPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCommunityDate,
  getBulletinById,
} from "@/lib/queries/community";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BulletinDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BulletinDetailPageProps) {
  const { id } = await params;
  const bulletin = await getBulletinById(id);
  return {
    title: bulletin
      ? `${bulletin.title} | ASD 大字报`
      : "ASD 大字报 | 暂无内容",
  };
}

export default async function BulletinDetailPage({
  params,
}: BulletinDetailPageProps) {
  const { id } = await params;
  const bulletin = await getBulletinById(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/bulletins"
        className="mb-8 inline-flex text-sm tracking-wide text-[var(--muted)] transition hover:text-[var(--accent-bright)]"
      >
        ← 返回大字报历史
      </Link>

      {bulletin ? (
        <>
          <SectionHeader
            label="Bulletin"
            title={bulletin.title}
            description={bulletin.subtitle ?? undefined}
          />
          <KuroPanel className="p-6 sm:p-8">
            <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
              {formatCommunityDate(bulletin.published_at)}
            </p>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-8 text-[var(--foreground)]/82">
              {bulletin.content || "暂无内容"}
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
