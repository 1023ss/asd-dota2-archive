"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ContentStatus = "draft" | "published" | "hidden";
type TableName = "bulletins" | "sponsor_posts";

export interface CommunityContentRow {
  id: number | string;
  title: string | null;
  subtitle?: string | null;
  sponsor_name?: string | null;
  content: string | null;
  cover_url: string | null;
  link_url?: string | null;
  status: ContentStatus | string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AdminUser {
  uid: string;
  nickname: string | null;
  role: string | null;
}

interface CommunityContentAdminProps {
  table: TableName;
  title: string;
  label: string;
  description: string;
  listTitle: string;
  titlePlaceholder: string;
  secondaryField?: {
    key: "subtitle" | "sponsor_name";
    label: string;
    placeholder: string;
  };
  includeLinkUrl?: boolean;
  frontPath: string;
}

const emptyForm = {
  id: "",
  title: "",
  subtitle: "",
  sponsor_name: "",
  content: "",
  cover_url: "",
  link_url: "",
  status: "draft" as ContentStatus,
  published_at: "",
};

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string | null) {
  switch (status) {
    case "published":
      return "发布";
    case "hidden":
      return "隐藏";
    default:
      return "草稿";
  }
}

export function CommunityContentAdmin({
  table,
  title,
  label,
  description,
  listTitle,
  titlePlaceholder,
  secondaryField,
  includeLinkUrl = false,
  frontPath,
}: CommunityContentAdminProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState<CommunityContentRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const editing = useMemo(() => Boolean(form.id), [form.id]);

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
      setErrorMessage("你不是管理员，无法访问该后台页面。");
      return null;
    }

    return user as AdminUser;
  }

  async function loadRows(knownAdmin?: AdminUser) {
    setLoading(true);
    setErrorMessage("");

    const admin = knownAdmin ?? (await checkAdmin());
    if (!admin) {
      setLoading(false);
      return;
    }

    setAdminUser(admin);

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setRows([]);
      setErrorMessage("读取列表失败，请检查 Supabase 表权限或字段。");
      setLoading(false);
      return;
    }

    setRows((data ?? []) as CommunityContentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
  }

  function editRow(row: CommunityContentRow) {
    setMessage("");
    setErrorMessage("");
    setForm({
      id: String(row.id),
      title: row.title ?? "",
      subtitle: row.subtitle ?? "",
      sponsor_name: row.sponsor_name ?? "",
      content: row.content ?? "",
      cover_url: row.cover_url ?? "",
      link_url: row.link_url ?? "",
      status:
        row.status === "published" || row.status === "hidden"
          ? row.status
          : "draft",
      published_at: toDatetimeLocal(row.published_at),
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const admin = adminUser ?? (await checkAdmin());
    if (!admin) {
      setSaving(false);
      return;
    }

    const cleanTitle = form.title.trim();
    if (!cleanTitle) {
      setErrorMessage("请填写标题。");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const publishedAt =
      form.status === "published" && !form.published_at.trim()
        ? now
        : fromDatetimeLocal(form.published_at);

    const payload: Record<string, unknown> = {
      title: cleanTitle,
      content: form.content.trim() || null,
      cover_url: form.cover_url.trim() || null,
      status: form.status,
      published_at: publishedAt,
      updated_at: now,
    };

    if (secondaryField) {
      payload[secondaryField.key] = form[secondaryField.key].trim() || null;
    }

    if (includeLinkUrl) {
      payload.link_url = form.link_url.trim() || null;
    }

    const result = editing
      ? await supabase.from(table).update(payload).eq("id", form.id)
      : await supabase.from(table).insert(payload);

    if (result.error) {
      setErrorMessage("保存失败，请检查字段、权限或网络状态。");
      setSaving(false);
      return;
    }

    setMessage(editing ? "内容已更新。" : "内容已创建。");
    setSaving(false);
    setForm(emptyForm);
    loadRows(admin);
  }

  async function handleDelete(row: CommunityContentRow) {
    const confirmed = window.confirm(`确定删除「${row.title || row.id}」吗？`);
    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from(table).delete().eq("id", row.id);

    if (error) {
      setErrorMessage("删除失败，请稍后再试。");
      return;
    }

    if (String(row.id) === form.id) {
      setForm(emptyForm);
    }
    setMessage("内容已删除。");
    loadRows();
  }

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
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-title)]">
          {label}
        </p>
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{description}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
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
        onSubmit={handleSave}
        className="mb-6 border border-white/10 bg-black/40 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">
            {editing ? "编辑内容" : "新增内容"}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="border border-white/10 px-4 py-2 text-sm text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              取消编辑
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={titlePlaceholder}
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          />

          {secondaryField && (
            <input
              value={form[secondaryField.key]}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [secondaryField.key]: event.target.value,
                }))
              }
              placeholder={secondaryField.placeholder}
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          )}

          <input
            value={form.cover_url}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                cover_url: event.target.value,
              }))
            }
            placeholder="封面图片 URL"
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          />

          {includeLinkUrl && (
            <input
              value={form.link_url}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  link_url: event.target.value,
                }))
              }
              placeholder="赞助链接 URL"
              className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
            />
          )}

          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as ContentStatus,
              }))
            }
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          >
            <option value="draft">draft 草稿</option>
            <option value="published">published 发布</option>
            <option value="hidden">hidden 隐藏</option>
          </select>

          <input
            type="datetime-local"
            value={form.published_at}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                published_at: event.target.value,
              }))
            }
            className="w-full border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
          />
        </div>

        <textarea
          value={form.content}
          onChange={(event) =>
            setForm((current) => ({ ...current, content: event.target.value }))
          }
          placeholder="正文内容"
          rows={8}
          className="mt-4 w-full resize-y border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
        />

        <button
          type="submit"
          disabled={saving}
          className="mt-5 bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中..." : editing ? "保存修改" : "新增内容"}
        </button>
      </form>

      <section className="border border-white/10 bg-black/40 p-5">
        <h2 className="text-xl font-black text-white">{listTitle}</h2>

        {rows.length === 0 ? (
          <div className="mt-5 border border-white/10 bg-black/40 p-5 text-sm text-[var(--muted)]">
            暂无内容。
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border border-white/10 bg-black/40 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-title)]">
                      {statusLabel(row.status)}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">
                      {row.title || "未命名"}
                    </h3>
                    {secondaryField && (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {row[secondaryField.key] || "-"}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                      <span>ID：{row.id}</span>
                      <span>发布时间：{formatDate(row.published_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`${frontPath}/${row.id}`}
                      className="border border-white/10 px-4 py-2 text-center text-sm text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      查看前台
                    </Link>
                    <button
                      type="button"
                      onClick={() => editRow(row)}
                      className="bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
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

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/me" className="text-sm text-[var(--accent)] hover:underline">
          返回个人中心
        </Link>
        <Link
          href="/admin/events"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          返回赛事管理
        </Link>
      </div>
    </main>
  );
}
