import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** 从 event_team_members 统计：每场赛事参与 +1（按 event_id 去重） */
export async function getEventActivityCounts(): Promise<Map<string, number>> {
  if (!isSupabaseConfigured()) return new Map();

  const supabase = await createClient();
  if (!supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("event_team_members")
    .select("uid, event_id")
    .not("uid", "is", null);

  if (error || !data) {
    console.error("getEventActivityCounts:", error);
    return new Map();
  }

  const eventsByUid = new Map<string, Set<number>>();

  for (const row of data) {
    const uid = String(row.uid ?? "").trim();
    if (!uid) continue;
    const eventId = Number(row.event_id);
    if (Number.isNaN(eventId)) continue;

    let set = eventsByUid.get(uid);
    if (!set) {
      set = new Set();
      eventsByUid.set(uid, set);
    }
    set.add(eventId);
  }

  const counts = new Map<string, number>();
  for (const [uid, events] of eventsByUid) {
    counts.set(uid, events.size);
  }
  return counts;
}

export async function getPlayerEventActivity(uid: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = await createClient();
  if (!supabase) {
    return 0;
  }
  const normalizedUid = decodeURIComponent(uid);

  const { data, error } = await supabase
    .from("event_team_members")
    .select("event_id")
    .eq("uid", normalizedUid);

  if (error || !data) {
    console.error("getPlayerEventActivity:", error);
    return 0;
  }

  const events = new Set<number>();
  for (const row of data) {
    const eventId = Number(row.event_id);
    if (!Number.isNaN(eventId)) events.add(eventId);
  }
  return events.size;
}
