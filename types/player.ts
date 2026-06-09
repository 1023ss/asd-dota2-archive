export interface Player {
  uid: string;
  nickname: string;
  tag: string | null;
  group_id: string | null;
  avatar_url: string | null;
  position: string | null;
  self_description: string | null;
  is_new_player: boolean;
  steam_id: string | null;
  base_power: number | null;
  active_adjustment: number | null;
  newcomer_bonus: number | null;
  legacy_champion_bonus: number | null;
  auto_champion_bonus: number | null;
  final_power: number | null;
  activity_bonus: number | null;
  performance_adjustment: number | null;
  ranking_adjustment: number | null;
  current_power: number | null;
  /** 参赛活跃值：event_team_members 按场次去重，每场 +1 */
  event_activity?: number | null;
}

export interface PlayerRow {
  uid: string;
  nickname: string;
  tag: string | null;
  group_id: string | null;
  avatar_url: string | null;
  position: string | null;
  self_description: string | null;
  is_new_player: boolean;
  steam_id: string | null;
}

export interface PowerRecordRow {
  uid: string;
  base_power: number | null;
  active_adjustment: number | null;
  newcomer_bonus: number | null;
  legacy_champion_bonus: number | null;
  auto_champion_bonus: number | null;
  final_power: number | null;
  activity_bonus: number | null;
  performance_adjustment: number | null;
  ranking_adjustment: number | null;
  current_power: number | null;
}
