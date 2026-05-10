import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Episode, Idea, AbsurdVote, EpisodeReview } from "./types";
import { seedEpisodes, seedIdeas, seedAbsurdVotes } from "./mock-data";

/**
 * Data layer abstraction. Currently backed by localStorage.
 * Swap implementations here later (Airtable, Supabase, n8n) without touching UI.
 */

const KEY = "nous-and-chill-data-v1";

interface DataState {
  episodes: Episode[];
  ideas: Idea[];
  votes: AbsurdVote[];
}

interface StoreContextValue extends DataState {
  updateEpisodeReview: (epId: string, who: "samuel" | "mathilde", review: EpisodeReview) => void;
  addIdea: (idea: Omit<Idea, "id" | "createdAt" | "likes" | "dislikes" | "status">) => void;
  toggleLike: (ideaId: string, user: string, kind: "like" | "dislike") => void;
  setIdeaStatus: (ideaId: string, status: Idea["status"]) => void;
  castAbsurdVote: (voteId: string, option: string) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function load(): DataState {
  if (typeof window === "undefined") {
    return { episodes: seedEpisodes, ideas: seedIdeas, votes: seedAbsurdVotes };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { episodes: seedEpisodes, ideas: seedIdeas, votes: seedAbsurdVotes };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(() => ({
    episodes: seedEpisodes,
    ideas: seedIdeas,
    votes: seedAbsurdVotes,
  }));

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  }, [state]);

  const value: StoreContextValue = {
    ...state,
    updateEpisodeReview: (epId, who, review) =>
      setState((s) => ({
        ...s,
        episodes: s.episodes.map((e) =>
          e.id === epId
            ? { ...e, reviews: { ...e.reviews, [who]: { ...review, submittedAt: new Date().toISOString() } } }
            : e,
        ),
      })),
    addIdea: (idea) =>
      setState((s) => ({
        ...s,
        ideas: [
          {
            ...idea,
            id: `id-${Date.now()}`,
            createdAt: new Date().toISOString(),
            likes: [],
            dislikes: [],
            status: "voting",
          },
          ...s.ideas,
        ],
      })),
    toggleLike: (ideaId, user, kind) =>
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => {
          if (i.id !== ideaId) return i;
          const likes = i.likes.filter((u) => u !== user);
          const dislikes = i.dislikes.filter((u) => u !== user);
          if (kind === "like" && !i.likes.includes(user)) likes.push(user);
          if (kind === "dislike" && !i.dislikes.includes(user)) dislikes.push(user);
          return { ...i, likes, dislikes };
        }),
      })),
    setIdeaStatus: (ideaId, status) =>
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, status } : i)),
      })),
    castAbsurdVote: (voteId, option) =>
      setState((s) => ({
        ...s,
        votes: s.votes.map((v) =>
          v.id === voteId ? { ...v, votes: { ...v.votes, [option]: (v.votes[option] || 0) + 1 } } : v,
        ),
      })),
    reset: () => setState({ episodes: seedEpisodes, ideas: seedIdeas, votes: seedAbsurdVotes }),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}