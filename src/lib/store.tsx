import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "./api";
import type {
  Episode,
  EpisodeComment,
  EpisodeCommentDraft,
  EpisodeCommentsResponse,
  EpisodeDraft,
  EpisodeMediaUpload,
  Idea,
  IdeaStatus,
  Review,
  ReviewDraft,
  ReviewsResponse,
  Synthese,
  VoteQuestion,
} from "./types";

type EpisodeLikeResult = Pick<Episode, "id" | "likes" | "my_like">;
type CommentReactResult = Pick<EpisodeComment, "id" | "reactions">;

/**
 * Server state for Nous & Chill.
 *
 * The local-storage cache that lived here previously is gone — every read
 * goes through n8n, and the season-end privacy gate is enforced server-side.
 * Anonymous absurd-vote choices are still tracked in localStorage purely to
 * stop the same browser from voting twice and to highlight the option the
 * user picked on reload.
 */

const VOTE_LS_KEY = "nc_votes";
const BUZZ_VOTE_LS_KEY = "nc_buzz_idea_votes";
const LIVE_STALE_TIME = 60 * 1000;
const MEDIA_UPSERT_PATH_PREFIX = "/e6d7fbaf-bbb1-4b28-8ae1-cdc0f5c5f6c1/episodes";
const REVIEW_LIST_PATH_PREFIX = "/6483ce95-fa1a-4ffd-9982-3348d437d928/episodes";
const REVIEW_UPSERT_PATH_PREFIX = "/e8f323ae-2f03-42d4-862e-fe88351c3dac/episodes";
const COMMENT_LIST_PATH_PREFIX = "/d61c10bd-78ec-4b59-8b6b-7e443191b4c2/episodes";
const COMMENT_CREATE_PATH_PREFIX = "/4af6bb46-948f-43b2-862d-8a0ac440d688/episodes";

function readLocalVotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VOTE_LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLocalVotes(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOTE_LS_KEY, JSON.stringify(map));
}

function readBuzzIdeaVotes(): Record<string, "like" | "dislike"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BUZZ_VOTE_LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, "like" | "dislike">) : {};
  } catch {
    return {};
  }
}

function writeBuzzIdeaVote(ideaId: string, kind: "like" | "dislike" | "clear"): void {
  if (typeof window === "undefined") return;
  const map = readBuzzIdeaVotes();
  if (kind === "clear") {
    delete map[ideaId];
  } else {
    map[ideaId] = kind;
  }
  localStorage.setItem(BUZZ_VOTE_LS_KEY, JSON.stringify(map));
}

export const queryKeys = {
  episodes: ["episodes"] as const,
  episodeReviews: (id: string) => ["episodes", id, "reviews"] as const,
  episodeComments: (id: string) => ["episodes", id, "comments"] as const,
  ideas: ["ideas"] as const,
  votes: ["votes"] as const,
  synthese: ["synthese"] as const,
};

export function useEpisodes(): UseQueryResult<Episode[]> {
  return useQuery({
    queryKey: queryKeys.episodes,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await api.get<{ episodes: Episode[] }>("/episodes");
      return [...res.episodes].sort((a, b) => a.number - b.number);
    },
  });
}

export function useCreateEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EpisodeDraft) => {
      const res = await api.post<{ episode?: Episode; error?: string }>("/episodes", input);
      if (!res.episode) {
        throw new Error(res.error || "La création d'épisode n'est pas encore branchée côté n8n.");
      }
      return { episode: res.episode };
    },
    onSuccess: (res) => {
      qc.setQueryData<Episode[]>(queryKeys.episodes, (episodes = []) =>
        [...episodes, res.episode].sort((a, b) => a.number - b.number),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useUploadEpisodeMedia(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: EpisodeMediaUpload[]) =>
      api.post<{ episode: Episode }>(`${MEDIA_UPSERT_PATH_PREFIX}/${episodeId}/media`, { files }),
    onSuccess: (res) => {
      qc.setQueryData<Episode[]>(queryKeys.episodes, (episodes = []) =>
        episodes.map((episode) =>
          episode.id === episodeId
            ? {
                ...episode,
                ...res.episode,
                id: episode.id,
                media: res.episode.media ?? episode.media,
              }
            : episode,
        ),
      );
    },
  });
}

