import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { sendPushNotification } from "./push";
import type {
  AppNotification,
  CreateInviteCodeDraft,
  CreateSpaceDraft,
  Episode,
  EpisodeComment,
  EpisodeCommentDraft,
  EpisodeCommentsResponse,
  EpisodeDraft,
  EpisodeMedia,
  EpisodeMediaUpload,
  Idea,
  IdeaStatus,
  InviteCode,
  Review,
  ReviewDraft,
  ReviewsResponse,
  Space,
  SpaceMember,
  Synthese,
} from "./types";

const LIVE_STALE_TIME = 60 * 1000;
const MEDIA_BUCKET = "episode-media";

// ============================================================
// QUERY KEYS — toujours scopés au space_id
// ============================================================

export const queryKeys = {
  spaces:            ()                          => ["spaces"]                                       as const,
  space:             (id: string)                => ["spaces", id]                                   as const,
  spaceMembers:      (id: string)                => ["spaces", id, "members"]                        as const,
  spaceInviteCodes:  (id: string)                => ["spaces", id, "invite-codes"]                   as const,
  episodes:          (spaceId: string)           => ["spaces", spaceId, "episodes"]                  as const,
  episodeReviews:    (spaceId: string, epId: string) => ["spaces", spaceId, "episodes", epId, "reviews"]  as const,
  episodeComments:   (spaceId: string, epId: string) => ["spaces", spaceId, "episodes", epId, "comments"] as const,
  ideas:             (spaceId: string)           => ["spaces", spaceId, "ideas"]                     as const,
  synthese:          (spaceId: string)           => ["spaces", spaceId, "synthese"]                  as const,
  notifications:     ()                          => ["notifications"]                                 as const,
};

// ============================================================
// HELPERS
// ============================================================

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function mediaTypeFromContentType(contentType: string): EpisodeMedia["type"] {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return "file";
}

// Storage path: {space_id}/{episode_id}/{timestamp}-{filename}
// Le premier segment est utilisé par la RLS du bucket pour vérifier l'appartenance à l'espace.
function mediaPath(spaceId: string, episodeId: string, filename: string): string {
  return `${spaceId}/${episodeId}/${Date.now()}-${filename}`;
}

async function uploadToMediaBucket(
  path: string,
  base64: string,
  contentType: string,
): Promise<{ url: string; size: number }> {
  const blob = base64ToBlob(base64, contentType);
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, size: blob.size };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("not_authenticated");
  return data.user.id;
}

// ============================================================
// ROW → DOMAIN MAPPERS
// ============================================================

function mapMediaRow(row: {
  id: string;
  url: string;
  filename: string;
  type: string;
  content_type: string | null;
  size: number | null;
  uploaded_by?: string | null;
}): EpisodeMedia {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    type: row.type as EpisodeMedia["type"],
    contentType: row.content_type ?? undefined,
    size: row.size ?? undefined,
    uploaded_by: row.uploaded_by ?? undefined,
  };
}

interface EpisodeRow {
  id: string;
  space_id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  duration: string | null;
  cover_url: string | null;
  notes: string | null;
  music_url: string | null;
  created_by: string;
  episode_media?: Parameters<typeof mapMediaRow>[0][];
  episode_likes?: { user_id: string }[];
}

function mapEpisodeRow(row: EpisodeRow, currentUserId: string | undefined): Episode {
  const likeRows = row.episode_likes ?? [];
  return {
    id: row.id,
    space_id: row.space_id,
    number: row.number,
    title: row.title,
    date: row.date,
    place: row.place,
    duration: row.duration ?? undefined,
    cover_url: row.cover_url ?? undefined,
    media: (row.episode_media ?? []).map(mapMediaRow),
    notes: row.notes ?? undefined,
    music_url: row.music_url ?? undefined,
    created_by: row.created_by,
    likes: likeRows.map((l) => l.user_id),
    my_like: currentUserId ? likeRows.some((l) => l.user_id === currentUserId) : null,
  };
}

