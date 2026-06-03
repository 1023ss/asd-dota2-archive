import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="section-label mb-4 justify-center">Not Found</p>
      <h1 className="text-2xl font-bold text-white">玩家未找到</h1>
      <p className="mt-3 text-[var(--muted)]">该 UID 在社区档案中不存在。</p>
      <Link href="/leaderboard" className="btn-ghost mt-8 inline-flex">
        返回排行榜
      </Link>
    </div>
  );
}
