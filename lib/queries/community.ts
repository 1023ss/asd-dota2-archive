import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface Bulletin {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  published_at: string | null;
}

export interface SponsorPost {
  id: string;
  title: string;
  sponsor_name: string | null;
  content: string | null;
  published_at: string | null;
}

type CommunityTable = "bulletins" | "sponsor_posts";

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: normalizeText(row.title) ?? "未命名",
    subtitle: normalizeText(row.subtitle),
    sponsor_name: normalizeText(row.sponsor_name),
    content: normalizeText(row.content),
    published_at: normalizeText(row.published_at),
  };
}

async function fetchPublishedRows(table: CommunityTable) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(normalizeRow);
}

async function fetchPublishedRowById(table: CommunityTable, id: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("status", "published")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function getLatestBulletin(): Promise<Bulletin | null> {
  const rows = await fetchPublishedRows("bulletins");
  return (rows[0] as Bulletin | undefined) ?? null;
}

export async function getPublishedBulletins(): Promise<Bulletin[]> {
  return fetchPublishedRows("bulletins") as Promise<Bulletin[]>;
}

export async function getBulletinById(id: string): Promise<Bulletin | null> {
  return fetchPublishedRowById("bulletins", id) as Promise<Bulletin | null>;
}

export async function getLatestSponsorPost(): Promise<SponsorPost | null> {
  const rows = await fetchPublishedRows("sponsor_posts");
  return (rows[0] as SponsorPost | undefined) ?? null;
}

export async function getPublishedSponsorPosts(): Promise<SponsorPost[]> {
  return fetchPublishedRows("sponsor_posts") as Promise<SponsorPost[]>;
}

export async function getSponsorPostById(
  id: string
): Promise<SponsorPost | null> {
  return fetchPublishedRowById("sponsor_posts", id) as Promise<SponsorPost | null>;
}

export function formatCommunityDate(value: string | null) {
  if (!value) return "未发布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getContentSummary(content: string | null, length = 88) {
  if (!content) return "暂无内容";
  const text = content.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}
