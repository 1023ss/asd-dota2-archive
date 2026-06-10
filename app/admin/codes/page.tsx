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

interface CodeRow {
  id: number;
  uid: string;
  code: string;
  is_new_player: boolean | null;
  used: boolean | null;
  login_enabled: boolean | null;
  used_at: string | null;
  last_login_at: string | null;
  note: string | null;
  created_at: string | null;
}

export default function AdminCodesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [codes, setCodes] = useState<CodeRow[]>([]);

  const [uid, setUid] = useState("");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [note, setNote] = useState("");

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

    if (userError || !user || user.role !== "admin") {
      setErrorMessage("你不是管理员，无法访问邀请码管理。");
      return null;
    }

    return user as AdminUser;
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

    const { data, error } = await supabase
      .from("registration_codes")
      .select(
        "id,uid,code,is_new_player,used,login_enabled,used_at,last_login_at,note,created_at"
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("读取邀请码失败。");
      setLoading(false);
      return;
    }

    setCodes((data || []) as CodeRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function generateCode() {
    const cleanUid = uid.trim().toUpperCase() || "ASD";
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCode(`${cleanUid}-${random}`);
  }

  async function handleCreateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setMessage("");
    setErrorMessage("");

    const cleanUid = uid.trim().toUpperCase();
    const cleanNickname = nickname.trim();
    const cleanCode = code.trim();

    if (!cleanUid) {
      setErrorMessage("请填写 UID。");
      setCreating(false);
      return;
    }

    if (!cleanCode) {
      setErrorMessage("请填写邀请码。");
      setCreating(false);
      return;
    }

    const { data: player, error: playerError } = await supabase
      .from("users")
      .select("uid,nickname")
      .eq("uid", cleanUid)
      .maybeSingle();

    if (playerError) {
      console.error(playerError);
      setErrorMessage("查询玩家失败，请稍后再试。");
      setCreating(false);
      return;
    }

    if (!player) {
      if (!cleanNickname) {
        setErrorMessage(`UID ${cleanUid} 不存在，请填写玩家昵称以创建新玩家。`);
        setCreating(false);
        return;
      }

      const { error: createPlayerError } = await supabase.from("users").insert({
        uid: cleanUid,
        nickname: cleanNickname,
        role: "member",
        is_new_player: isNewPlayer,
      });

      if (createPlayerError) {
        console.error(createPlayerError);
        setErrorMessage("创建新玩家失败，请检查 users 表字段。");
        setCreating(false);
        return;
      }
    }

    const { error } = await supabase.from("registration_codes").insert({
      uid: cleanUid,
      code: cleanCode,
      is_new_player: isNewPlayer,
      used: false,
      login_enabled: loginEnabled,
      note: note.trim() || null,
    });

    if (error) {
      console.error(error);
      setErrorMessage("创建邀请码失败，可能是 code 重复。");
      setCreating(false);
      return;
    }

    setMessage(`已为 ${cleanUid} 创建邀请码：${cleanCode}`);
    setUid("");
    setNickname("");
    setCode("");
    setIsNewPlayer(false);
    setLoginEnabled(true);
    setNote("");
    setCreating(false);
    loadPage();
  }

  async function updateCode(id: number, patch: Partial<CodeRow>) {
    setMessage("");
    setErrorMessage("");

    const updateData: Record<string, unknown> = {};

    if ("code" in patch) {
      const cleanCode = (patch.code || "").trim();

      if (!cleanCode) {
        setErrorMessage("邀请码不能为空。");
        return;
      }

      updateData.code = cleanCode;
    }

    if ("is_new_player" in patch) {
      updateData.is_new_player = patch.is_new_player;
    }

    if ("login_enabled" in patch) {
      updateData.login_enabled = patch.login_enabled;
    }

    if ("note" in patch) {
      updateData.note = patch.note || null;
    }

    const { error } = await supabase
      .from("registration_codes")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMessage("更新邀请码失败。");
      return;
    }

    setMessage("邀请码已更新。");
    loadPage();
  }

  async function resetUsed(id: number) {
    const confirmed = window.confirm("确定重置为未使用吗？");

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("registration_codes")
      .update({
        used: false,
        used_by: null,
        used_at: null,
        last_login_at: null,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMessage("重置邀请码失败。");
      return;
    }

    setMessage("邀请码已重置为未使用。");
    loadPage();
  }

  async function deleteCode(id: number) {
    const confirmed = window.confirm("确定删除这个邀请码吗？");

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("registration_codes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMessage("删除邀请码失败。");
      return;
    }

    setMessage("邀请码已删除。");
    loadPage();
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-24">
        <p className="text-[var(--muted)]">正在加载邀请码管理...</p>
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
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          Admin Codes
        </p>

        <h1 className="text-3xl font-black text-white">邀请码管理</h1>

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

      <form
        onSubmit={handleCreateCode}
        className="mb-6 border border-white/10 bg-black/40 p-5"
      >
        <h2 className="text-xl font-black text-white">创建邀请码</h2>

        <div className="mt-5 grid gap-4 lg:grid-cols-[160px_180px_1fr_160px_160px]">
          <input
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            placeholder="UID，例如 AS301"
            className="w-full border border-white/10 bg-black/60 px-4 py-3 font-mono text-white outline-none focus:border-[var(--accent)]"
          />

          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="昵称，新 UID 必填"
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          />

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="邀请码，例如 AS301-2026"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 font-mono text-white outline-none focus:border-[var(--accent)]"
            />

            <button
              type="button"
              onClick={generateCode}
              className="border border-white/10 px-4 text-sm text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              生成
            </button>
          </div>

          <label className="flex items-center gap-3 border border-white/10 bg-black/40 px-4 py-3">
            <input
              type="checkbox"
              checked={isNewPlayer}
              onChange={(event) => setIsNewPlayer(event.target.checked)}
            />
            <span className="text-sm text-white">新人</span>
          </label>

          <label className="flex items-center gap-3 border border-white/10 bg-black/40 px-4 py-3">
            <input
              type="checkbox"
              checked={loginEnabled}
              onChange={(event) => setLoginEnabled(event.target.checked)}
            />
            <span className="text-sm text-white">允许登录</span>
          </label>
        </div>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="备注，可选"
          rows={3}
          className="mt-4 w-full resize-none border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
        />

        <button
          type="submit"
          disabled={creating}
          className="mt-5 bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "创建中..." : "创建邀请码"}
        </button>
      </form>

      <section className="border border-white/10 bg-black/40 p-5">
        <h2 className="text-xl font-black text-white">邀请码列表</h2>

        {codes.length === 0 ? (
          <div className="mt-5 border border-white/10 bg-black/40 p-5 text-sm text-[var(--muted)]">
            暂无邀请码。
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {codes.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 border border-white/10 bg-black/40 p-4 xl:grid-cols-[120px_220px_120px_120px_1fr_220px]"
              >
                <div>
                  <p className="text-xs text-[var(--muted)]">UID</p>
                  <p className="font-mono text-white">{item.uid}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-[var(--muted)]">邀请码</p>
                  <input
                    defaultValue={item.code}
                    onBlur={(event) =>
                      updateCode(item.id, { code: event.target.value })
                    }
                    className="w-full border border-white/10 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(item.is_new_player)}
                    onChange={(event) =>
                      updateCode(item.id, {
                        is_new_player: event.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-white">新人</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(item.login_enabled)}
                    onChange={(event) =>
                      updateCode(item.id, {
                        login_enabled: event.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-white">允许登录</span>
                </label>

                <div>
                  <p className="text-xs text-[var(--muted)]">状态</p>
                  <p className="text-sm text-white">
                    首次使用：
                    {item.used ? (
                      <span className="text-green-300">是</span>
                    ) : (
                      <span className="text-red-300">否</span>
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    首次：{item.used_at || "-"}
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    最近登录：{item.last_login_at || "-"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    defaultValue={item.note || ""}
                    placeholder="备注"
                    onBlur={(event) =>
                      updateCode(item.id, { note: event.target.value })
                    }
                    className="w-full border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => resetUsed(item.id)}
                      className="border border-white/10 px-3 py-2 text-xs text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      重置
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCode(item.id)}
                      className="border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex gap-4">
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
