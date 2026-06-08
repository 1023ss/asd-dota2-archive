import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // CloudBase / Next build 阶段可能拿不到环境变量。
  // 这里不能 throw，否则静态预渲染 /admin、/captain 页面会失败。
  if (!url || !key) {
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  return createBrowserClient(url, key);
}