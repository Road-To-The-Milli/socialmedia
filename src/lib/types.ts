export type Role = "samuel" | "mathilde" | "amis_samuel" | "amis_mathilde";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Session {
  session_token: string;
  user: User;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  duration?: string;
  tags?: string[];
  cover_url?: string;
}

export type WouldRedo = "yes" | "no" | "maybe" | "";

export interface Review {
  id: string;
  author_role: Role;
  author_name: string;
  rating: number;
  favorite_moment: string;
  awkward_moment: string;
  funny_quote: string;
  summary: string;
  would_redo: WouldRedo;
  song: string;
  updated_at?: string;
}

export interface ReviewDraft {
  rating: number;
  favorite_moment: string;
  awkward_moment: string;
  funny_quote: string;
  summary: string;
  would_redo: WouldRedo;
  song: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  season_unlocked: boolean;
}

export type IdeaStatus = "voting" | "selected" | "scheduled" | "done";

export interface Idea {
  id: string;
  title: string;
  description: string;
  proposed_by_id: string;
  proposed_by_name: string;
  status: IdeaStatus;
  likes: string[];
  dislikes: string[];
  my_vote?: "like" | "dislike" | null;
}

export interface VoteQuestion {
  id: string;
  question: string;
  options: string[];
  results: Record<string, number>;
  total: number;
  my_choice?: string | null;
}

export interface Synthese {
  body_md: string | null;
  generated_at?: string;
  avg_rating?: number;
  best_episode_id?: string;
  season_unlocked: boolean;
}
