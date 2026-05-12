import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, MapPin, Calendar, Music, NotebookPen } from "lucide-react";
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
                  {ep.notes && (
                    <p className="mt-3 flex gap-2 line-clamp-2 text-sm text-muted-foreground">
                      <NotebookPen className="mt-0.5 size-4 shrink-0" />
                      <span>{ep.notes}</span>
                    </p>
                  )}
                  {ep.music_url && (
                    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      <Music className="size-3.5" />
                      Musique ajoutee
                    </span>
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
  const [coverUrl, setCoverUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [showImageField, setShowImageField] = useState(false);

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
      cover_url: coverUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      music_url: musicUrl.trim() || undefined,
    });

    setTitle("");
    setDate("");
    setPlace("");
    setDuration("");
    setCoverUrl("");
    setNotes("");
    setMusicUrl("");
    setShowImageField(false);
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
        <Input
          label="Lien musique"
          value={musicUrl}
          onChange={setMusicUrl}
          placeholder="https://open.spotify.com/..."
          type="url"
        />
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold">Image de l'aventure</h3>
            <p className="text-xs text-muted-foreground">
              Ajoute une photo ou une image pour illustrer cette date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowImageField((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            <ImagePlus className="size-4" />
            {showImageField || coverUrl ? "Modifier l'image" : "Ajouter une image"}
          </button>
        </div>

        {(showImageField || coverUrl) && (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
            <Input
              label="Lien de l'image"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="https://..."
              type="url"
            />
            <div className="min-h-28 overflow-hidden rounded-lg border border-border bg-muted/40">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="h-full min-h-28 w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-28 items-center justify-center text-xs text-muted-foreground">
                  Apercu
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Textarea
        label="Notes"
        value={notes}
        onChange={setNotes}
        placeholder="Ce qu'on veut retenir de cette date..."
      />
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

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-y rounded-lg border border-border bg-input/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
