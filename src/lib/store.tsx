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
  EpisodeDraft,
  Idea,
  IdeaStatus,
  ReviewDraft,
  ReviewsResponse,
  Synthese,
  VoteQuestion,
} from "./types";

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
const REFERENCE_STALE_TIME = 10 * 60 * 1000;
const LIVE_STALE_TIME = 60 * 1000;

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

export const queryKeys = {
  episodes: ["episodes"] as const,
  episodeReviews: (id: string) => ["episodes", id, "reviews"] as const,
  ideas: ["ideas"] as const,
  votes: ["votes"] as const,
  synthese: ["synthese"] as const,
};

export function useEpisodes(): UseQueryResult<Episode[]> {
  return useQuery({
    queryKey: queryKeys.episodes,
    staleTime: REFERENCE_STALE_TIME,
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

export function useEpisodeReviews(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeId ? queryKeys.episodeReviews(episodeId) : ["episodes", "_", "reviews"],
    queryFn: () => api.get<ReviewsResponse>(`/episodes/${episodeId}/reviews`),
    enabled: Boolean(episodeId),
    staleTime: LIVE_STALE_TIME,
  });
}

export function useSaveReview(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: ReviewDraft) =>
      api.post<{ review: unknown }>(`/episodes/${episodeId}/reviews`, draft),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.episodeReviews(episodeId) });
      void qc.invalidateQueries({ queryKey: queryKeys.episodes });
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
      api.post<{ idea: Idea }>(`/ideas/${id}/vote`, { kind }),
    onSuccess: (res) => {
      updateIdeaInCache(qc, res.idea);
      void qc.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useSetIdeaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IdeaStatus }) =>
      api.patch<{ idea: Idea }>(`/ideas/${id}/status`, { status }),
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
