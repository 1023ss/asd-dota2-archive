"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CaptainTeam {
  id: number;
  event_id: number;
  team_no: number | null;
  team_name: string | null;
  captain_uid: string | null;
  can_edit: boolean | null;
  event?: {
    id: number;
    event_name: string;
    event_date: string | null;
    event_type: string | null;
    status: string | null;
    allow_team_edit: boolean | null;
  } | null;
}

export default function CaptainEventsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const [teams, setTeams] = useState<CaptainTeam[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTeams() {
      const loginUid = window.localStorage.getItem("asd_uid");
      const loginCode = window.localStorage.getItem("asd_login_code");

      if (!loginUid || !loginCode) {
        router.push("/login");
        return;
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
        return;
      }

      setUid(loginUid);

      const { data, error } = await supabase
        .from("event_teams")
        .select(
          `
          id,
          event_id,
          team_no,
          team_name,
          captain_uid,
          can_edit,
          event:event_results_v2 (
            id,
            event_name,
            event_date,
            event_type,
            status,
            allow_team_edit
          )
        `
        )
        .eq("captain_uid", loginUid)
        .order("event_id", { ascending: false });

      if (error) {
        console.error(error);
        setErrorMessage("读取队长赛事失败，请检查 event_teams 和 event_results_v2 的关联。");
        setLoading(false);
        return;
      }

      setTeams((data || []) as unknown as CaptainTeam[]);
      setLoading(false);
    }

    loadTeams();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载你的队伍...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-24">
      <div className="mb-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Captain Center
        </p>

        <h1 className="text-3xl font-black text-white">我的队伍</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          当前登录 UID：{uid}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="border border-white/10 bg-black/40 p-6 text-sm text-[var(--muted)]">
          暂无你负责的队伍。请联系管理员在 event_teams 表里设置 captain_uid。
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => {
            const event = team.event;
            const canEdit =
              event?.allow_team_edit === true && team.can_edit === true;

            return (
              <div
                key={team.id}
                className="border border-white/10 bg-black/40 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
                      {event?.event_type || "weekly"}
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-white">
                      {event?.event_name || `比赛 ${team.event_id}`}
                    </h2>

                    <p className="mt-2 text-sm text-[var(--muted)]">
                      队伍：{team.team_name || `队伍${team.team_no || ""}`}
                    </p>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      状态：
                      {canEdit ? (
                        <span className="text-green-300">允许编辑</span>
                      ) : (
                        <span className="text-red-300">不可编辑</span>
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/captain/events/${team.event_id}/team`}
                    className="bg-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
                  >
                    编辑队伍
                  </Link>
                </div>
              </div>
            );
          })}
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