function mapReviewRow(row: {
  id: string;
  episode_id: string;
  space_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  favorite_moment: string | null;
  awkward_moment: string | null;
  funny_quote: string | null;
  summary: string | null;
  would_redo: string | null;
  song: string | null;
  created_at?: string;
  updated_at?: string;
}): Review {
  return {
    id: row.id,
    episode_id: row.episode_id,
    space_id: row.space_id,
    author_id: row.author_id,
    author_name: row.author_name,
    rating: row.rating,
    favorite_moment: row.favorite_moment ?? "",
    awkward_moment: row.awkward_moment ?? "",
    funny_quote: row.funny_quote ?? "",
    summary: row.summary ?? "",
    would_redo: (row.would_redo ?? "") as Review["would_redo"],
    song: row.song ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCommentRow(row: {
  id: string;
  episode_id: string;
  space_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  comment_reactions?: { user_id: string; emoji: string }[];
}): EpisodeComment {
  const reactions: Record<string, string[]> = {};
  for (const r of row.comment_reactions ?? []) {
    (reactions[r.emoji] ??= []).push(r.user_id);
  }
  return {
    id: row.id,
    episode_id: row.episode_id,
    space_id: row.space_id,
    author_id: row.author_id,
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at,
    reactions,
  };
}

interface IdeaRow {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  proposed_by: string;
  status: string;
  idea_votes?: { user_id: string; kind: "like" | "dislike" }[];
}

function mapIdeaRow(row: IdeaRow, proposedByName: string, currentUserId: string | undefined): Idea {
  const votes = row.idea_votes ?? [];
  const mine = currentUserId ? votes.find((v) => v.user_id === currentUserId) : undefined;
  return {
    id: row.id,
    space_id: row.space_id,
    title: row.title,
    description: row.description ?? "",
    proposed_by_id: row.proposed_by,
    proposed_by_name: proposedByName,
    status: row.status as Idea["status"],
    likes: votes.filter((v) => v.kind === "like").map((v) => v.user_id),
    dislikes: votes.filter((v) => v.kind === "dislike").map((v) => v.user_id),
    my_vote: mine?.kind ?? null,
  };
}

// ============================================================
// PROFILE
// ============================================================

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (input: { name: string; bio?: string; avatar_url?: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase
        .from("profiles")
        .update({
          name: input.name,
          bio: input.bio?.trim() || null,
          avatar_url: input.avatar_url?.trim() || null,
        })
        .eq("id", userId);
      if (error) throw error;
    },
  });
}

// ============================================================
// SPACES
// ============================================================

/** Tous les espaces dont l'utilisateur est membre. */
export function useSpaces(): UseQueryResult<Space[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.spaces(),
    enabled: Boolean(user),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*, space_members(role, user_id, can_create_episodes)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row) => {
          const myMembership = (row.space_members ?? []).find(
            (m: { user_id: string; role: string }) => m.user_id === user?.id,
          );
          if (!myMembership) return null;
          return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            description: row.description ?? undefined,
            cover_url: row.cover_url ?? undefined,
            type: row.type,
            season_start: row.season_start ?? undefined,
            season_end: row.season_end ?? undefined,
            season_unlocked: row.season_unlocked,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
            my_role: myMembership.role,
            member_count: (row.space_members ?? []).length,
            my_can_create_episodes: Boolean(
              (myMembership as { can_create_episodes?: boolean }).can_create_episodes,
            ),
          } as Space;
        })
        .filter(Boolean) as Space[];
    },
  });
}

/** Un espace précis par ID. */
export function useSpace(spaceId: string | undefined): UseQueryResult<Space> {
  const { user } = useAuth();
  return useQuery({
    queryKey: spaceId ? queryKeys.space(spaceId) : ["spaces", "_"],
    enabled: Boolean(spaceId),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select(`*, space_members(role, user_id, can_create_episodes)`)
        .eq("id", spaceId!)
        .single();
      if (error) throw error;
      const myMembership = data.space_members?.find(
        (m: { user_id: string; role: string }) => m.user_id === user?.id,
      );
      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        description: data.description ?? undefined,
        cover_url: data.cover_url ?? undefined,
        type: data.type,
        season_start: data.season_start ?? undefined,
        season_end: data.season_end ?? undefined,
        season_unlocked: data.season_unlocked,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        my_role: myMembership?.role,
        my_can_create_episodes: Boolean(
          (myMembership as { can_create_episodes?: boolean } | undefined)?.can_create_episodes,
        ),
      } as Space;
    },
  });
}

/** Crée un nouvel espace via la fonction RPC `create_space` et génère un code d'invitation. */
export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: CreateSpaceDraft): Promise<string> => {
      const { data, error } = await supabase.rpc("create_space", {
        p_name:         draft.name,
        p_description:  draft.description  ?? null,
        p_type:         draft.type,
        p_season_start: draft.season_start ?? null,
        p_season_end:   draft.season_end   ?? null,
        p_cover_url:    draft.cover_url    ?? null,
      });
      if (error) throw error;
      const spaceId = data as string;

      // Génère automatiquement un code d'invitation pour l'espace créé.
      const userId = await currentUserId();
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      await supabase.from("invite_codes").insert({
        code,
        space_id: spaceId,
        role: "member",
        created_by: userId,
      });

      return spaceId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.spaces() });
    },
  });
}

