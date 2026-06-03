import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface EventMember {
  uid: string | null;
  nickname: string;
}

export interface EventResult {
  id: number;
  event_name: string;
  event_date: string | null;
  poster_url: string | null;
  champions: EventMember[];
  sponsors: EventMember[];
}

export interface TeamMember {
  id: number;
  event_id: number;
  team_id: number;
  uid: string | null;
  nickname: string;
  power: number | null;
}

export interface EventTeam {
  id: number;
  event_id: number;
  team_name: string;
  total_power: number | null;
  members: TeamMember[];
}

export async function getEventResults(limit?: number): Promise<EventResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  let query = supabase
    .from("event_results_v2")
    .select("id,event_name,event_date,poster_url,champions,sponsors")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (limit && limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) {
    console.error(error);
    return [];
  }

  return data as EventResult[];
}

/** 按 id 获取单场赛事 */
export async function getEventById(eventId: number): Promise<EventResult | null> {
  if (!isSupabaseConfigured() || !eventId || Number.isNaN(eventId)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_results_v2")
    .select("id,event_name,event_date,poster_url,champions,sponsors")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return data as EventResult;
}

/** 获取赛事队伍和队员信息 */
export async function getEventTeams(event_id: number): Promise<EventTeam[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // 查询所有队伍
  const { data: teams, error: teamsError } = await supabase
    .from("event_teams")
    .select("*")
    .eq("event_id", event_id)
    .order("id", { ascending: true });

  if (teamsError || !teams) {
    console.error(teamsError);
    return [];
  }

  // 查询每个队伍成员
  const result: EventTeam[] = [];
  for (const team of teams) {
    const { data: members, error: membersError } = await supabase
      .from("event_team_members")
      .select("id,uid,nickname,power")
      .eq("event_id", event_id)
      .eq("team_id", team.id)
      .order("id", { ascending: true });

    if (membersError) {
      console.error(membersError);
      continue;
    }

    result.push({
      id: Number(team.id),
      event_id: Number(team.event_id ?? event_id),
      team_name: String(team.team_name ?? ""),
      total_power:
        team.total_power != null ? Number(team.total_power) : null,
      members: (members ?? []).map((row, index) => ({
        id: Number(row.id ?? index),
        event_id,
        team_id: Number(team.id),
        uid: row.uid ? String(row.uid) : null,
        nickname: String(row.nickname ?? ""),
        power: row.power != null ? Number(row.power) : null,
      })),
    });
  }

  return result;
}

/** 首页显示最近 N 场赛事 */
export function getRecentEventResults(limit = 3) {
  return getEventResults(limit);
}