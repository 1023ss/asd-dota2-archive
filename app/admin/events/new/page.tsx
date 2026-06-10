"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AdminUser {
  uid: string;
  nickname: string | null;
  role: string | null;
}

export default function AdminNewEventPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("weekly");
  const [status, setStatus] = useState("draft");
  const [allowTeamEdit, setAllowTeamEdit] = useState(false);
  const [posterUrl, setPosterUrl] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      setChecking(true);
      setErrorMessage("");

      const uid = window.localStorage.getItem("asd_uid");
      const loginCode = window.localStorage.getItem("asd_login_code");

      if (!uid || !loginCode) {
        router.push("/login");
        return;
      }

      const { data: codeRow, error: codeError } = await supabase
        .from("registration_codes")
        .select("uid,code,login_enabled")
        .eq("uid", uid)
        .eq("code", loginCode)
        .single();

      if (codeError || !codeRow || codeRow.login_enabled === false) {
        window.localStorage.removeItem("asd_uid");
        window.localStorage.removeItem("asd_login_code");
        router.push("/login");
        return;
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("uid,nickname,role")
        .eq("uid", uid)
        .single();

      if (userError || !user) {
        setErrorMessage("没有找到当前登录用户。");
        setChecking(false);
        return;
      }

      if (user.role !== "admin") {
        setErrorMessage("你不是管理员，无法新建比赛。");
        setChecking(false);
        return;
      }

      setAdminUser(user as AdminUser);
      setChecking(false);
    }

    checkAdmin();
  }, [router, supabase]);

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setErrorMessage("");

    const cleanName = eventName.trim();
    const cleanPosterUrl = posterUrl.trim();

    if (!cleanName) {
      setErrorMessage("请填写比赛名称。");
      setCreating(false);
      return;
    }

    const insertData = {
      event_name: cleanName,
      event_date: eventDate || null,
      event_type: eventType,
      status,
      allow_team_edit: allowTeamEdit,
      poster_url: cleanPosterUrl || null,
      champions: [],
      sponsors: [],
    };

    const { data, error } = await supabase
      .from("event_results_v2")
      .insert(insertData)
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      setErrorMessage("新建比赛失败，请检查 event_results_v2 字段是否完整。");
      setCreating(false);
      return;
    }

    router.push(`/admin/events/${data.id}/teams`);
    router.refresh();
  }

  if (checking) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <p className="text-[var(--muted)]">正在检查管理员权限...</p>
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
          <Link href="/admin/events" className="text-[var(--accent)] hover:underline">
            返回赛事管理
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
      <div className="mb-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          New Event
        </p>

        <h1 className="text-3xl font-black text-white">新建比赛</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          当前管理员：{adminUser?.nickname || adminUser?.uid}
        </p>
      </div>

      <form
        onSubmit={handleCreateEvent}
        className="border border-white/10 bg-black/40 p-6 shadow-2xl"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white">比赛名称</label>
            <input
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              placeholder="例如 2026/6周赛 I"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">比赛日期</label>
            <input
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              type="date"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">比赛类型</label>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            >
              <option value="daily">日赛</option>
              <option value="weekly">周赛</option>
              <option value="monthly">月赛</option>
              <option value="special">特殊比赛</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">比赛状态</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            >
              <option value="draft">draft 草稿</option>
              <option value="open">open 开放填写</option>
              <option value="locked">locked 锁定</option>
              <option value="playing">playing 比赛中</option>
              <option value="finished">finished 已结束</option>
              <option value="archived">archived 已归档</option>
            </select>
          </div>

          <label className="flex items-center gap-3 border border-white/10 bg-black/40 px-4 py-3">
            <input
              type="checkbox"
              checked={allowTeamEdit}
              onChange={(event) => setAllowTeamEdit(event.target.checked)}
            />
            <span className="text-sm text-white">创建后允许队长编辑队伍</span>
          </label>

          <div>
            <label className="mb-2 block text-sm text-white">海报 URL，可选</label>
            <input
              value={posterUrl}
              onChange={(event) => setPosterUrl(event.target.value)}
              placeholder="例如 /images/events/poster.jpg 或 https://..."
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          className="mt-6 w-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "创建中..." : "创建比赛并管理队伍"}
        </button>
      </form>

      <div className="mt-8">
        <Link href="/admin/events" className="text-sm text-[var(--accent)] hover:underline">
          返回赛事管理
        </Link>
      </div>
    </main>
  );
}
