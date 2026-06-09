import { getCalculatedPowerRows } from "@/lib/queries/power";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return Response.json({ ok: false, rows: [] });
    }

    const { searchParams } = new URL(request.url);
    const uids = searchParams
      .get("uids")
      ?.split(",")
      .map((uid) => uid.trim().toUpperCase())
      .filter(Boolean);

    const rows = await getCalculatedPowerRows(supabase, uids);
    return Response.json({ ok: true, rows });
  } catch (error) {
    console.error("GET /api/power:", error);
    return Response.json({ ok: false, rows: [] });
  }
}
