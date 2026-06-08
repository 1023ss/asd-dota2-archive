import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const tables = [
  "users",
  "event_results_v2",
  "event_teams",
  "event_team_members",
] as const;

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({
      results: tables.map((table) => ({
        table,
        count: null,
        error: "Supabase is not configured.",
      })),
    });
  }

  const results = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      return {
        table,
        count,
        error: error?.message ?? null,
      };
    })
  );

  return NextResponse.json({ results });
}
