import {
  getLocalPlayerByUid,
  getLocalPlayers,
  getLocalStats,
} from "@/lib/data/local";
import championshipsData from "@/lib/data/championships.json";
import { getEventActivityCounts } from "@/lib/queries/activity";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Player } from "@/types/player";
import type { SupabaseClient } from "@supabase/supabase-js";

function localPlayerMap(): Map<string, Player> {
  return new Map(getLocalPlayers().map((p) => [p.uid, p]));
}

function normalizeTag(row: Record<string, unknown>): string | null {
  const raw = row.tag ?? row.tags;
  if (raw == null) return null;
  const text = String(raw).trim();
  return text.length > 0 ? text : null;
}

function mapSupabaseRow(
  row: Record<string, unknown>,
  power?: Record<string, unknown> | null
): Player {
  return {
    uid: String(row.uid),
    nickname: String(row.nickname ?? ""),
    tag: normalizeTag(row),
    group_id: (row.group_id as string) || null,
    avatar_url: (row.avatar_url as string) || null,
    position: (row.position as string) || null,
    self_description: (row.self_description as string) || null,
    is_new_player: Boolean(row.is_new_player),
    steam_id: (row.steam_id as string) || null,
    base_power: power?.base_power != null ? Number(power.base_power) : null,
    activity_bonus:
      power?.activity_bonus != null ? Number(power.activity_bonus) : null,
    performance_adjustment:
      power?.performance_adjustment != null
        ? Number(power.performance_adjustment)
        : null,
    ranking_adjustment:
      power?.ranking_adjustment != null
        ? Number(power.ranking_adjustment)
        : null,
    current_power:
      power?.current_power != null ? Number(power.current_power) : null,
  };
}

function mergeWithLocalProfile(
  uid: string,
  power: Record<string, unknown> | null,
  profiles: Map<string, Record<string, unknown>>
): Player {
  return mapSupabaseRow(profileForUid(uid, profiles), power);
}

const USER_PROFILE_FIELDS = "*";

async function fetchUserProfilesMap(
  supabase: SupabaseClient,
  uids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  if (!uids.length) return new Map();

  const { data, error } = await supabase
    .from("users")
    .select(USER_PROFILE_FIELDS)
    .in("uid", uids);

  if (error) {
    console.error("fetchUserProfilesMap:", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [String(row.uid), row as Record<string, unknown>])
  );
}

function profileForUid(
  uid: string,
  profiles: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  return (
    profiles.get(uid) ??
    (localPlayerMap().get(uid) as unknown as Record<string, unknown>) ??
    { uid, nickname: uid }
  );
}

function getLocalEventCount(): number {
  const rows = championshipsData as Array<{ event_name?: string }>;
  return new Set(
    rows
      .map((row) => row.event_name?.trim())
      .filter((name): name is string => Boolean(name))
  ).size;
}

async function fetchLeaderboardWithJoin(
  supabase: SupabaseClient
): Promise<Player[] | null> {
  const { data: powerRows, error } = await supabase
    .from("power_records")
    .select(
      `
      uid,
      base_power,
      activity_bonus,
      performance_adjustment,
      ranking_adjustment,
      current_power,
      users (*)
    `
    )
    .not("current_power", "is", null)
    .order("current_power", { ascending: false });

  if (error) {
    console.error("fetchLeaderboardWithJoin:", error);
  }
  if (error || !powerRows?.length) {
    return null;
  }

  return powerRows.map((row) => {
    const joined = row.users;
    const player = Array.isArray(joined)
      ? (joined[0] as Record<string, unknown> | undefined)
      : (joined as Record<string, unknown> | null);
    return mapSupabaseRow(player ?? { uid: row.uid }, row);
  });
}

async function fetchLeaderboardPowerOnly(
  supabase: SupabaseClient
): Promise<Player[] | null> {
  const { data: powerRows, error } = await supabase
    .from("power_records")
    .select(
      "uid, base_power, activity_bonus, performance_adjustment, ranking_adjustment, current_power"
    )
    .not("current_power", "is", null)
    .order("current_power", { ascending: false });

  if (error || !powerRows?.length) {
    return null;
  }

  const uids = powerRows.map((row) => String(row.uid));
  const profiles = await fetchUserProfilesMap(supabase, uids);

  return powerRows.map((row) =>
    mergeWithLocalProfile(
      String(row.uid),
      row as Record<string, unknown>,
      profiles
    )
  );
}

