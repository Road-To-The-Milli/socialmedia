// ============================================================
// PRIMITIVES
// ============================================================

export type SpaceRole   = "owner" | "member" | "observer";
export type SpaceType   = "couple" | "friends" | "family" | "event" | "other";
export type IdeaStatus  = "voting" | "selected" | "scheduled" | "done";
export type WouldRedo   = "yes" | "no" | "maybe" | "";
export type MediaType   = "image" | "video" | "file";

// ============================================================
// USER / AUTH
// ============================================================

export interface User {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
  role?: "aventurier" | "ami";
  invite_code?: string;
}

// ============================================================
// SPACES
// ============================================================

export interface Space {
  id: string;
  slug: string;
  name: string;
  description?: string;
  cover_url?: string;
  type: SpaceType;
  season_start?: string;
  season_end?: string;
  season_unlocked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  my_role?: SpaceRole;
  member_count?: number;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: SpaceRole;
  invited_by?: string;
  joined_at: string;
  // Joined from profiles
  profile?: Pick<User, "id" | "name" | "avatar_url">;
}

export interface InviteCode {
  id: string;
  code: string;
  space_id: string;
  role: "member" | "observer";
  max_uses?: number;
  use_count: number;
  expires_at?: string;
  created_by: string;
  created_at: string;
}

export interface CreateSpaceDraft {
  name: string;
  description?: string;
  type: SpaceType;
  season_start?: string;
  season_end?: string;
  cover_url?: string;
}

export interface CreateInviteCodeDraft {
  role: "member" | "observer";
  max_uses?: number;
  expires_at?: string;
}

// ============================================================
// EPISODES
// ============================================================

export interface Episode {
  id: string;
  space_id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  duration?: string;
  cover_url?: string;
  media?: EpisodeMedia[];
  notes?: string;
  music_url?: string;
  created_by: string;
  likes?: string[];
  my_like?: boolean | null;
}

export interface EpisodeMedia {
  id?: string;
  url: string;
  filename: string;
  type: MediaType;
  contentType?: string;
  size?: number;
  uploaded_by?: string;
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

// ============================================================
// REVIEWS
// ============================================================

export interface Review {
  id: string;
  episode_id: string;
  space_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  favorite_moment: string;
  awkward_moment: string;
  funny_quote: string;
  summary: string;
  would_redo: WouldRedo;
  song: string;
  created_at?: string;
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

// ============================================================
// COMMENTS
// ============================================================

export interface EpisodeComment {
  id: string;
  episode_id: string;
  space_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

export interface EpisodeCommentDraft {
  body: string;
}

export interface EpisodeCommentsResponse {
  comments: EpisodeComment[];
}

// ============================================================
// IDEAS
// ============================================================

export interface Idea {
  id: string;
  space_id: string;
  title: string;
  description: string;
  proposed_by_id: string;
  proposed_by_name: string;
  status: IdeaStatus;
  likes: string[];
  dislikes: string[];
  my_vote?: "like" | "dislike" | null;
}

// ============================================================
// SYNTHESE (bilan de fin de saison)
// ============================================================

export interface Synthese {
  id: string;
  space_id: string;
  body_md?: string;
  generated_at?: string;
  avg_rating?: number;
  best_episode_id?: string;
  video_url?: string;
  video_generated_at?: string;
}