/** Rejoint un espace via un code d'invitation (RPC `join_space`). */
export function useJoinSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<Space> => {
      const { data, error } = await supabase.rpc("join_space", { p_code: code.trim().toUpperCase() });
      if (error) throw error;
      return data as Space;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.spaces() });
    },
  });
}

/** Membres d'un espace. */
export function useSpaceMembers(spaceId: string | undefined): UseQueryResult<SpaceMember[]> {
  return useQuery({
    queryKey: spaceId ? queryKeys.spaceMembers(spaceId) : ["spaces", "_", "members"],
    enabled: Boolean(spaceId),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_members")
        .select("*, profile:profiles!space_members_user_id_fkey(id, name, avatar_url)")
        .eq("space_id", spaceId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        space_id: row.space_id,
        user_id: row.user_id,
        role: row.role as SpaceMember["role"],
        invited_by: row.invited_by ?? undefined,
        joined_at: row.joined_at,
        can_create_episodes: Boolean(row.can_create_episodes),
        profile: row.profile ?? undefined,
      })) as SpaceMember[];
    },
  });
}

/** Autorise (ou retire) à un member la possibilité d'ajouter des épisodes (owner uniquement). */
export function useSetMemberEpisodePermission(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, canCreate }: { userId: string; canCreate: boolean }) => {
      const { error } = await supabase.rpc("set_member_episode_permission", {
        p_space_id: spaceId,
        p_user_id: userId,
        p_can_create: canCreate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.spaceMembers(spaceId) });
    },
  });
}

/** Retire un membre d'un espace (owner uniquement). */
export function useRemoveSpaceMember(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("space_members")
        .delete()
        .eq("space_id", spaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.spaceMembers(spaceId) });
      void qc.invalidateQueries({ queryKey: queryKeys.space(spaceId) });
      void qc.invalidateQueries({ queryKey: queryKeys.spaces() });
    },
  });
}

/** Codes d'invitation d'un espace. */
export function useSpaceInviteCodes(spaceId: string | undefined): UseQueryResult<InviteCode[]> {
  return useQuery({
    queryKey: spaceId ? queryKeys.spaceInviteCodes(spaceId) : ["spaces", "_", "invite-codes"],
    enabled: Boolean(spaceId),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("space_id", spaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        space_id: row.space_id,
        role: row.role as InviteCode["role"],
        max_uses: row.max_uses ?? undefined,
        use_count: row.use_count,
        expires_at: row.expires_at ?? undefined,
        created_by: row.created_by,
        created_at: row.created_at,
      })) as InviteCode[];
    },
  });
}

/** Crée un code d'invitation pour un espace. */
export function useCreateInviteCode(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: CreateInviteCodeDraft) => {
      const userId = await currentUserId();
      // Génère un code alphanumérique de 8 caractères en majuscules.
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          code,
          space_id: spaceId,
          role: draft.role,
          max_uses: draft.max_uses ?? null,
          expires_at: draft.expires_at ?? null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InviteCode;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.spaceInviteCodes(spaceId) });
    },
  });
}

/** Débloque la saison d'un espace (owner uniquement). */
export function useUnlockSeason(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("spaces")
        .update({ season_unlocked: true })
        .eq("id", spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.space(spaceId) });
      void qc.invalidateQueries({ queryKey: queryKeys.spaces() });
    },
  });
}

// ============================================================
// EPISODES
// ============================================================

export function useEpisodes(spaceId: string | undefined): UseQueryResult<Episode[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: spaceId ? queryKeys.episodes(spaceId) : ["spaces", "_", "episodes"],
    enabled: Boolean(spaceId),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*, episode_media(*), episode_likes(user_id)")
        .eq("space_id", spaceId!)
        .order("number", { ascending: true });
      if (error) throw error;
      return (data as EpisodeRow[]).map((row) => mapEpisodeRow(row, user?.id));
    },
  });
}

