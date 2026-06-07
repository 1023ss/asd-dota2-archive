"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
}

interface TeamRow {
  id: number;
  event_id: number;
  team_no: number | null;
  team_name: string | null;
  captain_uid: string | null;
  can_edit: boolean | null;
  total_power: number | null;
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

export default function AdminEventTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const eventId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [eventInfo, setEventInfo] = useState<EventRow | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);

  const [allowTeamEdit, setAllowTeamEdit] = useState(false);
  const [status, setStatus] = useState("draft");

  const [newTeamNo, setNewTeamNo] = useState("");
  const [newCaptainUid, setNewCaptainUid] = useState("");
  const [newCanEdit, setNewCanEdit] = useState(true);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function checkAdmin() {
    const uid = window.localStorage.getItem("asd_uid");
    const loginCode = window.localStorage.getItem("asd_login_code");

    if (!uid || !loginCode) {
      router.push("/login");
      return null;
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
      return null;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("uid,nickname,role")
      .eq("uid", uid)
      .single();

    if (userError || !user || user.role !== "admin") {
      setErrorMessage("你不是管理员，无法访问后台。");
      return null;
    }

    return user as AdminUser;
  }

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    const admin = await checkAdmin();

    if (!admin) {
      setLoading(false);
      return;
    }

    setAdminUser(admin);

    const { data: eventData, error: eventError } = await supabase
      .from("event_results_v2")
      .select("id,event_name,event_date,event_type,status,allow_team_edit")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      setErrorMessage("没有找到该比赛。");
      setLoading(false);
      return;
    }

    setEventInfo(eventData as EventRow);
    setAllowTeamEdit(Boolean(eventData.allow_team_edit));
    setStatus(eventData.status || "draft");

    const { data: teamData, error: teamError } = await supabase
      .from("event_teams")
      .select("id,event_id,team_no,team_name,captain_uid,can_edit,total_power")
      .eq("event_id", eventId)
      .order("team_no", { ascending: true })
      .order("id", { ascending: true });

    if (teamError) {
      console.error(teamError);
      setErrorMessage("读取队伍失败。");
      setLoading(false);
      return;
    }

    setTeams((teamData || []) as TeamRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!Number.isNaN(eventId)) {
      loadPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleSaveEventSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingEvent(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("event_results_v2")
      .update({
        allow_team_edit: allowTeamEdit,
        status,
      })
      .eq("id", eventId);

    if (error) {
      console.error(error);
      setErrorMessage("保存比赛设置失败。");
      setSavingEvent(false);
      return;
    }

    setMessage("比赛设置已保存。");
    setSavingEvent(false);
    loadPage();
  }

  async function handleAddTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAddingTeam(true);
    setMessage("");
    setErrorMessage("");

    const teamNo =
      Number(newTeamNo) ||
      Math.max(0, ...teams.map((team) => team.team_no || 0)) + 1;

    const captainUid = newCaptainUid.trim().toUpperCase();

    if (!captainUid) {
      setErrorMessage("请填写队长 UID。");
      setAddingTeam(false);
      return;
    }

    const { data: captain, error: captainError } = await supabase
      .from("users")
      .select("uid,nickname")
      .eq("uid", captainUid)
      .single();

    if (captainError || !captain) {
      setErrorMessage(`没有找到队长 UID：${captainUid}`);
      setAddingTeam(false);
      return;
    }

    const { error } = await supabase.from("event_teams").insert({
      event_id: eventId,
      team_no: teamNo,
      team_name: `队伍${teamNo}`,
      captain_uid: captainUid,
      can_edit: newCanEdit,
      total_power: 0,
    });

    if (error) {
      console.error(error);
      setErrorMessage("添加队伍失败。");
      setAddingTeam(false);
      return;
    }

    setMessage(`已添加 队伍${teamNo}，队长 ${captainUid}。`);
    setNewTeamNo("");
    setNewCaptainUid("");
    setNewCanEdit(true);
    setAddingTeam(false);
    loadPage();
  }

  async function updateTeam(teamId: number, patch: Partial<TeamRow>) {
    setMessage("");
    setErrorMessage("");

    const updateData: Record<string, unknown> = {};

    if ("team_name" in patch) {
      updateData.team_name = patch.team_name;
    }

    if ("captain_uid" in patch) {
      const captainUid = (patch.captain_uid || "").trim().toUpperCase();

      if (!captainUid) {
        setErrorMessage("队长 UID 不能为空。");
        return;
      }

      const { data: captain, error: captainError } = await supabase
        .from("users")
        .select("uid")
        .eq("uid", captainUid)
        .single();

      if (captainError || !captain) {
        setErrorMessage(`没有找到队长 UID：${captainUid}`);
        return;
      }

      updateData.captain_uid = captainUid;
    }

    if ("can_edit" in patch) {
      updateData.can_edit = patch.can_edit;
    }

    const { error } = await supabase
      .from("event_teams")
      .update(updateData)
      .eq("id", teamId);

    if (error) {
      console.error(error);
      setErrorMessage("更新队伍失败。");
      return;
    }

    setMessage("队伍已更新。");
    loadPage();
  }

  async function deleteTeam(teamId: number) {
    const confirmed = window.confirm(
      "确定删除这支队伍吗？这会同时删除该队伍的成员记录。"
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    await supabase.from("event_team_members").delete().eq("team_id", teamId);

    const { error } = await supabase.from("event_teams").delete().eq("id", teamId);

    if (error) {
      console.error(error);
      setErrorMessage("删除队伍失败。");
      return;
    }

    setMessage("队伍已删除。");
    loadPage();
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载队伍管理...</p>
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
          Admin Teams
        </p>

        <h1 className="text-3xl font-black text-white">队伍管理</h1>

        {eventInfo && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {eventInfo.event_name} ｜ {formatEventType(eventInfo.event_type)} ｜ ID：
            {eventInfo.id}
          </p>
        )}
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

      <form
        onSubmit={handleSaveEventSettings}
        className="mb-6 border border-white/10 bg-black/40 p-5"
      >
        <h2 className="text-xl font-black text-white">比赛设置</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-white">比赛状态</span>
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
          </label>

          <label className="flex items-center gap-3 border border-white/10 bg-black/40 px-4 py-3">
            <input
              type="checkbox"
              checked={allowTeamEdit}
              onChange={(event) => setAllowTeamEdit(event.target.checked)}
            />
            <span className="text-sm text-white">允许队长编辑队伍</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={savingEvent}
          className="mt-5 bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {savingEvent ? "保存中..." : "保存比赛设置"}
        </button>
      </form>

      <form
        onSubmit={handleAddTeam}
        className="mb-6 border border-white/10 bg-black/40 p-5"
      >
        <h2 className="text-xl font-black text-white">添加队伍坑位</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr_180px]">
          <input
            value={newTeamNo}
            onChange={(event) =>
              setNewTeamNo(event.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="队伍序号"
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          />

          <input
            value={newCaptainUid}
            onChange={(event) => setNewCaptainUid(event.target.value)}
            placeholder="队长 UID，例如 AS006"
            className="w-full border border-white/10 bg-black/60 px-4 py-3 font-mono text-white outline-none focus:border-[var(--accent)]"
          />

          <label className="flex items-center gap-3 border border-white/10 bg-black/40 px-4 py-3">
            <input
              type="checkbox"
              checked={newCanEdit}
              onChange={(event) => setNewCanEdit(event.target.checked)}
            />
            <span className="text-sm text-white">允许编辑</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={addingTeam}
          className="mt-5 bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {addingTeam ? "添加中..." : "添加队伍"}
        </button>
      </form>

      <section className="border border-white/10 bg-black/40 p-5">
        <h2 className="text-xl font-black text-white">当前队伍</h2>

        {teams.length === 0 ? (
          <div className="mt-5 border border-white/10 bg-black/40 p-5 text-sm text-[var(--muted)]">
            暂无队伍。
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="grid gap-3 border border-white/10 bg-black/40 p-4 lg:grid-cols-[100px_1fr_180px_120px_120px_120px]"
              >
                <div>
                  <p className="text-xs text-[var(--muted)]">序号</p>
                  <p className="font-mono text-white">{team.team_no || "-"}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-[var(--muted)]">队伍名</p>
                  <input
                    defaultValue={team.team_name || ""}
                    onBlur={(event) =>
                      updateTeam(team.id, { team_name: event.target.value })
                    }
                    className="w-full border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs text-[var(--muted)]">队长 UID</p>
                  <input
                    defaultValue={team.captain_uid || ""}
                    onBlur={(event) =>
                      updateTeam(team.id, { captain_uid: event.target.value })
                    }
                    className="w-full border border-white/10 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)]">总战力</p>
                  <p className="font-mono text-xl font-black text-white">
                    {team.total_power ?? 0}
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(team.can_edit)}
                    onChange={(event) =>
                      updateTeam(team.id, { can_edit: event.target.checked })
                    }
                  />
                  <span className="text-sm text-white">可编辑</span>
                </label>

                <button
                  type="button"
                  onClick={() => deleteTeam(team.id)}
                  className="border border-red-500/40 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex gap-4">
        <Link href="/admin/events" className="text-sm text-[var(--accent)] hover:underline">
          返回赛事管理
        </Link>

        <Link href={`/events/${eventId}`} className="text-sm text-[var(--accent)] hover:underline">
          查看前台详情
        </Link>
      </div>
    </main>
  );
}