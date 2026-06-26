import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/keys";
import { getProfilesMap } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import type { InviteCode, MemberRole, SpaceMember } from "@/lib/types";
import { useAuth } from "@/providers/auth";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 7): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export function useMembers(spaceId: string) {
  return useQuery({
    queryKey: qk.members(spaceId),
    enabled: !!spaceId,
    queryFn: async (): Promise<SpaceMember[]> => {
      const { data, error } = await supabase
        .from("space_members")
        .select("*")
        .eq("space_id", spaceId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const members = (data ?? []) as SpaceMember[];
      const profiles = await getProfilesMap(members.map((m) => m.user_id));
      const roleRank: Record<MemberRole, number> = { owner: 0, member: 1, observer: 2 };
      return members
        .map((m) => ({ ...m, profile: profiles[m.user_id] ?? null }))
        .sort((a, b) => roleRank[a.role] - roleRank[b.role]);
    },
  });
}

interface UpdateMemberInput {
  spaceId: string;
  userId: string;
  patch: Partial<Pick<SpaceMember, "role" | "can_create_episodes">>;
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, userId, patch }: UpdateMemberInput): Promise<void> => {
      const { error } = await supabase
        .from("space_members")
        .update(patch)
        .eq("space_id", spaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.members(variables.spaceId) });
      queryClient.invalidateQueries({ queryKey: qk.space(variables.spaceId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, userId }: { spaceId: string; userId: string }): Promise<void> => {
      const { error } = await supabase.from("space_members").delete().eq("space_id", spaceId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.members(variables.spaceId) });
    },
  });
}

export function useInviteCodes(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: qk.invites(spaceId),
    enabled: !!spaceId && enabled,
    queryFn: async (): Promise<InviteCode[]> => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteCode[];
    },
  });
}

interface CreateInviteInput {
  spaceId: string;
  role: MemberRole;
  maxUses: number | null;
  expiresAt: string | null;
}

export function useCreateInviteCode() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, role, maxUses, expiresAt }: CreateInviteInput): Promise<InviteCode> => {
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          code: generateCode(),
          space_id: spaceId,
          role,
          max_uses: maxUses,
          use_count: 0,
          expires_at: expiresAt,
          created_by: userId,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as InviteCode;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.invites(variables.spaceId) });
    },
  });
}

export function useRevokeInviteCode(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (codeId: string): Promise<void> => {
      const { error } = await supabase.from("invite_codes").delete().eq("id", codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.invites(spaceId) });
    },
  });
}
