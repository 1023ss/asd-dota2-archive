/** 规范化 Supabase 项目 URL（勿带 /rest/v1 等路径） */
export function getSupabaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw || raw.includes("your-project")) {
    return undefined;
  }

  return raw
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key || key.includes("your-anon-key")) {
    return undefined;
  }
  return key;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.includes("supabase.co"));
}
