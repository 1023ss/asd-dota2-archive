"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PlayerProfile {
  uid: string;
  nickname: string | null;
  steam_id: string | null;
  bio: string | null;
  self_description?: string | null;
  position: string | null;
  role: string | null;
  is_new_player: boolean | null;
}

interface PowerBreakdown {
  final_power: number;
}

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

export default function MePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [power, setPower] = useState<PowerBreakdown | null>(null);

  const [steamId, setSteamId] = useState("");
  const [bio, setBio] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const positionOptions = [
    { value: "1", label: "1号位 / Carry" },
    { value: "2", label: "2号位 / Mid" },
    { value: "3", label: "3号位 / Offlane" },
    { value: "4", label: "4号位 / Soft Support" },
    { value: "5", label: "5号位 / Hard Support" },
  ];
  
  function togglePosition(value: string) {
    setPositions((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
  
      return [...prev, value].sort();
    });
  }
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
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

      const { data, error } = await supabase
        .from("users")
        .select("uid,nickname,steam_id,bio,self_description,position,role,is_new_player")
        .eq("uid", uid)
        .single();

      if (error || !data) {
        setErrorMessage("没有找到你的玩家资料，请联系管理员。");
        setLoading(false);
        return;
      }

      setPlayer(data as PlayerProfile);
      try {
        const powerResponse = await fetch(
          `/api/power?uids=${encodeURIComponent(uid)}`,
          { cache: "no-store" }
        );
        if (powerResponse.ok) {
          const powerPayload = await powerResponse.json();
          setPower(powerPayload.rows?.[0] ?? null);
        }
      } catch {
        // Power display is optional on this page.
      }
      setSteamId(data.steam_id || "");
      setBio(data.bio || data.self_description || "");
      setPositions(
        data.position
          ? data.position
              .split(",")
              .map((item: string) => item.trim())
              .filter(Boolean)
          : []
      );
      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!player) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const uid = window.localStorage.getItem("asd_uid");
    const loginCode = window.localStorage.getItem("asd_login_code");

    if (!uid || !loginCode || uid !== player.uid) {
      setErrorMessage("登录状态失效，请重新登录。");
      setSaving(false);
      return;
    }

    const { data: codeRow, error: codeError } = await supabase
      .from("registration_codes")
      .select("uid,code,login_enabled")
      .eq("uid", uid)
      .eq("code", loginCode)
      .single();

    if (codeError || !codeRow || codeRow.login_enabled === false) {
      setErrorMessage("登录状态失效，请重新登录。");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        steam_id: steamId.trim() || null,
        bio: bio.trim() || null,
        position: positions.length > 0 ? positions.join(", ") : null,
      })
    
      .eq("uid", player.uid);

    if (error) {
      setErrorMessage("保存失败，请稍后再试。");
      setSaving(false);
      return;
    }

    setMessage("资料已保存。");
    setSaving(false);
  }

  function handleLogout() {
    window.localStorage.removeItem("asd_uid");
    window.localStorage.removeItem("asd_login_code");
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载个人资料...</p>
      </main>
    );
  }

  if (errorMessage && !player) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
        <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-300">
          {errorMessage}
        </div>

        <div className="mt-6">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            返回登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-24">
      <div className="border border-white/10 bg-black/40 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Member Center
        </p>

        <h1 className="text-3xl font-black text-white">个人中心</h1>

          </div>

          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="w-full bg-[var(--accent)] px-8 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "保存中..." : "保存资料"}
          </button>
        </div>

        {player && (
          <div className="mt-6 grid gap-3 border border-white/10 bg-black/40 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">UID</span>
              <span className="font-mono text-white">{player.uid}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">昵称</span>
              <span className="text-white">{player.nickname || "-"}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">身份</span>
              <span className="text-white">{player.role || "member"}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">新人</span>
              <span className="text-white">
                {player.is_new_player ? "是" : "否"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[var(--muted)]">最终战力</span>
              <span className="font-mono text-white">
                {power?.final_power ?? "-"}
              </span>
            </div>
          </div>
        )}

        <form id="profile-form" onSubmit={handleSave} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white">Steam ID</label>
            <input
              value={steamId}
              onChange={(event) => setSteamId(event.target.value)}
              placeholder="填写你的 Steam ID"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
  <label className="mb-3 block text-sm text-white">常玩位置</label>

            <div className="grid gap-3 sm:grid-cols-2">
              {positionOptions.map((option) => {
                const checked = positions.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => togglePosition(option.value)}
                    className={
                      checked
                        ? "border border-[var(--accent)] bg-[var(--accent)]/20 px-4 py-3 text-left text-sm font-bold text-white"
                        : "border border-white/10 bg-black/60 px-4 py-3 text-left text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-white"
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-[var(--muted)]">
              可多选，例如 4、5 号位辅助玩家可以同时选择 4号位 和 5号位。
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm text-white">自我介绍</label>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="介绍一下自己，例如常玩位置、擅长英雄、比赛风格等"
              rows={5}
              className="w-full resize-none border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
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

        </form>

        <div className="mt-6">
          <Link
            href="/captain/events"
            className="group block border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--border-accent)] hover:bg-[rgba(214,40,40,0.08)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Team Portal
                </p>
                <p className="mt-2 text-base font-bold text-white">
        我的队伍
                </p>
              </div>

              <span className="shrink-0 border border-white/10 px-3 py-2 text-xs font-bold text-white transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                查看
              </span>
            </div>
          </Link>
         </div>{isAdminRole(player?.role) && (
        <div className="mt-4 border border-white/10 bg-black/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)]">
            Admin Tools
            </p>

            <h2 className="mt-2 text-xl font-black text-white">管理员后台</h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
            管理比赛、队伍坑位和玩家邀请码。
            </p>

            <div className="mt-4 flex flex-col flex-wrap gap-3 sm:flex-row">
            <Link
                href="/admin/events"
                className="border border-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
                赛事管理
            </Link>

            <Link
                href="/admin/codes"
                className="border border-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
                邀请码管理
            </Link>
            <Link
                href="/admin/bulletins"
                className="border border-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
                ASD 大字报管理
            </Link>
            <Link
                href="/admin/sponsors"
                className="border border-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
                赞助展示管理
            </Link>
            </div>
        </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          退出登录
        </button>

        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
