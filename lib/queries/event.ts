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
  event_type?: string | null;
  status?: string | null;
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
  team_no: number | null;
  team_name: string;
  total_power: number | null;
  captain_uid: string | null;
  can_edit: boolean | null;
  members: TeamMember[];
}

export async function getEventResults(limit?: number): Promise<EventResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

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
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("event_results_v2")
    .select("id,event_name,event_date,poster_url,champions,sponsors,event_type,status")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return data as EventResult;
}

/** 获取赛事队伍和队员信息 */
export async function getEventTeams(eventId: number): Promise<EventTeam[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  const { data: teams, error: teamsError } = await supabase
    .from("event_teams")
    .select("id,event_id,team_no,team_name,total_power,captain_uid,can_edit")
    .eq("event_id", eventId)
    .order("team_no", { ascending: true})
    .order("id", { ascending: true });

  if (teamsError || !teams) {
    console.error(teamsError);
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from("event_team_members")
    .select("id,event_id,team_id,uid,nickname,power")
    .eq("event_id", eventId)
    .order("team_id", { ascending: true })
    .order("id", { ascending: true });

  if (membersError || !members) {
    console.error(membersError);

    return teams.map((team) => ({
      ...team,
      members: [],
    })) as EventTeam[];
  }

  return teams.map((team) => ({
    ...team,
    members: members.filter((member) => member.team_id === team.id),
  })) as EventTeam[];
}

/** 首页显示最近 N 场赛事 */
export function getRecentEventResults(limit = 3) {
  return getEventResults(limit);
}
