import type { Player } from "@/types/player";
import playersData from "./players.json";

const players: Player[] = (playersData as Omit<Player, "tag">[]).map(
  (p) => ({
    ...p,
    tag: null,
  })
);

export function getLocalPlayers(): Player[] {
  return [...players].sort(
    (a, b) => (b.current_power ?? 0) - (a.current_power ?? 0)
  );
}

export function getLocalPlayerByUid(uid: string): Player | undefined {
  return players.find(
    (p) => p.uid.toLowerCase() === decodeURIComponent(uid).toLowerCase()
  );
}

export function getLocalStats() {
  const list = getLocalPlayers();
  return {
    totalPlayers: list.length,
    topPower: list[0]?.current_power ?? 0,
    newPlayers: list.filter((p) => p.is_new_player).length,
  };
}
