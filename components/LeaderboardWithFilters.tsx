"use client";

import { useMemo, useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { KuroPanel } from "@/components/ui/KuroPanel";
import type { Player } from "@/types/player";

interface LeaderboardWithFiltersProps {
  players: Player[];
}

function parsePositionParts(position: string | null): string[] {
  if (!position?.trim()) return [];
  return position
    .split(/[,，]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function collectPositionOptions(players: Player[]): string[] {
  const set = new Set<string>();
  for (const player of players) {
    for (const part of parsePositionParts(player.position)) {
      set.add(part);
    }
  }
  return Array.from(set).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, "zh-CN");
  });
}

function matchesUid(player: Player, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    player.uid.toLowerCase().includes(q) ||
    (player.nickname ?? "").toLowerCase().includes(q)
  );
}

/** 未选任何位置 = 全部；已选则玩家需包含其中任一位置 */
function matchesPositions(player: Player, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const parts = parsePositionParts(player.position);
  return filters.some((f) => parts.includes(f));
}

function matchesPower(
  power: number | null | undefined,
  minRaw: string,
  maxRaw: string
): boolean {
  const hasMin = minRaw.trim() !== "";
  const hasMax = maxRaw.trim() !== "";
  if (!hasMin && !hasMax) return true;
  if (power == null) return false;

  const min = hasMin ? Number(minRaw) : -Infinity;
  const max = hasMax ? Number(maxRaw) : Infinity;
  if (Number.isNaN(min) || Number.isNaN(max)) return true;
  return power >= min && power <= max;
}

const fieldClass =
  "w-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40";

const fieldClassCompact =
  "w-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-2 text-sm text-white outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40";

const labelClass =
  "mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-[var(--muted)] uppercase";

type FilterState = {
  uidQuery: string;
  positionFilters: string[];
  powerMin: string;
  powerMax: string;
};

const emptyFilters: FilterState = {
  uidQuery: "",
  positionFilters: [],
  powerMin: "",
  powerMax: "",
};

function hasActiveFilters(f: FilterState) {
  return (
    f.uidQuery.trim() !== "" ||
    f.positionFilters.length > 0 ||
    f.powerMin.trim() !== "" ||
    f.powerMax.trim() !== ""
  );
}

export function LeaderboardWithFilters({ players }: LeaderboardWithFiltersProps) {
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);

  const positionOptions = useMemo(
    () => collectPositionOptions(players),
    [players]
  );

  const filtered = useMemo(() => {
    return players.filter(
      (p) =>
        matchesUid(p, applied.uidQuery) &&
        matchesPositions(p, applied.positionFilters) &&
        matchesPower(p.current_power, applied.powerMin, applied.powerMax)
    );
  }, [players, applied]);

  const filtersActive = hasActiveFilters(applied);

  function applyFilters() {
    setApplied({ ...draft });
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function toggleDraftPosition(pos: string) {
    setDraft((d) => {
      const selected = d.positionFilters.includes(pos);
      return {
        ...d,
        positionFilters: selected
          ? d.positionFilters.filter((p) => p !== pos)
          : [...d.positionFilters, pos],
      };
    });
  }

  return (
    <div className="space-y-6">
      <KuroPanel className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-xs tracking-[0.12em] text-[var(--muted)] uppercase">
            筛选条件
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs tracking-wide text-[var(--accent-bright)] transition hover:text-white"
            >
              清除筛选
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4 lg:flex-nowrap">
            <div className="w-[13rem] shrink-0">
              <label htmlFor="filter-uid" className={labelClass}>
                UID / 昵称
              </label>
              <input
                id="filter-uid"
                type="search"
                value={draft.uidQuery}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, uidQuery: e.target.value }))
                }
                placeholder="例如 AS102"
                className={fieldClassCompact}
                autoComplete="off"
              />
            </div>

            <div className="flex min-w-[14rem] flex-1 flex-col items-center px-2 sm:px-4">
              <span
                id="filter-position-label"
                className={`${labelClass} text-center`}
              >
                位置（可多选）
              </span>
              <div
                role="group"
                aria-labelledby="filter-position-label"
                className="flex flex-wrap justify-center gap-2"
              >
                {positionOptions.map((pos) => {
                  const selected = draft.positionFilters.includes(pos);
                  return (
                    <label
                      key={pos}
                      className={`inline-flex min-w-[2.25rem] cursor-pointer items-center justify-center gap-1 border px-3 py-1.5 text-xs transition ${
                        selected
                          ? "border-[var(--accent)] bg-[rgba(214,40,40,0.15)] text-white"
                          : "border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--muted)] hover:border-[var(--border-accent)] hover:text-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => toggleDraftPosition(pos)}
                      />
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          selected
                            ? "bg-[var(--accent-bright)]"
                            : "bg-[var(--border)]"
                        }`}
                        aria-hidden
                      />
                      {pos}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex shrink-0 items-end gap-2.5">
              <div className="w-[6.75rem]">
                <label htmlFor="filter-power-min" className={labelClass}>
                  下限 ≥
                </label>
                <input
                  id="filter-power-min"
                  type="number"
                  inputMode="numeric"
                  value={draft.powerMin}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, powerMin: e.target.value }))
                  }
                  placeholder="最低"
                  className={fieldClassCompact}
                />
              </div>
              <div className="w-[6.75rem]">
                <label htmlFor="filter-power-max" className={labelClass}>
                  上限 ≤
                </label>
                <input
                  id="filter-power-max"
                  type="number"
                  inputMode="numeric"
                  value={draft.powerMax}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, powerMax: e.target.value }))
                  }
                  placeholder="最高"
                  className={fieldClassCompact}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-primary--sm shrink-0"
            >
              搜索
            </button>
          </div>

          <p className="mt-3 text-[10px] text-[var(--muted)]">
            填写条件后点击搜索生效 · 不选位置表示全部
          </p>
        </form>

        <p className="mt-4 text-sm text-[var(--muted)]">
          {filtersActive ? (
            <>
              显示{" "}
              <span className="font-mono text-[var(--accent-bright)]">
                {filtered.length}
              </span>{" "}
              / {players.length} 名玩家
            </>
          ) : (
            <>共 {players.length} 名玩家</>
          )}
        </p>
      </KuroPanel>

      {filtered.length > 0 ? (
        <LeaderboardTable players={filtered} />
      ) : filtersActive ? (
        <KuroPanel className="p-10 text-center text-sm text-[var(--muted)]">
          没有符合筛选条件的玩家，请调整条件或
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 text-[var(--accent-bright)] hover:underline"
          >
            清除筛选
          </button>
        </KuroPanel>
      ) : (
        <LeaderboardTable players={players} />
      )}
    </div>
  );
}
