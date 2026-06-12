import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type {
  Episode,
  EpisodeComment,
  EpisodeCommentDraft,
  EpisodeCommentsResponse,
  EpisodeDraft,
  EpisodeMedia,
  EpisodeMediaUpload,
  Idea,
  IdeaStatus,
  Review,
  ReviewDraft,
  ReviewsResponse,
} from "./types";

const LIVE_STALE_TIME = 60 * 1000;
const MEDIA_BUCKET = "episode-media";

export const queryKeys = {
  episodes: ["episodes"] as const,
  episodeReviews: (id: string) => ["episodes", id, "reviews"] as const,
  episodeComments: (id: string) => ["episodes", id, "comments"] as const,
  ideas: ["ideas"] as const,
};

// ---------- storage upload helper (base64 -> Supabase Storage) ----------

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

// ---------- row -> domain type mappers ----------

function mapMediaRow(row: {
  id: string;
  url: string;
  filename: string;
  type: string;
  content_type: string | null;
  size: number | null;
}): EpisodeMedia {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    type: row.type as EpisodeMedia["type"],
    contentType: row.content_type ?? undefined,
    size: row.size ?? undefined,
  };
}

interface EpisodeRow {
  id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  duration: string | null;
  cover_url: string | null;
  notes: string | null;
  music_url: string | null;
  episode_media?: Parameters<typeof mapMediaRow>[0][];
  episode_likes?: { user_id: string }[];
}

function mapEpisodeRow(row: EpisodeRow, currentUserId: string | undefined): Episode {
  const likeRows = row.episode_likes ?? [];
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    date: row.date,
    place: row.place,
    duration: row.duration ?? undefined,
    cover_url: row.cover_url ?? undefined,
    media: (row.episode_media ?? []).map(mapMediaRow),
    notes: row.notes ?? undefined,
    music_url: row.music_url ?? undefined,
    likes: likeRows.map((l) => l.user_id),
    my_like: currentUserId ? likeRows.some((l) => l.user_id === currentUserId) : null,
  };
}

function mapReviewRow(row: {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string;
  rating: number;
  favorite_moment: string | null;
  awkward_moment: string | null;
  funny_quote: string | null;
  summary: string | null;
  would_redo: string | null;
  song: string | null;
  updated_at: string;
}): Review {
  return {
    id: row.id,
    author_id: row.author_id,
    author_role: row.author_role as Review["author_role"],
    author_name: row.author_name,
    rating: row.rating,
    favorite_moment: row.favorite_moment ?? "",
    awkward_moment: row.awkward_moment ?? "",
    funny_quote: row.funny_quote ?? "",
    summary: row.summary ?? "",
    would_redo: (row.would_redo ?? "") as Review["would_redo"],
    song: row.song ?? "",
    updated_at: row.updated_at,
  };
}

function mapCommentRow(row: {
  id: string;
  episode_id: string;
  author_name: string;
  author_role: string;
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
    author_name: row.author_name,
    author_role: row.author_role as EpisodeComment["author_role"],
    body: row.body,
    created_at: row.created_at,
    reactions,
  };
}

interface IdeaRow {
  id: string;
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

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("not_authenticated");
  return data.user.id;
}

// ---------- episodes ----------

export function useEpisodes(): UseQueryResult<Episode[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.episodes,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*, episode_media(*), episode_likes(user_id)")
        .order("number", { ascending: true });
      if (error) throw error;
      return (data as EpisodeRow[]).map((row) => mapEpisodeRow(row, user?.id));
    },
  });
}

