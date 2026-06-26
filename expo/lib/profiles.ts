import { supabase } from "./supabase";
import type { Profile } from "./types";

/**
 * Fetches profiles for a set of user ids and returns them keyed by id.
 * Used to join authorship client-side (more robust than relying on PostgREST
 * embeds, since FKs may point at auth.users rather than profiles).
 */
export async function getProfilesMap(ids: (string | null | undefined)[]): Promise<Record<string, Profile>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("*").in("id", unique);
  if (error) throw error;
  const map: Record<string, Profile> = {};
  for (const profile of (data ?? []) as Profile[]) {
    map[profile.id] = profile;
  }
  return map;
}
