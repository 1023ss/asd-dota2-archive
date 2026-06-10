import type { SupabaseClient } from "@supabase/supabase-js";

export interface PowerBreakdown {
  uid: string;
  nickname: string;
  base_power: number;
  active_adjustment: number;
  newcomer_bonus: number;
  legacy_champion_bonus: number;
  auto_champion_bonus: number;
  final_power: number;
  current_power: number | null;
  activity_bonus: number | null;
  performance_adjustment: number | null;
  ranking_adjustment: number | null;
}

type Row = Record<string, unknown>;

interface EventRow {
  id: number;
  event_date?: string | null;
  champions?: unknown;
}

interface TeamRow {
  id: number;
  event_id: number;
}

interface MemberRow {
  event_id: number;
  team_id: number | null;
  uid: string | null;
  nickname: string | null;
}

interface PowerSourceRow extends Row {
  uid: string;
}

function asNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeUid(uid: unknown): string {
  return String(uid ?? "").trim().toUpperCase();
}

function normalizeName(name: unknown): string {
  return String(name ?? "").trim();
}

function addEventForUid(
  target: Map<string, Set<number>>,
  uid: string,
  eventId: number
) {
  const normalized = normalizeUid(uid);
  if (!normalized || !Number.isFinite(eventId)) return;

  let events = target.get(normalized);
  if (!events) {
    events = new Set();
    target.set(normalized, events);
  }
  events.add(eventId);
}

function parseChampionKeys(champions: unknown) {
  const uids = new Set<string>();
  const names = new Set<string>();

  if (!Array.isArray(champions)) {
    return { uids, names };
  }

  for (const member of champions) {
    if (typeof member === "string") {
      const name = normalizeName(member);
      if (name) names.add(name);
      continue;
    }

    if (member && typeof member === "object") {
      const row = member as Row;
      const uid = normalizeUid(row.uid);
      const nickname = normalizeName(row.nickname);
      if (uid) uids.add(uid);
      if (nickname) names.add(nickname);
    }
  }

  return { uids, names };
}

function memberMatchesChampion(
  member: MemberRow,
  championUids: Set<string>,
  championNames: Set<string>
) {
  const uid = normalizeUid(member.uid);
  const nickname = normalizeName(member.nickname);
  return (
    (uid && championUids.has(uid)) ||
    (nickname && championNames.has(nickname))
  );
}

async function getChampionBonusStartEventId(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "champion_bonus_start_event_id")
      .maybeSingle();

    if (error || !data) {
      return 42;
    }

    const value = Number(data.value);
    return Number.isFinite(value) ? Math.floor(value) : 42;
  } catch {
    return 42;
  }
}

async function fetchFinishedEvents(supabase: SupabaseClient): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("event_results_v2")
    .select("id,event_date,champions")
    .eq("status", "finished")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error || !data) {
    console.error("fetchFinishedEvents:", error);
    return [];
  }

  return data.map((row) => ({
    id: Number(row.id),
    event_date: row.event_date ?? null,
    champions: row.champions,
  }));
}

async function fetchTeamsByEventIds(
  supabase: SupabaseClient,
  eventIds: number[]
): Promise<TeamRow[]> {
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("event_teams")
    .select("id,event_id")
    .in("event_id", eventIds);

  if (error || !data) {
    console.error("fetchTeamsByEventIds:", error);
    return [];
  }

  return data.map((row) => ({
    id: Number(row.id),
    event_id: Number(row.event_id),
  }));
}

async function fetchMembersByEventIds(
  supabase: SupabaseClient,
  eventIds: number[]
): Promise<MemberRow[]> {
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("event_team_members")
    .select("event_id,team_id,uid,nickname")
    .in("event_id", eventIds);

  if (error || !data) {
    console.error("fetchMembersByEventIds:", error);
    return [];
  }

  return data.map((row) => ({
    event_id: Number(row.event_id),
    team_id: row.team_id == null ? null : Number(row.team_id),
    uid: row.uid == null ? null : String(row.uid),
    nickname: row.nickname == null ? null : String(row.nickname),
  }));
}

async function fetchAllMembers(supabase: SupabaseClient): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("event_team_members")
    .select("event_id,team_id,uid,nickname")
    .not("uid", "is", null);

  if (error || !data) {
    console.error("fetchAllMembers:", error);
    return [];
  }

  return data.map((row) => ({
    event_id: Number(row.event_id),
    team_id: row.team_id == null ? null : Number(row.team_id),
    uid: row.uid == null ? null : String(row.uid),
    nickname: row.nickname == null ? null : String(row.nickname),
  }));
}

