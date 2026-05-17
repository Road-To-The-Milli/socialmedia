export type Role = "samuel" | "mathilde" | "amis_samuel" | "amis_mathilde";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Session {
  session_token: string;
  user: User;
  expires_at?: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  duration?: string;
  cover_url?: string;
  media?: EpisodeMedia[];
  notes?: string;
  music_url?: string;
}

export interface EpisodeMedia {
  id?: string;
  url: string;
  filename: string;
  type: "image" | "video" | "file";
  contentType?: string;
  size?: number;
}

export interface EpisodeMediaUpload {
  file: string;
  filename: string;
  contentType: string;
}

export interface EpisodeDraft {
  title: string;
  date: string;
  place: string;
  duration?: string;
  cover_url?: string;
  image_attachment?: {
    file: string;
    filename: string;
    contentType: string;
  };
  notes?: string;
  music_url?: string;
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

export interface EpisodeComment {
  id: string;
  episode_id: string;
  author_name: string;
  author_role?: Role;
  body: string;
  created_at: string;
}

export interface EpisodeCommentDraft {
  author_name: string;
  body: string;
}

export interface EpisodeCommentsResponse {
  comments: EpisodeComment[];
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
