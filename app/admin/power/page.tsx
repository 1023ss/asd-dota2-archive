"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getCalculatedPowerRowsForUsers,
  type PowerBreakdown,
} from "@/lib/queries/power";

interface AdminUser {
  uid: string;
  nickname: string | null;
  role: string | null;
}

interface PowerAdminRow extends PowerBreakdown {
  is_new_player: boolean;
}

type SortMode = "uid" | "final_power";

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

function parseNumberInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdminPowerPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState<PowerAdminRow[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("uid");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function checkAdmin() {
    const loginUid = window.localStorage.getItem("asd_uid");
    const loginCode = window.localStorage.getItem("asd_login_code");

    if (!loginUid || !loginCode) {
      router.push("/login");
      return null;
    }

    const { data: codeRow, error: codeError } = await supabase
      .from("registration_codes")
      .select("uid,code,login_enabled")
      .eq("uid", loginUid)
      .eq("code", loginCode)
      .single();

    if (codeError || !codeRow || codeRow.login_enabled === false) {
      window.localStorage.removeItem("asd_uid");
      window.localStorage.removeItem("asd_login_code");
      router.push("/login");
      return null;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("uid,nickname,role")
      .eq("uid", loginUid)
      .single();

    if (userError || !user || !isAdminRole(user.role)) {
      setErrorMessage("你不是管理员，无法访问战力管理。");
      return null;
    }

    return user as AdminUser;
  }

  async function loadRows() {
    const calculatedRows = await getCalculatedPowerRowsForUsers(supabase);
    setRows(
      calculatedRows.map((row) => ({
        ...row,
        is_new_player:
          row.newcomer_bonus > 0 ||
          (row.newcomer_bonus === 0 && row.final_power !== row.base_power),
      }))
    );

    const { data: users, error } = await supabase
      .from("users")
      .select("uid,is_new_player");

    if (error) {
      console.error(error);
      setErrorMessage("读取新人标记失败，战力数据已显示但新人勾选可能不完整。");
      return;
    }

    const newPlayerMap = new Map(
      (users ?? []).map((user) => [
        String(user.uid).trim().toUpperCase(),
        Boolean(user.is_new_player),
      ])
    );

    setRows((current) =>
      current.map((row) => ({
        ...row,
        is_new_player: newPlayerMap.get(row.uid) ?? false,
      }))
    );
  }

  async function loadPage() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const admin = await checkAdmin();
    if (!admin) {
      setLoading(false);
      return;
    }

    setAdminUser(admin);

    try {
      await loadRows();
    } catch (error) {
      console.error(error);
      setErrorMessage("读取战力数据失败，请稍后再试。");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = keyword
      ? rows.filter(
          (row) =>
            row.uid.toLowerCase().includes(keyword) ||
            row.nickname.toLowerCase().includes(keyword)
        )
      : rows;

    return [...filtered].sort((a, b) => {
      if (sortMode === "final_power") {
        return b.final_power - a.final_power || a.uid.localeCompare(b.uid, "zh-CN");
      }

      return a.uid.localeCompare(b.uid, "zh-CN");
    });
  }, [query, rows, sortMode]);

  function updateRow(uid: string, patch: Partial<PowerAdminRow>) {
    setRows((current) =>
      current.map((row) => (row.uid === uid ? { ...row, ...patch } : row))
    );
  }

  async function saveRow(row: PowerAdminRow) {
    setSavingUid(row.uid);
    setMessage("");
    setErrorMessage("");

    const now = new Date().toISOString();

    try {
      const { error: powerError } = await supabase.from("power_records").upsert(
        {
          uid: row.uid,
          base_power: Number(row.base_power) || 0,
          updated_at: now,
        },
        { onConflict: "uid" }
      );

      if (powerError) {
        console.error(powerError);
        setErrorMessage(`保存 ${row.uid} 的基础战力失败。`);
        setSavingUid("");
        return;
      }

      const { error: userError } = await supabase
        .from("users")
        .update({
          is_new_player: Boolean(row.is_new_player),
          legacy_champion_bonus: Number(row.legacy_champion_bonus) || 0,
        })
        .eq("uid", row.uid);

      if (userError) {
        console.error(userError);
        setErrorMessage(`保存 ${row.uid} 的玩家标记失败。`);
        setSavingUid("");
        return;
      }

      await loadRows();
      setMessage(`${row.uid} 战力资料已保存。`);
    } catch (error) {
      console.error(error);
      setErrorMessage(`保存 ${row.uid} 失败，请稍后再试。`);
    }

    setSavingUid("");
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载战力管理...</p>
      </main>
    );
  }

  if (errorMessage && !adminUser) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-300">
          {errorMessage}
        </div>

        <div className="mt-6">
          <Link href="/me" className="text-[var(--accent)] hover:underline">
            返回个人中心
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-24">
      <div className="mb-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          Admin Power
        </p>

        <h1 className="text-3xl font-black text-white">战力管理</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          当前管理员：{adminUser?.nickname || adminUser?.uid}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="mb-6 border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <section className="border border-white/10 bg-black/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">玩家战力列表</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              基础战力、新人标记和历史冠军加成可编辑，其余加成由新版公式自动计算。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,320px)_180px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 UID / 昵称"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
            />

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
            >
              <option value="uid">按 UID 排序</option>
              <option value="final_power">按最终战力排序</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead className="border-y border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3">UID</th>
                <th className="px-3 py-3">昵称</th>
                <th className="px-3 py-3">基础战力</th>
                <th className="px-3 py-3">新人</th>
                <th className="px-3 py-3">历史冠军</th>
                <th className="px-3 py-3">活跃修正</th>
                <th className="px-3 py-3">新人加成</th>
                <th className="px-3 py-3">自动冠军</th>
                <th className="px-3 py-3">最终战力</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.uid}
                  className="border-b border-white/10 transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3 font-mono text-white">{row.uid}</td>
                  <td className="px-3 py-3 text-white">{row.nickname || "-"}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.base_power}
                      onChange={(event) =>
                        updateRow(row.uid, {
                          base_power: parseNumberInput(event.target.value),
                        })
                      }
                      className="w-24 border border-white/10 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-[var(--accent)]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <label className="inline-flex items-center gap-2 text-white">
                      <input
                        type="checkbox"
                        checked={row.is_new_player}
                        onChange={(event) =>
                          updateRow(row.uid, {
                            is_new_player: event.target.checked,
                          })
                        }
                      />
                      <span>{row.is_new_player ? "是" : "否"}</span>
                    </label>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.legacy_champion_bonus}
                      onChange={(event) =>
                        updateRow(row.uid, {
                          legacy_champion_bonus: parseNumberInput(
                            event.target.value
                          ),
                        })
                      }
                      className="w-24 border border-white/10 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-[var(--accent)]"
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-[var(--muted)]">
                    {row.active_adjustment}
                  </td>
                  <td className="px-3 py-3 font-mono text-[var(--muted)]">
                    {row.newcomer_bonus}
                  </td>
                  <td className="px-3 py-3 font-mono text-[var(--muted)]">
                    {row.auto_champion_bonus}
                  </td>
                  <td className="px-3 py-3 font-mono text-lg font-black text-white">
                    {row.final_power}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={savingUid === row.uid}
                      onClick={() => saveRow(row)}
                      className="bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingUid === row.uid ? "保存中..." : "保存"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleRows.length === 0 && (
          <div className="mt-5 border border-white/10 bg-black/40 p-5 text-sm text-[var(--muted)]">
            没有匹配的玩家。
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/admin/events"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          返回赛事管理
        </Link>

        <Link href="/me" className="text-sm text-[var(--accent)] hover:underline">
          返回个人中心
        </Link>
      </div>
    </main>
  );
}
