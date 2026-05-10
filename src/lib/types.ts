export type Role = "samuel" | "mathilde" | "amis_samuel" | "amis_mathilde";

export interface User {
  name: string;
  role: Role;
}

export interface EpisodeReview {
  rating: number; // 1-5
  favoriteMoment: string;
  awkwardMoment: string;
  funnyQuote: string;
  summary: string;
  wouldRedo: "yes" | "no" | "maybe" | "";
  song: string; // url
  submittedAt?: string;
}

export interface Episode {
  id: string;
  number: number; // S01E0X
  title: string;
  date: string; // ISO
  place: string;
  cover?: string; // image url
  audios?: string[];
  photos?: string[];
  reviews: {
    samuel?: EpisodeReview;
    mathilde?: EpisodeReview;
  };
}

export type IdeaStatus = "voting" | "selected" | "scheduled" | "done";

export interface Idea {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  status: IdeaStatus;
  likes: string[]; // user names
  dislikes: string[];
  createdAt: string;
}

export interface AbsurdVote {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // option -> count
}