export function useEpisodeReviews(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeReviews(episodeId) : ["episodes", "_", "reviews"],
    queryFn: () => api.get<ReviewsResponse>(`${REVIEW_LIST_PATH_PREFIX}/${episodeId}/reviews`),
    enabled: Boolean(episodeId),
    staleTime: LIVE_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

export function useSaveReview(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: ReviewDraft) =>
      api.post<{ review: Review }>(`${REVIEW_UPSERT_PATH_PREFIX}/${episodeId}/reviews`, draft),
    onSuccess: (res) => {
      qc.setQueryData<ReviewsResponse>(queryKeys.episodeReviews(episodeId), (current) => {
        const existing = current?.reviews ?? [];
        const reviews = existing.some(
          (review) =>
            review.id === res.review.id || review.author_role === res.review.author_role,
        )
          ? existing.map((review) =>
              review.id === res.review.id || review.author_role === res.review.author_role
                ? res.review
                : review,
            )
          : [...existing, res.review];

        return {
          season_unlocked: current?.season_unlocked ?? false,
          reviews,
        };
      });
      void qc.invalidateQueries({ queryKey: queryKeys.episodeReviews(episodeId) });
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useEpisodeComments(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeComments(episodeId) : ["episodes", "_", "comments"],
    queryFn: async () => {
      try {
        return await api.get<EpisodeCommentsResponse>(
          `${COMMENT_LIST_PATH_PREFIX}/${episodeId}/comments`,
        );
      } catch {
        return { comments: [] };
      }
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
    mutationFn: (draft: EpisodeCommentDraft) =>
      api.post<{ comment: EpisodeComment }>(
        `${COMMENT_CREATE_PATH_PREFIX}/${episodeId}/comments`,
        draft,
      ),
    onSuccess: (res) => {
      qc.setQueryData<EpisodeCommentsResponse>(queryKeys.episodeComments(episodeId), (current) => {
        const comments = current?.comments ?? [];
        return { comments: [res.comment, ...comments] };
      });
      void qc.invalidateQueries({ queryKey: queryKeys.episodeComments(episodeId) });
    },
  });
}

export function useIdeas(): UseQueryResult<Idea[]> {
  return useQuery({
    queryKey: queryKeys.ideas,
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const res = await api.get<{ ideas: Idea[] }>("/ideas");
      return res.ideas;
    },
  });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      api.post<{ idea: Idea }>("/ideas", input),
    onSuccess: (res) => {
      qc.setQueryData<Idea[]>(queryKeys.ideas, (ideas = []) => [res.idea, ...ideas]);
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useVoteIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "like" | "dislike" | "clear" }) =>
      api.post<{ idea: Idea }>("/ideas/vote", { id, kind }),
    onSuccess: (res) => {
      updateIdeaInCache(qc, res.idea);
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useLikeEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "like" | "clear" }) =>
      api.post<{ episode: EpisodeLikeResult }>("/episodes/like", { id, kind }),
    onSuccess: (res) => {
      qc.setQueryData<Episode[]>(queryKeys.episodes, (episodes = []) =>
        episodes.map((ep) =>
          ep.id === res.episode.id
            ? { ...ep, likes: res.episode.likes ?? [], my_like: res.episode.my_like ?? null }
            : ep,
        ),
      );
    },
  });
}

export function useReactToComment(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji, kind }: { id: string; emoji: string; kind: "add" | "remove" }) =>
      api.post<{ comment: CommentReactResult }>("/comments/react", { id, emoji, kind }),
    onSuccess: (res) => {
      qc.setQueryData<EpisodeCommentsResponse>(queryKeys.episodeComments(episodeId), (current) => {
        if (!current) return current;
        return {
          ...current,
          comments: current.comments.map((c) =>
            c.id === res.comment.id ? { ...c, reactions: res.comment.reactions } : c,
          ),
        };
      });
    },
  });
}

export function useSetIdeaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IdeaStatus }) =>
      api.patch<{ idea: Idea }>("/ideas/status", { id, status }),
    onSuccess: (res) => {
      updateIdeaInCache(qc, res.idea);
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useVotes() {
  return useQuery({
    queryKey: queryKeys.votes,
    staleTime: LIVE_STALE_TIME,
    queryFn: async () => {
      const res = await api.get<{ questions: VoteQuestion[] }>("/votes");
      const local = readLocalVotes();
      return res.questions.map((q) => ({
        ...q,
        my_choice: q.my_choice ?? local[q.id] ?? null,
      }));
    },
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, option }: { questionId: string; option: string }) => {
      await api.post<{ ok: true }>(`/votes/${questionId}`, { option });
      const map = readLocalVotes();
      map[questionId] = option;
      writeLocalVotes(map);
      return { questionId, option };
    },
    onSuccess: ({ questionId, option }) => {
      qc.setQueryData<VoteQuestion[]>(queryKeys.votes, (questions = []) =>
        questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                my_choice: option,
                total: q.my_choice ? q.total : q.total + 1,
                results: {
                  ...q.results,
                  [option]: (q.results[option] ?? 0) + (q.my_choice ? 0 : 1),
                },
              }
            : q,
        ),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.votes });
    },
  });
}

export function useSynthese(): UseQueryResult<Synthese> {
  return useQuery({
    queryKey: queryKeys.synthese,
    staleTime: 5 * 60 * 1000,
    queryFn: () => api.get<Synthese>("/synthese"),
  });
}

function updateIdeaInCache(qc: QueryClient, idea: Idea): void {
  qc.setQueryData<Idea[]>(queryKeys.ideas, (ideas = []) =>
    ideas.map((current) => (current.id === idea.id ? idea : current)),
  );
}

/**
 * Convenience: derive `season_unlocked` from the episode-reviews payload of
 * any episode that has already been fetched. Falls back to `false` so the UI
 * stays gated until we hear otherwise from the server.
 */
export function useSeasonUnlocked(episodeId: string | undefined): boolean {
  const qc = useQueryClient();
  const data = episodeId
    ? qc.getQueryData<ReviewsResponse>(queryKeys.episodeReviews(episodeId))
    : undefined;
  return data?.season_unlocked ?? false;
}

/**
 * Backward-compatible wrapper kept so __root.tsx can still mount a
 * "data layer" provider. TanStack Query is the real provider — this just
 * hydrates anonymous vote state on the client.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Touch localStorage once so SSR/CSR diff stays stable.
    readLocalVotes();
  }, []);
  return <>{children}</>;
}
