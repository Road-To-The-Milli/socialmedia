import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCreateEpisode, useEpisodes } from "@/lib/store";
import type { EpisodeDraft } from "@/lib/types";

export const Route = createFileRoute("/_app/timeline")({
  head: () => ({ meta: [{ title: "Timeline · Nous & Chill" }] }),
  component: Timeline,
});

function Timeline() {
  const { user } = useAuth();
  const { data: episodes, isLoading } = useEpisodes();
  const createEpisode = useCreateEpisode();
  const canCreateEpisode = user?.role === "samuel" || user?.role === "mathilde";

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const sorted = [...(episodes ?? [])].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10 text-center animate-float-in">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">
          📜 Le récap chronologique
        </p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">
          La saison épisode par épisode
        </h1>
        <p className="text-muted-foreground mt-3">Du pilote au cliffhanger. Spoilers inside.</p>
      </div>

      {canCreateEpisode && (
        <EpisodeForm
          saving={createEpisode.isPending}
          onCreate={(draft) =>
            createEpisode.mutate(draft, {
              onSuccess: () => toast.success("Date ajoutée à la saison"),
              onError: (err) =>
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Impossible d'ajouter cette date pour le moment.",
                ),
            })
          }
        />
      )}

      <div className="relative pl-6 sm:pl-10">
        <div className="absolute left-2 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        {sorted.map((ep, i) => (
          <div
            key={ep.id}
            className="relative mb-8 animate-float-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute -left-[22px] sm:-left-[30px] top-4 w-4 h-4 rounded-full bg-primary ring-4 ring-background animate-pulse-red" />
            <Link
              to="/episode/$episodeId"
              params={{ episodeId: ep.id }}
              className="block bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition group shadow-poster"
            >
              <div className="flex flex-col sm:flex-row">
                {ep.cover_url && (
                  <div className="sm:w-48 aspect-video sm:aspect-auto relative shrink-0">
                    <img
                      src={ep.cover_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 sm:p-5 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary tracking-widest">
                      S01·E{String(ep.number).padStart(2, "0")}
                    </span>
                    {ep.duration && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {ep.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-primary transition">
                    {ep.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ep.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ep.place}
                    </span>
                  </div>
                  {ep.tags && ep.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {ep.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-secondary text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function EpisodeForm({
  saving,
  onCreate,
}: {
  saving: boolean;
  onCreate: (draft: EpisodeDraft) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();
    const trimmedPlace = place.trim();
    if (!trimmedTitle || !trimmedDate || !trimmedPlace) return;

    onCreate({
      title: trimmedTitle,
      date: trimmedDate,
      place: trimmedPlace,
      duration: duration.trim() || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      cover_url: coverUrl.trim() || undefined,
    });

    setTitle("");
    setDate("");
    setPlace("");
    setDuration("");
    setTags("");
    setCoverUrl("");
  };

  return (
    <form
      onSubmit={submit}
      className="mb-10 bg-card border border-border rounded-xl p-5 shadow-poster"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold">Ajouter une date</h2>
          <p className="text-sm text-muted-foreground">
            Crée un épisode, puis chacun pourra remplir son compte rendu.
          </p>
        </div>
        <button
          type="submit"
          disabled={!title.trim() || !date || !place.trim() || saving}
          className="shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
        >
          {saving ? "Ajout..." : "Ajouter"}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Titre" value={title} onChange={setTitle} placeholder="E05 — Dîner surprise" />
        <Input label="Date" value={date} onChange={setDate} type="date" />
        <Input label="Lieu" value={place} onChange={setPlace} placeholder="Paris, Le Marais" />
        <Input label="Durée" value={duration} onChange={setDuration} placeholder="2h30" />
        <Input label="Tags" value={tags} onChange={setTags} placeholder="Slow burn, fou rire" />
        <Input
          label="Image"
          value={coverUrl}
          onChange={setCoverUrl}
          placeholder="https://..."
          type="url"
        />
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