export function useCreateEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EpisodeDraft) => {
      let coverUrl = input.cover_url || null;
      if (input.image_attachment) {
        const { file, filename, contentType } = input.image_attachment;
        const path = `covers/${Date.now()}-${filename}`;
        const uploaded = await uploadToMediaBucket(path, file, contentType);
        coverUrl = uploaded.url;
      }

      const { data: last } = await supabase
        .from("episodes")
        .select("number")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (last?.number ?? 0) + 1;

      const { data, error } = await supabase
        .from("episodes")
        .insert({
          number: nextNumber,
          title: input.title,
          date: input.date,
          place: input.place,
          duration: input.duration || null,
          cover_url: coverUrl,
          notes: input.notes || null,
          music_url: input.music_url || null,
        })
        .select("*, episode_media(*), episode_likes(user_id)")
        .single();
      if (error) throw error;
      return data as EpisodeRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useUploadEpisodeMedia(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: EpisodeMediaUpload[]) => {
      const uploaded: EpisodeMedia[] = [];
      for (const f of files) {
        const path = `${episodeId}/${Date.now()}-${f.filename}`;
        const { url, size } = await uploadToMediaBucket(path, f.file, f.contentType);
        const { data, error } = await supabase
          .from("episode_media")
          .insert({
            episode_id: episodeId,
            url,
            filename: f.filename,
            type: mediaTypeFromContentType(f.contentType),
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
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useLikeEpisode() {
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
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

// ---------- reviews ----------

export function useEpisodeReviews(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeReviews(episodeId) : ["episodes", "_", "reviews"],
    queryFn: async (): Promise<ReviewsResponse> => {
      const [{ data: reviews, error }, { data: settings }] = await Promise.all([
        supabase.from("reviews").select("*").eq("episode_id", episodeId),
        supabase.from("settings").select("season_unlocked").limit(1).maybeSingle(),
      ]);
      if (error) throw error;
      return {
        reviews: (reviews ?? []).map(mapReviewRow),
        season_unlocked: settings?.season_unlocked ?? false,
      };
    },
    enabled: Boolean(episodeId),
    staleTime: LIVE_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

export function useSaveReview(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ReviewDraft) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("reviews")
        .upsert(
          {
            episode_id: episodeId,
            author_id: userId,
            rating: draft.rating,
            favorite_moment: draft.favorite_moment || null,
            awkward_moment: draft.awkward_moment || null,
            funny_quote: draft.funny_quote || null,
            summary: draft.summary || null,
            would_redo: draft.would_redo || null,
            song: draft.song || null,
          },
          { onConflict: "episode_id,author_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return mapReviewRow(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeReviews(episodeId) });
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

// ---------- comments ----------

export function useEpisodeComments(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeComments(episodeId) : ["episodes", "_", "comments"],
    queryFn: async (): Promise<EpisodeCommentsResponse> => {
      const { data, error } = await supabase
        .from("episode_comments")
        .select("*, comment_reactions(user_id, emoji)")
        .eq("episode_id", episodeId)
        .order("created_at", { ascending: true });
      if (error) return { comments: [] };
      return { comments: (data ?? []).map(mapCommentRow) };
    },
    enabled: Boolean(episodeId),
    staleTime: 0,
    refetchInterval: 5 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useCreateEpisodeComment(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: EpisodeCommentDraft) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("episode_comments")
        .insert({ episode_id: episodeId, author_id: userId, body: draft.body })
        .select("*, comment_reactions(user_id, emoji)")
        .single();
      if (error) throw error;
      return mapCommentRow(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeComments(episodeId) });
    },
  });
}

export function useReactToComment(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      emoji,
      kind,
    }: {
      id: string;
      emoji: string;
      kind: "add" | "remove";
    }) => {
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
      void qc.invalidateQueries({ queryKey: queryKeys.episodeComments(episodeId) });
    },
  });
}

// ---------- ideas ----------

export function useIdeas(): UseQueryResult<Idea[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.ideas,
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const { data: ideaRows, error } = await supabase
        .from("ideas")
        .select("*, idea_votes(user_id, kind)")
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

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase
        .from("ideas")
        .insert({ title: input.title, description: input.description, proposed_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useVoteIdea() {
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
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useSetIdeaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IdeaStatus }) => {
      const { error } = await supabase.from("ideas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

/**
 * Derive `season_unlocked` from the episode-reviews payload of any episode
 * already fetched. Falls back to `false` so the UI stays gated by default.
 */
export function useSeasonUnlocked(episodeId: string | undefined): boolean {
  const qc = useQueryClient();
  const data = episodeId
    ? qc.getQueryData<ReviewsResponse>(queryKeys.episodeReviews(episodeId))
    : undefined;
  return data?.season_unlocked ?? false;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
