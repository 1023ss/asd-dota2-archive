import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return NextResponse.json({
    supabaseUrlExists: Boolean(supabaseUrl),
    supabaseUrl,
    anonKeyExists: Boolean(anonKey),
    anonKeyLength: anonKey.length,
  });
}