export function useCreateEpisode(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EpisodeDraft) => {
      if (!spaceId) throw new Error("Aucun espace actif. Recharge la page.");
      const userId = await currentUserId();

      let coverUrl = input.cover_url ?? null;
      if (input.image_attachment) {
        const { file, filename, contentType } = input.image_attachment;
        // Cover stockée dans le dossier de l'espace, épisode inconnu à ce stade.
        const path = mediaPath(spaceId, "covers", filename);
        const uploaded = await uploadToMediaBucket(path, file, contentType);
        coverUrl = uploaded.url;
      }

      const { data: last } = await supabase
        .from("episodes")
        .select("number")
        .eq("space_id", spaceId)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (last?.number ?? 0) + 1;

      const { data, error } = await supabase
        .from("episodes")
        .insert({
          space_id:  spaceId,
          created_by: userId,
          number:    nextNumber,
          title:     input.title,
          date:      input.date,
          place:     input.place,
          duration:  input.duration  ?? null,
          cover_url: coverUrl,
          notes:     input.notes     ?? null,
          music_url: input.music_url ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as EpisodeRow;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodes(spaceId) });
      void currentUserId().then((uid) =>
        sendPushNotification({
          space_id: spaceId,
          sender_id: uid,
          title: "Nouvel épisode ajouté !",
          body: `Épisode "${data.title}" vient d'être créé.`,
          url: `/episode/${data.id}`,
          tag: `episode-${data.id}`,
        }),
      );
    },
  });
}

export function useDeleteEpisode(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (episodeId: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", episodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodes(spaceId) });
    },
  });
}

export function useUploadEpisodeMedia(spaceId: string, episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: EpisodeMediaUpload[]) => {
      const userId = await currentUserId();
      const uploaded: EpisodeMedia[] = [];
      for (const f of files) {
        const path = mediaPath(spaceId, episodeId, f.filename);
        const { url, size } = await uploadToMediaBucket(path, f.file, f.contentType);
        const { data, error } = await supabase
          .from("episode_media")
          .insert({
            episode_id:   episodeId,
            space_id:     spaceId,
            uploaded_by:  userId,
            url,
            filename:     f.filename,
            type:         mediaTypeFromContentType(f.contentType),
            content_type: f.contentType,
            size,
          })
          .select()
          .single();
        if (error) throw error;
        uploaded.push(mapMediaRow(data));
      }
      return uploaded;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodes(spaceId) });
    },
  });
}

export function useLikeEpisode(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "like" | "clear" }) => {
      const userId = await currentUserId();
      if (kind === "clear") {
        const { error } = await supabase
          .from("episode_likes")
          .delete()
          .match({ episode_id: id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("episode_likes")
          .upsert({ episode_id: id, user_id: userId }, { onConflict: "episode_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodes(spaceId) });
    },
  });
}

// ============================================================
// REVIEWS
// ============================================================

export function useEpisodeReviews(spaceId: string, episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeReviews(spaceId, episodeId) : ["_"],
    enabled: Boolean(episodeId),
    staleTime: LIVE_STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ReviewsResponse> => {
      const [{ data: reviews, error }, { data: space }] = await Promise.all([
        supabase
          .from("reviews")
          .select("*")
          .eq("episode_id", episodeId!)
          .eq("space_id", spaceId),
        supabase
          .from("spaces")
          .select("season_unlocked")
          .eq("id", spaceId)
          .single(),
      ]);
      if (error) throw error;
      return {
        reviews: (reviews ?? []).map(mapReviewRow),
        season_unlocked: space?.season_unlocked ?? false,
      };
    },
  });
}

export function useSaveReview(spaceId: string, episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ReviewDraft) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("reviews")
        .upsert(
          {
            episode_id:      episodeId,
            space_id:        spaceId,
            author_id:       userId,
            rating:          draft.rating,
            favorite_moment: draft.favorite_moment || null,
            awkward_moment:  draft.awkward_moment  || null,
            funny_quote:     draft.funny_quote     || null,
            summary:         draft.summary         || null,
            would_redo:      draft.would_redo      || null,
            song:            draft.song            || null,
          },
          { onConflict: "episode_id,author_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return mapReviewRow(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeReviews(spaceId, episodeId) });
      void qc.invalidateQueries({ queryKey: queryKeys.episodes(spaceId) });
    },
  });
}

export function useSeasonUnlocked(spaceId: string): boolean {
  const qc = useQueryClient();
  const space = qc.getQueryData<Space>(queryKeys.space(spaceId));
  return space?.season_unlocked ?? false;
}

// ============================================================
// COMMENTS
// ============================================================

export function useEpisodeComments(spaceId: string, episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeComments(spaceId, episodeId) : ["_"],
    enabled: Boolean(episodeId),
    staleTime: 0,
    refetchInterval: 5 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<EpisodeCommentsResponse> => {
      const { data, error } = await supabase
        .from("episode_comments")
        .select("*, comment_reactions(user_id, emoji)")
        .eq("episode_id", episodeId!)
        .eq("space_id", spaceId)
        .order("created_at", { ascending: true });
      if (error) return { comments: [] };
      return { comments: (data ?? []).map(mapCommentRow) };
    },
  });
}

