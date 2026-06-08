import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const tables = [
  "users",
  "event_results_v2",
  "event_teams",
  "event_team_members",
];

function errorToRaw(error: unknown) {
  return error ? JSON.stringify(error) : null;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabase = await createClient();

  if (!supabase) {
    const error = { message: "supabase client is null" };

    return Response.json({
      ok: false,
      supabaseUrlExists: Boolean(url),
      anonKeyExists: Boolean(key),
      anonKeyLength: key.length,
      results: tables.map((table) => ({
        table,
        count: null,
        countErrorRaw: errorToRaw(error),
        countErrorMessage: error.message,
        sampleLength: null,
        sampleErrorRaw: errorToRaw(error),
        sampleErrorMessage: error.message,
      })),
    });
  }

  const client = supabase;

  async function checkTable(table: string) {
    const countResult = await client
      .from(table)
      .select("*", { count: "exact", head: true });

    const sampleResult = await client.from(table).select("*").limit(1);

    return {
      table,

      count: countResult.count,
      countErrorRaw: countResult.error
        ? JSON.stringify(countResult.error)
        : null,
      countErrorMessage: countResult.error?.message || null,

      sampleLength: sampleResult.data?.length ?? null,
      sampleErrorRaw: sampleResult.error
        ? JSON.stringify(sampleResult.error)
        : null,
      sampleErrorMessage: sampleResult.error?.message || null,
    };
  }

  const results = await Promise.all([
    ...tables.map((table) => checkTable(table)),
  ]);

  return Response.json({
    ok: true,
    supabaseUrlExists: Boolean(url),
    anonKeyExists: Boolean(key),
    anonKeyLength: key.length,
    results,
  });
}
