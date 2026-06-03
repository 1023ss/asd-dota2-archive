import Link from "next/link";
import type { Player } from "@/types/player";
import { PlayerTag } from "@/components/PlayerTag";
import { KuroPanel } from "@/components/ui/KuroPanel";

interface LeaderboardTableProps {
  players: Player[];
  showAll?: boolean;
  /** power：战力排行；activity：活跃值排行 */
  variant?: "power" | "activity";
}

function rankClass(rank: number) {
  if (rank === 1) return "rank-1";
  if (rank === 2) return "rank-2";
  if (rank === 3) return "rank-3";
  return "rank-default";
}

export function LeaderboardTable({
  players,
  showAll = true,
  variant = "power",
}: LeaderboardTableProps) {
  const isActivity = variant === "activity";
  const list = showAll ? players : players.slice(0, 10);

  return (
    <KuroPanel className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[rgba(214,40,40,0.04)] text-[10px] font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
            <th className="px-5 py-3.5 font-medium">排名</th>
            <th className="px-5 py-3.5 font-medium">玩家</th>
            <th className="hidden px-5 py-3.5 font-medium sm:table-cell">
              UID
            </th>
            <th className="hidden px-5 py-3.5 font-medium md:table-cell">
              位置
            </th>
            <th className="px-5 py-3.5 text-right font-medium">活跃值</th>
            <th className="px-5 py-3.5 text-right font-medium">战力</th>
          </tr>
        </thead>
        <tbody>
          {list.map((player, index) => {
            const rank = index + 1;
            return (
              <tr
                key={player.uid}
                className="table-row-hover border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center text-xs font-bold ${rankClass(rank)}`}
                    style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                  >
                    {rank}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/players/${encodeURIComponent(player.uid)}`}
                      className="font-medium text-white transition hover:text-[var(--accent-bright)]"
                    >
                      {player.nickname || player.uid}
                    </Link>
                    {player.tag && (
                      <PlayerTag tag={player.tag} size="compact" />
                    )}
                    {!player.tag && (
                      <span className="border border-[var(--border)] px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
                        无 tag
                      </span>
                    )}
                    {player.is_new_player && (
                      <span className="border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] tracking-wider text-emerald-400">
                        NEW
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-5 py-3.5 font-mono text-xs text-[var(--muted)] sm:table-cell">
                  {player.uid}
                </td>
                <td className="hidden px-5 py-3.5 text-[var(--foreground)]/70 md:table-cell">
                  {player.position || "—"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`font-mono text-lg font-bold ${
                      isActivity ? "text-white" : "text-[var(--foreground)]/85"
                    }`}
                  >
                    {player.event_activity ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-mono text-lg font-bold text-[var(--accent-bright)]">
                    {player.current_power ?? "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </KuroPanel>
  );
}