function getActiveAdjustments(
  recentFinishedEvents: EventRow[],
  recentMembers: MemberRow[]
) {
  const recentEventIds = new Set(recentFinishedEvents.slice(0, 3).map((e) => e.id));
  const eventsByUid = new Map<string, Set<number>>();

  for (const member of recentMembers) {
    if (!recentEventIds.has(member.event_id)) continue;
    addEventForUid(eventsByUid, String(member.uid ?? ""), member.event_id);
  }

  const adjustments = new Map<string, number>();
  for (const [uid, events] of eventsByUid) {
    adjustments.set(uid, -Math.min(3, events.size));
  }
  return adjustments;
}

function getParticipationCounts(members: MemberRow[]) {
  const eventsByUid = new Map<string, Set<number>>();

  for (const member of members) {
    addEventForUid(eventsByUid, String(member.uid ?? ""), member.event_id);
  }

  const counts = new Map<string, number>();
  for (const [uid, events] of eventsByUid) {
    counts.set(uid, events.size);
  }
  return counts;
}

function getAutoChampionBonuses(
  events: EventRow[],
  teams: TeamRow[],
  members: MemberRow[],
  startEventId: number
) {
  const teamEvent = new Map(teams.map((team) => [team.id, team.event_id]));
  const membersByEvent = new Map<number, MemberRow[]>();
  const membersByTeam = new Map<number, MemberRow[]>();

  for (const member of members) {
    let eventMembers = membersByEvent.get(member.event_id);
    if (!eventMembers) {
      eventMembers = [];
      membersByEvent.set(member.event_id, eventMembers);
    }
    eventMembers.push(member);

    if (member.team_id != null) {
      let teamMembers = membersByTeam.get(member.team_id);
      if (!teamMembers) {
        teamMembers = [];
        membersByTeam.set(member.team_id, teamMembers);
      }
      teamMembers.push(member);
    }
  }

  const bonuses = new Map<string, number>();

  for (const event of events) {
    if (event.id < startEventId) continue;

    const { uids, names } = parseChampionKeys(event.champions);
    if (uids.size === 0 && names.size === 0) continue;

    const championTeamIds = new Set<number>();
    for (const member of membersByEvent.get(event.id) ?? []) {
      if (
        member.team_id != null &&
        memberMatchesChampion(member, uids, names) &&
        teamEvent.get(member.team_id) === event.id
      ) {
        championTeamIds.add(member.team_id);
      }
    }

    const eventChampionUids = new Set<string>();
    for (const teamId of championTeamIds) {
      for (const member of membersByTeam.get(teamId) ?? []) {
        if (member.event_id !== event.id) continue;
        const uid = normalizeUid(member.uid);
        if (uid) eventChampionUids.add(uid);
      }
    }

    for (const uid of eventChampionUids) {
      bonuses.set(uid, (bonuses.get(uid) ?? 0) + 1);
    }
  }

  return bonuses;
}

