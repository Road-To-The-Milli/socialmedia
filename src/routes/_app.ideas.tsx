import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateIdea,
  useIdeas,
  useSetIdeaStatus,
  useVoteIdea,
} from "@/lib/store";
import type { IdeaStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/ideas")({
  head: () => ({ meta: [{ title: "Idées · Nous & Chill" }] }),
  component: IdeasPage,
});

const STATUSES: { value: IdeaStatus; label: string; emoji: string }[] = [
  { value: "voting", label: "À voter", emoji: "🗳" },
  { value: "selected", label: "Sélectionné", emoji: "✅" },
  { value: "scheduled", label: "À programmer", emoji: "📅" },
  { value: "done", label: "Réalisé", emoji: "🎬" },
];

function IdeasPage() {
  const ideasQuery = useIdeas();
  const createIdea = useCreateIdea();
  const voteIdea = useVoteIdea();
  const setStatus = useSetIdeaStatus();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");

  const ideas = ideasQuery.data ?? [];
  const filtered = filter === "all" ? ideas : ideas.filter((i) => i.status === filter);

  const submit = () => {
    if (!title.trim()) return;
    createIdea.mutate(
      { title: title.trim(), description: desc.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setDesc("");
          toast.success("Nouvelle idée pitchée 🎬");
        },
        onError: () => toast.error("Impossible d'envoyer l'idée."),
      },
    );
  };

  const onVote = (id: string, kind: "like" | "dislike", currentVote: "like" | "dislike" | null | undefined) => {
    const next = currentVote === kind ? "clear" : kind;
    voteIdea.mutate({ id, kind: next });
  };

  if (ideasQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 text-center animate-float-in">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">
          💡 La writers' room
        </p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">
          Pitche les prochains épisodes
        </h1>
        <p className="text-muted-foreground mt-3">
          Like, dislike, programme. Démocratie absolue.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-8 shadow-poster">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nouvelle idée
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre — ex: Cours de salsa raté"
          maxLength={100}
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm mb-2"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Pourquoi ce sera mémorable…"
          rows={2}
          maxLength={300}
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm mb-3"
        />
        <button
          onClick={submit}
          disabled={!title.trim() || createIdea.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold disabled:opacity-30"
        >
          {createIdea.isPending ? "Envoi…" : "Pitcher"}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
        {[{ value: "all" as const, label: "Tout", emoji: "✨" }, ...STATUSES].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
              filter === s.value
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((i, idx) => {
          const liked = i.my_vote === "like";
          const disliked = i.my_vote === "dislike";
          return (
            <div
              key={i.id}
              className="bg-card border border-border rounded-xl p-5 shadow-poster animate-float-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold leading-tight">{i.title}</h3>
                <Badge status={i.status} />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{i.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => onVote(i.id, "like", i.my_vote)}
                    disabled={voteIdea.isPending}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition ${
                      liked
                        ? "bg-accent text-accent-foreground border-accent"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" /> {i.likes.length}
                  </button>
                  <button
                    onClick={() => onVote(i.id, "dislike", i.my_vote)}
                    disabled={voteIdea.isPending}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition ${
                      disliked
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "border-border hover:border-destructive"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" /> {i.dislikes.length}
                  </button>
                </div>
                <select
                  value={i.status}
                  onChange={(e) =>
                    setStatus.mutate({ id: i.id, status: e.target.value as IdeaStatus })
                  }
                  disabled={setStatus.isPending}
                  className="text-xs bg-input/50 border border-border rounded-md px-2 py-1.5"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-3">
                Pitché par {i.proposed_by_name}
              </p>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 text-center py-12 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Aucune idée dans ce statut. Créativité requise.
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ status }: { status: IdeaStatus }) {
  const s = STATUSES.find((x) => x.value === status)!;
  const colors: Record<IdeaStatus, string> = {
    voting: "bg-secondary text-foreground",
    selected: "bg-accent text-accent-foreground",
    scheduled: "bg-primary text-primary-foreground",
    done: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${colors[status]}`}
    >
      {s.emoji} {s.label}
    </span>
  );
}
