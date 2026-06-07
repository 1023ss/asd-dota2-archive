"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uid, setUid] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const cleanUid = uid.trim().toUpperCase();
    const cleanCode = code.trim();

    if (!email.trim() || !password.trim() || !cleanUid || !cleanCode) {
      setErrorMessage("请填写邮箱、密码、UID 和注册码。");
      setLoading(false);
      return;
    }

    try {
      // 1. 检查注册码是否存在且未使用
      const { data: codeRow, error: codeError } = await supabase
        .from("registration_codes")
        .select("id, uid, code, is_new_player, used")
        .eq("uid", cleanUid)
        .eq("code", cleanCode)
        .eq("used", false)
        .single();

      if (codeError || !codeRow) {
        setErrorMessage("UID 或注册码错误，或者该注册码已经被使用。");
        setLoading(false);
        return;
      }

      // 2. 检查 users 表里是否存在这个 UID
      const { data: player, error: playerError } = await supabase
        .from("users")
        .select("uid, nickname, auth_user_id")
        .eq("uid", cleanUid)
        .single();

      if (playerError || !player) {
        setErrorMessage("没有找到这个 UID，请确认 UID 是否正确。");
        setLoading(false);
        return;
      }

      if (player.auth_user_id) {
        setErrorMessage("这个 UID 已经绑定过账号。");
        setLoading(false);
        return;
      }

      // 3. 创建 Supabase Auth 账号
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (signUpError || !signUpData.user) {
        setErrorMessage(signUpError?.message || "注册失败，请稍后再试。");
        setLoading(false);
        return;
      }

      const authUserId = signUpData.user.id;

      // 4. 绑定 users 表
      const { error: updateUserError } = await supabase
        .from("users")
        .update({
          auth_user_id: authUserId,
          is_new_player: codeRow.is_new_player,
          role: "member",
        })
        .eq("uid", cleanUid);

      if (updateUserError) {
        setErrorMessage("账号创建成功，但绑定玩家资料失败，请联系管理员。");
        setLoading(false);
        return;
      }

      // 5. 标记注册码已使用
      const { error: updateCodeError } = await supabase
        .from("registration_codes")
        .update({
          used: true,
          used_by: authUserId,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeRow.id);

      if (updateCodeError) {
        setErrorMessage("账号创建成功，但注册码状态更新失败，请联系管理员。");
        setLoading(false);
        return;
      }

      setMessage(
        `注册成功！已绑定 UID：${player.uid}，昵称：${player.nickname || "未填写"}。`
      );

      setEmail("");
      setPassword("");
      setUid("");
      setCode("");
    } catch (error) {
      console.error(error);
      setErrorMessage("注册过程中发生未知错误。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <div className="border border-white/10 bg-black/40 p-6 shadow-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Member Register
        </p>

        <h1 className="text-3xl font-black text-white">玩家注册</h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          使用管理员提供的 UID 和注册码注册账号。
        </p>

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white">邮箱</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="example@qq.com"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">密码</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="至少 6 位"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">UID</label>
            <input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="例如 AS106"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white">注册码</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="管理员提供的注册码"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          已经有账号？{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            去登录
          </Link>
        </div>
      </div>
    </main>
  );
}