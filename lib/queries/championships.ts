import championshipsData from "@/lib/data/championships.json";
import { getLocalPlayerByUid } from "@/lib/data/local";
import { getEventResults, type EventMember } from "@/lib/queries/event";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface Championship {
  id: number;
  event_name: string;
  uid: string;
  nickname: string;
}

interface ChampionshipRow {
  event_name: string;
  champions: string[];
  poster_url: string | null;
}

const localRows = championshipsData as ChampionshipRow[];

function uidMatches(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isEventChampion(
  member: EventMember,
  uid: string,
  nickname: string | null
) {
  if (member.uid && uidMatches(member.uid, uid)) return true;
  if (!nickname || !member.nickname) return false;
  return member.nickname.trim() === nickname.trim();
}

function getLocalChampionships(uid: string, nickname: string): Championship[] {
  const seen = new Set<string>();
  let id = 0;

  return localRows
    .filter(
      (row) =>
        Array.isArray(row.champions) && row.champions.includes(nickname)
    )
    .filter((row) => {
      if (seen.has(row.event_name)) return false;
      seen.add(row.event_name);
      return true;
    })
    .map((row) => ({
      id: ++id,
      event_name: row.event_name,
      uid,
      nickname,
    }));
}

/** event_results_v2 优先，本地 JSON 仅作未配置 Supabase 时的回退 */
function mergeChampionships(
  uid: string,
  nickname: string,
  primary: Championship[],
  fallback: Championship[] = []
): Championship[] {
  const seen = new Set<string>();
  const merged: Championship[] = [];

  for (const item of [...primary, ...fallback]) {
    const key = item.event_name.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: item.id,
      event_name: item.event_name,
      uid,
      nickname: item.nickname || nickname,
    });
  }

  return merged.sort((a, b) =>
    a.event_name.localeCompare(b.event_name, "zh-CN")
  );
}

async function resolvePlayerNickname(uid: string): Promise<string | null> {
  const local = getLocalPlayerByUid(uid);
  if (local?.nickname) return local.nickname;

  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("nickname")
    .eq("uid", uid)
    .maybeSingle();

  return data?.nickname ? String(data.nickname) : null;
}

function championshipsFromEvents(
  events: Awaited<ReturnType<typeof getEventResults>>,
  uid: string,
  nickname: string | null
): Championship[] {
  return events
    .filter((event) =>
      event.champions?.some((member) =>
        isEventChampion(member, uid, nickname)
      )
    )
    .map((event) => ({
      id: event.id,
      event_name: event.event_name,
      uid,
      nickname: nickname ?? "",
    }));
}

export async function getPlayerChampionships(
  uid: string
): Promise<Championship[]> {
  const normalizedUid = decodeURIComponent(uid);
  const nickname = await resolvePlayerNickname(normalizedUid);
  const displayNickname =
    nickname ?? getLocalPlayerByUid(normalizedUid)?.nickname ?? "";

  if (isSupabaseConfigured()) {
    const events = await getEventResults();
    const fromEvents = championshipsFromEvents(
      events,
      normalizedUid,
      nickname
    );

    const fromLocal =
      displayNickname
        ? getLocalChampionships(normalizedUid, displayNickname)
        : [];

    return mergeChampionships(
      normalizedUid,
      displayNickname,
      fromEvents,
      fromLocal
    );
  }

  if (!displayNickname) return [];
  return getLocalChampionships(normalizedUid, displayNickname);
}
