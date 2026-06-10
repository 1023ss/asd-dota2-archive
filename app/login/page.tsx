"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const cleanUid = uid.trim().toUpperCase();
    const cleanCode = code.trim();

    if (!cleanUid || !cleanCode) {
      setErrorMessage("请填写 UID 和邀请码。");
      setLoading(false);
      return;
    }

    try {
      const { data: codeRow, error: codeError } = await supabase
        .from("registration_codes")
        .select(
          "id, uid, code, is_new_player, used, login_enabled, used_at, last_login_at"
        )
        .eq("uid", cleanUid)
        .eq("code", cleanCode)
        .single();

      if (codeError || !codeRow) {
        setErrorMessage("UID 或邀请码错误。");
        setLoading(false);
        return;
      }

      if (codeRow.login_enabled === false) {
        setErrorMessage("该邀请码已被管理员禁用，请联系管理员。");
        setLoading(false);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from("users")
        .select("uid,nickname,is_new_player")
        .eq("uid", cleanUid)
        .single();

      if (playerError || !player) {
        setErrorMessage("没有找到该 UID 对应的玩家资料。");
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();

      await supabase
        .from("registration_codes")
        .update({
          used: true,
          used_at: codeRow.used_at || now,
          last_login_at: now,
        })
        .eq("id", codeRow.id);

      await supabase
        .from("users")
        .update({
          is_new_player: codeRow.is_new_player,
          last_login_at: now,
        })
        .eq("uid", cleanUid);

      window.localStorage.setItem("asd_uid", cleanUid);
      window.localStorage.setItem("asd_login_code", cleanCode);

      router.push("/me");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("登录过程中发生未知错误。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <div className="border border-white/10 bg-black/40 p-6 shadow-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          Member Login
        </p>

        <h1 className="text-3xl font-black text-white">玩家登录</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          使用管理员提供的 UID 和邀请码登录。
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white">UID</label>
            <input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="例如 AS006"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">邀请码</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="管理员提供的邀请码"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          {errorMessage && (
            <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          没有邀请码？请联系管理员。
        </div>

        <div className="mt-3 text-center text-sm">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