async function buildPowerBreakdowns(
  supabase: SupabaseClient,
  powerRows: PowerSourceRow[],
  userRows: Row[],
  sortBy: "final_power" | "uid"
) {
  const [
    startEventId,
    finishedEvents,
    allMembers,
  ] = await Promise.all([
    getChampionBonusStartEventId(supabase),
    fetchFinishedEvents(supabase),
    fetchAllMembers(supabase),
  ]);

  const finishedEventIds = finishedEvents.map((event) => event.id);
  const [finishedTeams, finishedMembers] = await Promise.all([
    fetchTeamsByEventIds(supabase, finishedEventIds),
    fetchMembersByEventIds(supabase, finishedEventIds),
  ]);

  const userMap = new Map(
    userRows.map((row) => [normalizeUid(row.uid), row])
  );
  const activeAdjustments = getActiveAdjustments(finishedEvents, finishedMembers);
  const participationCounts = getParticipationCounts(allMembers);
  const championBonuses = getAutoChampionBonuses(
    finishedEvents,
    finishedTeams,
    finishedMembers,
    startEventId
  );

  return powerRows
    .map((powerRow) => {
      const uid = normalizeUid(powerRow.uid);
      const user = userMap.get(uid);
      const basePower = asNumber(powerRow.base_power, 0);
      const activeAdjustment = activeAdjustments.get(uid) ?? 0;
      const isNewPlayer = Boolean(user?.is_new_player);
      const historicalCount = participationCounts.get(uid) ?? 0;
      const newcomerBonus = isNewPlayer ? Math.max(0, 3 - historicalCount) : 0;
      const legacyChampionBonus = asNumber(user?.legacy_champion_bonus, 0);
      const autoChampionBonus = championBonuses.get(uid) ?? 0;
      const finalPower =
        basePower +
        activeAdjustment +
        newcomerBonus +
        legacyChampionBonus +
        autoChampionBonus;

      return {
        uid,
        nickname: normalizeName(user?.nickname) || uid,
        base_power: basePower,
        active_adjustment: activeAdjustment,
        newcomer_bonus: newcomerBonus,
        legacy_champion_bonus: legacyChampionBonus,
        auto_champion_bonus: autoChampionBonus,
        final_power: finalPower,
        current_power: asNullableNumber(powerRow.current_power),
        activity_bonus: asNullableNumber(powerRow.activity_bonus),
        performance_adjustment: asNullableNumber(powerRow.performance_adjustment),
        ranking_adjustment: asNullableNumber(powerRow.ranking_adjustment),
      };
    })
    .sort((a, b) => {
      if (sortBy === "final_power") {
        return b.final_power - a.final_power || a.uid.localeCompare(b.uid, "zh-CN");
      }

      return a.uid.localeCompare(b.uid, "zh-CN");
    });
}

export async function getCalculatedPowerRows(
  supabase: SupabaseClient,
  uids?: string[]
): Promise<PowerBreakdown[]> {
  const normalizedUids = uids?.map(normalizeUid).filter(Boolean);

  let powerQuery = supabase.from("power_records").select("*");
  if (normalizedUids?.length) {
    powerQuery = powerQuery.in("uid", normalizedUids);
  }

  const { data: powerRows, error: powerError } = await powerQuery;
  if (powerError || !powerRows?.length) {
    console.error("getCalculatedPowerRows power_records:", powerError);
    return [];
  }

  const powerUids = powerRows.map((row) => normalizeUid(row.uid)).filter(Boolean);

  const userResult = await supabase
    .from("users")
    .select("uid,nickname,is_new_player,legacy_champion_bonus")
    .in("uid", powerUids);

  if (userResult.error) {
    console.error("getCalculatedPowerRows users:", userResult.error);
  }

  return buildPowerBreakdowns(
    supabase,
    powerRows as PowerSourceRow[],
    (userResult.data ?? []) as Row[],
    "final_power"
  );
}

export async function getCalculatedPowerRowsForUsers(
  supabase: SupabaseClient,
  uids?: string[]
): Promise<PowerBreakdown[]> {
  const normalizedUids = uids?.map(normalizeUid).filter(Boolean);

  let userQuery = supabase
    .from("users")
    .select("uid,nickname,is_new_player,legacy_champion_bonus");

  if (normalizedUids?.length) {
    userQuery = userQuery.in("uid", normalizedUids);
  }

  const { data: userRows, error: userError } = await userQuery;
  if (userError || !userRows?.length) {
    console.error("getCalculatedPowerRowsForUsers users:", userError);
    return [];
  }

  const userUids = userRows.map((row) => normalizeUid(row.uid)).filter(Boolean);
  if (!userUids.length) return [];

  const { data: powerRows, error: powerError } = await supabase
    .from("power_records")
    .select("*")
    .in("uid", userUids);

  if (powerError) {
    console.error("getCalculatedPowerRowsForUsers power_records:", powerError);
  }

  const powerMap = new Map(
    (powerRows ?? []).map((row) => [normalizeUid(row.uid), row as PowerSourceRow])
  );

  const completePowerRows = userUids.map(
    (uid) => powerMap.get(uid) ?? ({ uid, base_power: 0 } as PowerSourceRow)
  );

  return buildPowerBreakdowns(
    supabase,
    completePowerRows,
    userRows as Row[],
    "uid"
  );
}

export async function getCalculatedPowerMap(
  supabase: SupabaseClient,
  uids?: string[]
) {
  const rows = await getCalculatedPowerRows(supabase, uids);
  return new Map(rows.map((row) => [row.uid, row]));
}