function attachEventActivity(
  players: Player[],
  counts: Map<string, number>
): Player[] {
  return players.map((player) => ({
    ...player,
    event_activity: counts.get(player.uid) ?? 0,
  }));
}

export async function getLeaderboard(): Promise<Player[]> {
  const activityCounts = await getEventActivityCounts();

  if (!isSupabaseConfigured()) {
    return attachEventActivity(getLocalPlayers(), activityCounts);
  }

  const supabase = await createClient();
  const joined = await fetchLeaderboardWithJoin(supabase);
  if (joined?.length) {
    return attachEventActivity(joined, activityCounts);
  }

  const powerOnly = await fetchLeaderboardPowerOnly(supabase);
  if (powerOnly?.length) {
    return attachEventActivity(powerOnly, activityCounts);
  }

  return attachEventActivity(getLocalPlayers(), activityCounts);
}

/** 活跃玩家排行：按参赛场数（每场 +1）降序 */
export async function getActivityLeaderboard(limit = 10): Promise<Player[]> {
  const counts = await getEventActivityCounts();
  if (counts.size === 0) return [];

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit);

  if (!isSupabaseConfigured()) {
    return top.map(([uid, event_activity]) => {
      const local = getLocalPlayerByUid(uid);
      return {
        ...(local ?? {
          uid,
          nickname: uid,
          tag: null,
          group_id: null,
          avatar_url: null,
          position: null,
          self_description: null,
          is_new_player: false,
          steam_id: null,
          base_power: null,
          activity_bonus: null,
          performance_adjustment: null,
          ranking_adjustment: null,
          current_power: null,
        }),
        event_activity,
      };
    });
  }

  const supabase = await createClient();
  const uids = top.map(([uid]) => uid);
  const profiles = await fetchUserProfilesMap(supabase, uids);

  const { data: powerRows } = await supabase
    .from("power_records")
    .select(
      "uid, base_power, activity_bonus, performance_adjustment, ranking_adjustment, current_power"
    )
    .in("uid", uids);

  const powerMap = new Map(
    (powerRows ?? []).map((row) => [String(row.uid), row as Record<string, unknown>])
  );

  return top.map(([uid, event_activity]) => ({
    ...mergeWithLocalProfile(uid, powerMap.get(uid) ?? null, profiles),
    event_activity,
  }));
}

export async function getPlayerByUid(uid: string): Promise<Player | null> {
  if (!isSupabaseConfigured()) {
    return getLocalPlayerByUid(uid) ?? null;
  }

  const supabase = await createClient();
  const normalizedUid = decodeURIComponent(uid);

  const { data: powerRow, error: powerError } = await supabase
    .from("power_records")
    .select("*")
    .eq("uid", normalizedUid)
    .maybeSingle();

  const { data: playerRow, error: playerError } = await supabase
    .from("users")
    .select(USER_PROFILE_FIELDS)
    .eq("uid", normalizedUid)
    .maybeSingle();

  if (playerError) {
    console.error("getPlayerByUid users:", playerError);
  }

  if (playerRow && !playerError) {
    return mapSupabaseRow(playerRow, powerRow);
  }

  if (powerRow && !powerError) {
    const profiles = await fetchUserProfilesMap(supabase, [normalizedUid]);
    return mergeWithLocalProfile(normalizedUid, powerRow, profiles);
  }

  return getLocalPlayerByUid(uid) ?? null;
}

export async function getArchiveStats() {
  if (!isSupabaseConfigured()) {
    return {
      ...getLocalStats(),
      eventCount: getLocalEventCount(),
    };
  }

  const supabase = await createClient();

  const { data: topRow } = await supabase
    .from("power_records")
    .select("current_power")
    .not("current_power", "is", null)
    .order("current_power", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: playerCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: powerCount } = await supabase
    .from("power_records")
    .select("*", { count: "exact", head: true })
    .not("current_power", "is", null);

  const { count: eventCount } = await supabase
    .from("event_results_v2")
    .select("*", { count: "exact", head: true })
    .not("id", "is", null);

  const totalPlayers = playerCount || powerCount;
  if (!totalPlayers) {
    return {
      ...getLocalStats(),
      eventCount: getLocalEventCount(),
    };
  }

  return {
    totalPlayers,
    topPower: topRow?.current_power ?? 0,
    eventCount: eventCount ?? getLocalEventCount(),
  };
}
