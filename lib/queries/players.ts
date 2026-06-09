import {
  getLocalPlayerByUid,
  getLocalPlayers,
  getLocalStats,
} from "@/lib/data/local";
import championshipsData from "@/lib/data/championships.json";
import { getEventActivityCounts } from "@/lib/queries/activity";
import {
  getCalculatedPowerMap,
  getCalculatedPowerRows,
  type PowerBreakdown,
} from "@/lib/queries/power";
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
  power?: (Record<string, unknown> & Partial<PowerBreakdown>) | null
): Player {
  const basePower = power?.base_power != null ? Number(power.base_power) : null;
  const finalPower =
    power?.final_power != null
      ? Number(power.final_power)
      : power?.current_power != null
        ? Number(power.current_power)
        : basePower;

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
    base_power: basePower,
    active_adjustment:
      power?.active_adjustment != null ? Number(power.active_adjustment) : 0,
    newcomer_bonus:
      power?.newcomer_bonus != null ? Number(power.newcomer_bonus) : 0,
    legacy_champion_bonus:
      power?.legacy_champion_bonus != null
        ? Number(power.legacy_champion_bonus)
        : 0,
    auto_champion_bonus:
      power?.auto_champion_bonus != null
        ? Number(power.auto_champion_bonus)
        : 0,
    final_power: finalPower,
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
  const powerRows = await getCalculatedPowerRows(supabase).catch((error) => {
    console.error("fetchLeaderboardWithJoin calculated power:", error);
    return [];
  });
  if (!powerRows.length) {
    return null;
  }

  const profiles = await fetchUserProfilesMap(
    supabase,
    powerRows.map((row) => row.uid)
  );

  return powerRows.map((row) =>
    mergeWithLocalProfile(row.uid, row as unknown as Record<string, unknown>, profiles)
  );
}

async function fetchLeaderboardPowerOnly(
  supabase: SupabaseClient
): Promise<Player[] | null> {
  const { data: powerRows, error } = await supabase
    .from("power_records")
    .select(
      "uid, base_power, activity_bonus, performance_adjustment, ranking_adjustment, current_power"
    )
    .not("base_power", "is", null)
    .order("base_power", { ascending: false });

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
  if (!supabase) {
    return attachEventActivity(getLocalPlayers(), activityCounts);
  }

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
          active_adjustment: 0,
          newcomer_bonus: 0,
          legacy_champion_bonus: 0,
          auto_champion_bonus: 0,
          final_power: null,
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
  if (!supabase) {
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
          active_adjustment: 0,
          newcomer_bonus: 0,
          legacy_champion_bonus: 0,
          auto_champion_bonus: 0,
          final_power: null,
          activity_bonus: null,
          performance_adjustment: null,
          ranking_adjustment: null,
          current_power: null,
        }),
        event_activity,
      };
    });
  }

  const uids = top.map(([uid]) => uid);
  const profiles = await fetchUserProfilesMap(supabase, uids);

  const powerMap = await getCalculatedPowerMap(supabase, uids).catch((error) => {
    console.error("getActivityLeaderboard calculated power:", error);
    return new Map();
  });

  return top.map(([uid, event_activity]) => ({
    ...mergeWithLocalProfile(
      uid,
      (powerMap.get(uid) as unknown as Record<string, unknown>) ?? null,
      profiles
    ),
    event_activity,
  }));
}

export async function getPlayerByUid(uid: string): Promise<Player | null> {
  if (!isSupabaseConfigured()) {
    return getLocalPlayerByUid(uid) ?? null;
  }

  const supabase = await createClient();
  if (!supabase) {
    return getLocalPlayerByUid(uid) ?? null;
  }

  const normalizedUid = decodeURIComponent(uid);

  const powerMap = await getCalculatedPowerMap(supabase, [normalizedUid]).catch(
    (error) => {
      console.error("getPlayerByUid calculated power:", error);
      return new Map();
    }
  );
  const powerRow = powerMap.get(normalizedUid.toUpperCase());

  const { data: playerRow, error: playerError } = await supabase
    .from("users")
    .select(USER_PROFILE_FIELDS)
    .eq("uid", normalizedUid)
    .maybeSingle();

  if (playerError) {
    console.error("getPlayerByUid users:", playerError);
  }

  if (playerRow && !playerError) {
    return mapSupabaseRow(
      playerRow,
      powerRow as unknown as Record<string, unknown>
    );
  }

  if (powerRow) {
    const profiles = await fetchUserProfilesMap(supabase, [normalizedUid]);
    return mergeWithLocalProfile(
      normalizedUid,
      powerRow as unknown as Record<string, unknown>,
      profiles
    );
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
  if (!supabase) {
    return {
      ...getLocalStats(),
      eventCount: getLocalEventCount(),
    };
  }

  const powerRows = await getCalculatedPowerRows(supabase).catch((error) => {
    console.error("getArchiveStats calculated power:", error);
    return [];
  });

  const { count: playerCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: powerCount } = await supabase
    .from("power_records")
    .select("*", { count: "exact", head: true })
    .not("base_power", "is", null);

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
    topPower: powerRows[0]?.final_power ?? 0,
    eventCount: eventCount ?? getLocalEventCount(),
  };
}
