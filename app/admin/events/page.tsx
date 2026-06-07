"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AdminUser {
  uid: string;
  nickname: string | null;
  role: string | null;
}

interface EventRow {
  id: number;
  event_name: string;
  event_date: string | null;
  event_type: string | null;
  status: string | null;
  allow_team_edit: boolean | null;
  submit_deadline: string | null;
}

function formatEventType(type: string | null) {
  switch (type) {
    case "daily":
      return "日赛";
    case "weekly":
      return "周赛";
    case "monthly":
      return "月赛";
    case "special":
      return "特殊比赛";
    default:
      return "未分类";
  }
}

export default function AdminEventsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
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
        setLoading(false);
        return;
      }

      if (user.role !== "admin") {
        setErrorMessage("你不是管理员，无法访问后台。");
        setLoading(false);
        return;
      }

      setAdminUser(user as AdminUser);

      const { data, error } = await supabase
        .from("event_results_v2")
        .select("id,event_name,event_date,event_type,status,allow_team_edit,submit_deadline")
        .order("event_date", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        console.error(error);
        setErrorMessage("读取赛事列表失败。");
        setLoading(false);
        return;
      }

      setEvents((data || []) as EventRow[]);
      setLoading(false);
    }

    loadPage();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载管理员后台...</p>
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
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-24">
      <div className="mb-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Admin Center
        </p>

        <h1 className="text-3xl font-black text-white">赛事管理</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          当前管理员：{adminUser?.nickname || adminUser?.uid}
        </p>
        <div className="mt-5">
        <Link
            href="/admin/events/new"
            className="inline-block bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
        >
            + 新建比赛
        </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {events.length === 0 ? (
        <div className="border border-white/10 bg-black/40 p-6 text-sm text-[var(--muted)]">
          暂无赛事数据。
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-white/10 bg-black/40 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
                    {formatEventType(event.event_type)}
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-white">
                    {event.event_name}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    <span>ID：{event.id}</span>
                    {event.event_date && <span>日期：{event.event_date}</span>}
                    <span>状态：{event.status || "draft"}</span>
                    <span>
                      队长编辑：
                      {event.allow_team_edit ? (
                        <span className="text-green-300">开启</span>
                      ) : (
                        <span className="text-red-300">关闭</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/events/${event.id}`}
                    className="border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    查看前台
                  </Link>

                  <Link
                    href={`/admin/events/${event.id}/teams`}
                    className="bg-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
                  >
                    管理队伍
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/me" className="text-sm text-[var(--accent)] hover:underline">
          返回个人中心
        </Link>
      </div>
    </main>
  );
}