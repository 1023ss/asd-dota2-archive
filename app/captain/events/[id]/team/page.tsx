"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface EventInfo {
  id: number;
  event_name: string;
  event_date: string | null;
  event_type: string | null;
  status: string | null;
  allow_team_edit: boolean | null;
}

interface TeamInfo {
  id: number;
  event_id: number;
  team_no: number | null;
  team_name: string | null;
  captain_uid: string | null;
  can_edit: boolean | null;
  total_power: number | null;
}

interface TeamMember {
  id: number;
  uid: string | null;
  nickname: string | null;
  power: number | null;
}

interface PlayerRow {
  uid: string;
  nickname: string | null;
}

interface PowerRow {
  uid: string;
  final_power: number;
  active_adjustment: number;
}

interface PowerReference {
  power: number;
  label: string;
}

function formatPowerReference(row: PowerRow): PowerReference {
  const restoredActiveAdjustment = Math.max(
    0,
    -Number(row.active_adjustment || 0)
  );

  return {
    power: row.final_power,
    label:
      restoredActiveAdjustment > 0
        ? `${row.final_power} +${restoredActiveAdjustment}`
        : String(row.final_power),
  };
}

export default function CaptainTeamEditPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const eventId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loginUid, setLoginUid] = useState("");
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);

  const [teamName, setTeamName] = useState("");
  const [memberUids, setMemberUids] = useState(["", "", "", "", ""]);
  const [memberPowers, setMemberPowers] = useState(["", "", "", "", ""]);
  const [memberReferencePowers, setMemberReferencePowers] = useState([
    "",
    "",
    "",
    "",
    "",
  ]);
  const [memberPowerTouched, setMemberPowerTouched] = useState([
    false,
    false,
    false,
    false,
    false,
  ]);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalPower = memberPowers.reduce((sum, value) => {
    const power = Number(value || 0);
    return sum + (Number.isNaN(power) ? 0 : power);
  }, 0);

  const loadPowerMap = useCallback(async (uids: string[]) => {
    const cleanUids = Array.from(new Set(uids.map((uid) => uid.trim().toUpperCase()).filter(Boolean)));
    if (cleanUids.length === 0) return new Map<string, PowerReference>();

    try {
      const response = await fetch(
        `/api/power?uids=${encodeURIComponent(cleanUids.join(","))}`,
        { cache: "no-store" }
      );
      if (!response.ok) return new Map<string, PowerReference>();

      const payload = await response.json();
      return new Map(
        ((payload.rows ?? []) as PowerRow[]).map((row) => [
          row.uid,
          formatPowerReference(row),
        ])
      );
    } catch (error) {
      console.error("load power map:", error);
      return new Map<string, PowerReference>();
    }
  }, []);

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

      setLoginUid(uid);

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

      setEventInfo(eventData as EventInfo);

      const { data: teamData, error: teamError } = await supabase
        .from("event_teams")
        .select(
          "id,event_id,team_no,team_name,captain_uid,can_edit,total_power"
        )
        .eq("event_id", eventId)
        .eq("captain_uid", uid)
        .single();

      if (teamError || !teamData) {
        setErrorMessage("没有找到你负责的队伍，或你不是该比赛的队长。");
        setLoading(false);
        return;
      }

      setTeam(teamData as TeamInfo);
      setTeamName(teamData.team_name || `队伍${teamData.team_no || ""}`);

      const { data: membersData, error: membersError } = await supabase
        .from("event_team_members")
        .select("id,uid,nickname,power")
        .eq("event_id", eventId)
        .eq("team_id", teamData.id)
        .order("id", { ascending: true });

      if (membersError) {
        console.error(membersError);
      }

      const existingMembers = (membersData || []) as TeamMember[];

      const existingUids = existingMembers.map((member) => member.uid || "");
      const existingPowers = existingMembers.map((member) =>
        member.power === null || member.power === undefined
          ? ""
          : String(member.power)
      );

      const nextUids =
        existingUids.length > 0 ? existingUids : ["", "", "", "", ""];

      const powerMap = await loadPowerMap(existingUids);
      const referencePowers = existingUids.map((uid) => {
        const referencePower = powerMap.get(uid.trim().toUpperCase());
        return referencePower?.label ?? "";
      });

      const nextPowers =
        existingPowers.length > 0 ? existingPowers : ["", "", "", "", ""];
      const nextReferences =
        referencePowers.length > 0 ? referencePowers : ["", "", "", "", ""];

      setMemberUids(nextUids);
      setMemberPowers(nextPowers);
      setMemberReferencePowers(nextReferences);
      setMemberPowerTouched(nextPowers.map((power) => power !== ""));

      setLoading(false);
    }

    if (!Number.isNaN(eventId)) {
      loadPage();
    }
  }, [eventId, loadPowerMap, router, supabase]);

  async function updateMemberUid(index: number, value: string) {
    const normalizedUid = value.toUpperCase().trim();
    const next = [...memberUids];
    next[index] = normalizedUid;
    setMemberUids(next);

    const nextReferences = [...memberReferencePowers];
    nextReferences[index] = "";
    setMemberReferencePowers(nextReferences);

    if (!normalizedUid) return;

    const powerMap = await loadPowerMap([normalizedUid]);
    const referencePower = powerMap.get(normalizedUid);
    if (referencePower == null) return;

    setMemberReferencePowers((prev) => {
      const updated = [...prev];
      if (index >= updated.length) return prev;
      updated[index] = referencePower.label;
      return updated;
    });

    if (!memberPowerTouched[index]) {
      setMemberPowers((prev) => {
        const updated = [...prev];
        if (index >= updated.length) return prev;
        updated[index] = String(referencePower.power);
        return updated;
      });
    }
  }

  function updateMemberPower(index: number, value: string) {
    const next = [...memberPowers];

    // 只允许输入数字
    next[index] = value.replace(/[^\d]/g, "");

    setMemberPowers(next);
    setMemberPowerTouched((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  }

  function addMemberInput() {
    setMemberUids((prev) => [...prev, ""]);
    setMemberPowers((prev) => [...prev, ""]);
    setMemberReferencePowers((prev) => [...prev, ""]);
    setMemberPowerTouched((prev) => [...prev, false]);
  }

  function removeMemberInput(index: number) {
    setMemberUids((prev) => prev.filter((_, i) => i !== index));
    setMemberPowers((prev) => prev.filter((_, i) => i !== index));
    setMemberReferencePowers((prev) => prev.filter((_, i) => i !== index));
    setMemberPowerTouched((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventInfo || !team) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const canEdit =
      eventInfo.allow_team_edit === true && team.can_edit === true;

    if (!canEdit) {
      setErrorMessage("该队伍当前不可编辑，请联系管理员。");
      setSaving(false);
      return;
    }

    const cleanRows = memberUids
      .map((uid, index) => ({
        uid: uid.trim().toUpperCase(),
        power: memberPowers[index] || "",
      }))
      .filter((row) => row.uid);

    const cleanUids = cleanRows.map((row) => row.uid);
    const uniqueUids = Array.from(new Set(cleanUids));

    if (uniqueUids.length !== cleanUids.length) {
      setErrorMessage("队伍成员 UID 不能重复。");
      setSaving(false);
      return;
    }

    if (cleanRows.length === 0) {
      setErrorMessage("请至少填写 1 个队员 UID。");
      setSaving(false);
      return;
    }

    const { data: players, error: playersError } = await supabase
      .from("users")
      .select("uid,nickname")
      .in("uid", uniqueUids);

    if (playersError || !players) {
      setErrorMessage("查询玩家 UID 失败，请稍后再试。");
      setSaving(false);
      return;
    }

    const foundUids = new Set(players.map((player) => player.uid));
    const missingUids = uniqueUids.filter((uid) => !foundUids.has(uid));

    if (missingUids.length > 0) {
      setErrorMessage(`以下 UID 不存在：${missingUids.join(", ")}`);
      setSaving(false);
      return;
    }

    const playerMap = new Map(
      (players as PlayerRow[]).map((player) => [player.uid, player])
    );

    const { error: updateTeamError } = await supabase
      .from("event_teams")
      .update({
        team_name: teamName.trim() || `队伍${team.team_no || ""}`,
      })
      .eq("id", team.id)
      .eq("captain_uid", loginUid);

    if (updateTeamError) {
      console.error(updateTeamError);
      setErrorMessage("保存队伍名称失败。");
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("event_team_members")
      .delete()
      .eq("event_id", eventId)
      .eq("team_id", team.id);

    if (deleteError) {
      console.error(deleteError);
      setErrorMessage("清空旧成员失败。");
      setSaving(false);
      return;
    }

    const rows = cleanRows.map((row) => {
      const player = playerMap.get(row.uid);
      const power = Number(row.power || 0);

      return {
        event_id: eventId,
        team_id: team.id,
        uid: row.uid,
        nickname: player?.nickname || row.uid,
        power: Number.isNaN(power) ? 0 : power,
      };
    });

    const { error: insertError } = await supabase
      .from("event_team_members")
      .insert(rows);

    if (insertError) {
      console.error(insertError);
      setErrorMessage("保存队伍成员失败。");
      setSaving(false);
      return;
    }

    const calculatedTotalPower = rows.reduce((sum, row) => sum + row.power, 0);

    const { error: updatePowerError } = await supabase
      .from("event_teams")
      .update({
        total_power: calculatedTotalPower,
      })
      .eq("id", team.id)
      .eq("captain_uid", loginUid);

    if (updatePowerError) {
      console.error(updatePowerError);
      setErrorMessage("成员已保存，但队伍总战力更新失败。");
      setSaving(false);
      return;
    }

    setTeam({
      ...team,
      team_name: teamName.trim() || `队伍${team.team_no || ""}`,
      total_power: calculatedTotalPower,
    });
    setMemberPowers(rows.map((row) => String(row.power)));
    setMemberPowerTouched(rows.map(() => true));

    setMessage("队伍信息已保存。");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载队伍信息...</p>
      </main>
    );
  }

  if (errorMessage && (!eventInfo || !team)) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-300">
          {errorMessage}
        </div>

        <div className="mt-6">
          <Link
            href="/captain/events"
            className="text-[var(--accent)] hover:underline"
          >
            返回我的队伍
          </Link>
        </div>
      </main>
    );
  }

  const canEdit =
    eventInfo?.allow_team_edit === true && team?.can_edit === true;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
      <div className="border border-white/10 bg-black/40 p-6 shadow-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          Team Edit
        </p>

        <h1 className="text-3xl font-black text-white">编辑队伍</h1>

        <div className="mt-5 border border-white/10 bg-black/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--muted)]">比赛</span>
            <span className="text-white">{eventInfo?.event_name}</span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-[var(--muted)]">队长 UID</span>
            <span className="font-mono text-white">{loginUid}</span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-[var(--muted)]">编辑状态</span>
            <span className={canEdit ? "text-green-300" : "text-red-300"}>
              {canEdit ? "允许编辑" : "不可编辑"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white">队伍名称</label>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              disabled={!canEdit}
              placeholder="例如 糖心Vlog"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>

          <div className="border border-white/10 bg-black/40 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">队伍总战力</span>
              <span className="font-mono text-xl font-bold text-white">
                {totalPower}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm text-white">
              队伍成员 UID / 战力
            </label>

            <div className="grid gap-3">
              {memberUids.map((memberUid, index) => (
                <div
                  key={index}
                  className="grid gap-2 sm:grid-cols-[1fr_120px_140px_auto]"
                >
                  <input
                    value={memberUid}
                    onChange={(event) =>
                      updateMemberUid(index, event.target.value)
                    }
                    disabled={!canEdit}
                    placeholder={`队员 ${index + 1} UID，例如 AS006`}
                    className="w-full border border-white/10 bg-black/60 px-4 py-3 font-mono text-white outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  />

                  <div className="border border-white/10 bg-black/30 px-3 py-2">
                    <p className="text-[10px] text-[var(--muted)]">
                      当前战力
                    </p>
                    <p className="font-mono text-sm font-bold text-white">
                      {memberReferencePowers[index] || "-"}
                    </p>
                    {memberReferencePowers[index]?.includes(" +") && (
                      <p className="text-[10px] text-[var(--muted)]">
                        活跃度调整还原
                      </p>
                    )}
                  </div>

                  <input
                    value={memberPowers[index] || ""}
                    onChange={(event) =>
                      updateMemberPower(index, event.target.value)
                    }
                    disabled={!canEdit}
                    placeholder="战力"
                    className="w-full border border-white/10 bg-black/60 px-4 py-3 font-mono text-white outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  />

                  {canEdit && memberUids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberInput(index)}
                      className="border border-white/10 px-4 text-sm text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={addMemberInput}
                className="mt-3 border border-white/10 px-4 py-2 text-sm text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                + 添加成员
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!canEdit || saving}
            className="w-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存队伍"}
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/captain/events"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            返回我的队伍
          </Link>
        </div>
      </div>
    </main>
  );
}