export function useCreateEpisodeComment(spaceId: string, episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: EpisodeCommentDraft) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("episode_comments")
        .insert({ episode_id: episodeId, space_id: spaceId, author_id: userId, body: draft.body })
        .select("*, comment_reactions(user_id, emoji)")
        .single();
      if (error) throw error;
      return mapCommentRow(data);
    },
    onSuccess: (comment) => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeComments(spaceId, episodeId) });
      void sendPushNotification({
        space_id: spaceId,
        sender_id: comment.author_id,
        title: `${comment.author_name} a commenté`,
        body: comment.body.slice(0, 100),
        url: `/episode/${episodeId}`,
        tag: `comment-${episodeId}`,
      });
    },
  });
}

export function useReactToComment(spaceId: string, episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, emoji, kind }: { id: string; emoji: string; kind: "add" | "remove" }) => {
      const userId = await currentUserId();
      if (kind === "add") {
        const { error } = await supabase
          .from("comment_reactions")
          .insert({ comment_id: id, user_id: userId, emoji });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .match({ comment_id: id, user_id: userId, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeComments(spaceId, episodeId) });
    },
  });
}

// ============================================================
// IDEAS
// ============================================================

export function useIdeas(spaceId: string | undefined): UseQueryResult<Idea[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: spaceId ? queryKeys.ideas(spaceId) : ["_"],
    enabled: Boolean(spaceId),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data: ideaRows, error } = await supabase
        .from("ideas")
        .select("*, idea_votes(user_id, kind)")
        .eq("space_id", spaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const proposerIds = [...new Set((ideaRows ?? []).map((r) => r.proposed_by))];
      const { data: profiles } = proposerIds.length
        ? await supabase.from("profiles").select("id, name").in("id", proposerIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

      return (ideaRows as IdeaRow[]).map((row) =>
        mapIdeaRow(row, nameById.get(row.proposed_by) ?? "—", user?.id),
      );
    },
  });
}

export function useCreateIdea(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("ideas").insert({
        space_id:    spaceId,
        title:       input.title,
        description: input.description,
        proposed_by: userId,
      });
      if (error) throw error;
      return { userId, title: input.title };
    },
    onSuccess: ({ userId, title }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ideas(spaceId) });
      void sendPushNotification({
        space_id: spaceId,
        sender_id: userId,
        title: "Nouvelle idée proposée !",
        body: title,
        url: "/ideas",
        tag: `idea-${spaceId}`,
      });
    },
  });
}

export function useVoteIdea(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "like" | "dislike" | "clear" }) => {
      const userId = await currentUserId();
      if (kind === "clear") {
        const { error } = await supabase
          .from("idea_votes")
          .delete()
          .match({ idea_id: id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("idea_votes")
          .upsert({ idea_id: id, user_id: userId, kind }, { onConflict: "idea_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ideas(spaceId) });
    },
  });
}

export function useSetIdeaStatus(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IdeaStatus }) => {
      const { error } = await supabase.from("ideas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ideas(spaceId) });
    },
  });
}

// ============================================================
// SYNTHESE
// ============================================================

export function useSynthese(spaceId: string | undefined): UseQueryResult<Synthese | null> {
  return useQuery({
    queryKey: spaceId ? queryKeys.synthese(spaceId) : ["_"],
    enabled: Boolean(spaceId),
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synthese")
        .select("*")
        .eq("space_id", spaceId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        space_id: data.space_id,
        body_md: data.body_md ?? undefined,
        generated_at: data.generated_at ?? undefined,
        avg_rating: data.avg_rating ?? undefined,
        best_episode_id: data.best_episode_id ?? undefined,
        video_url: data.video_url ?? undefined,
        video_generated_at: data.video_generated_at ?? undefined,
      } as Synthese;
    },
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export function useNotifications(): UseQueryResult<AppNotification[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications(),
    enabled: Boolean(user),
    staleTime: 0,
    refetchInterval: 15 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        space_id: row.space_id ?? undefined,
        title: row.title,
        body: row.body ?? undefined,
        url: row.url ?? undefined,
        read_at: row.read_at ?? undefined,
        created_at: row.created_at,
      })) as AppNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

// ============================================================
// PROVIDER (no-op — conservé pour compatibilité avec l'arbre de composants)
// ============================================================

export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
