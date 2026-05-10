import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import type { EpisodeReview } from "@/lib/types";
import { Star, ArrowLeft, Music, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/episode/$episodeId")({
  component: EpisodeDetail,
});

function EpisodeDetail() {
  const { episodeId } = Route.useParams();
  const { episodes, updateEpisodeReview } = useStore();
  const { user } = useAuth();
  const ep = episodes.find((e) => e.id === episodeId);
  if (!ep) throw notFound();

  const canEditAs: ("samuel" | "mathilde") | null =
    user?.role === "samuel" ? "samuel" : user?.role === "mathilde" ? "mathilde" : null;

  return (
    <div>
      <div className="relative h-[50vh] min-h-[340px] -mt-14">
        <img src={ep.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <Link
          to="/timeline"
          className="absolute top-20 left-4 sm:left-8 z-10 inline-flex items-center gap-1 text-sm bg-black/50 backdrop-blur px-3 py-1.5 rounded-full hover:bg-black/70"
        >
          <ArrowLeft className="w-4 h-4" /> Saison
        </Link>
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">
            S01 · ÉPISODE {String(ep.number).padStart(2, "0")}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">{ep.title}</h1>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(ep.date).toLocaleDateString("fr-FR", { dateStyle: "long" })}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {ep.place}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-6">
        <ReviewPanel
          who="samuel"
          label="🎬 Le compte rendu de Samuel"
          review={ep.reviews.samuel}
          editable={canEditAs === "samuel"}
          onSave={(r) => {
            updateEpisodeReview(ep.id, "samuel", r);
            toast.success("Compte rendu enregistré");
          }}
        />
        <ReviewPanel
          who="mathilde"
          label="🌹 Le compte rendu de Mathilde"
          review={ep.reviews.mathilde}
          editable={canEditAs === "mathilde"}
          onSave={(r) => {
            updateEpisodeReview(ep.id, "mathilde", r);
            toast.success("Compte rendu enregistré");
          }}
        />
      </div>
    </div>
  );
}

const empty: EpisodeReview = {
  rating: 0,
  favoriteMoment: "",
  awkwardMoment: "",
  funnyQuote: "",
  summary: "",
  wouldRedo: "",
  song: "",
};

function ReviewPanel({
  label,
  review,
  editable,
  onSave,
}: {
  who: "samuel" | "mathilde";
  label: string;
  review?: EpisodeReview;
  editable: boolean;
  onSave: (r: EpisodeReview) => void;
}) {
  const [editing, setEditing] = useState(!review && editable);
  const [draft, setDraft] = useState<EpisodeReview>(review || empty);

  if (!editing) {
    if (!review) {
      return (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <h3 className="font-bold mb-1">{label}</h3>
          <p className="text-sm text-muted-foreground mb-3">Pas encore de compte rendu. Suspense.</p>
          {editable && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold"
            >
              ✍ Écrire le mien
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-poster">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{label}</h3>
          {editable && (
            <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground">
              modifier
            </button>
          )}
        </div>
        <Stars value={review.rating} />
        <Field label="Moment préféré">{review.favoriteMoment}</Field>
        <Field label="Moment gênant">{review.awkwardMoment}</Field>
        <Field label="Citation drôle">{review.funnyQuote}</Field>
        <Field label="Résumé">{review.summary}</Field>
        <Field label="On le referait ?">
          {review.wouldRedo
            ? { yes: "✅ Oui clairement", no: "❌ Non merci", maybe: "🤷 Peut-être" }[review.wouldRedo]
            : "—"}
        </Field>
        {review.song && (
          <a
            href={review.song}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm text-accent hover:underline"
          >
            <Music className="w-4 h-4" /> Écouter la chanson
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary rounded-xl p-5 shadow-glow">
      <h3 className="font-bold mb-3">{label}</h3>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Note</label>
      <Stars value={draft.rating} editable onChange={(v) => setDraft({ ...draft, rating: v })} />
      <Input label="Moment préféré" value={draft.favoriteMoment} onChange={(v) => setDraft({ ...draft, favoriteMoment: v })} />
      <Input label="Moment gênant" value={draft.awkwardMoment} onChange={(v) => setDraft({ ...draft, awkwardMoment: v })} />
      <Input label="Citation drôle" value={draft.funnyQuote} onChange={(v) => setDraft({ ...draft, funnyQuote: v })} />
      <Textarea label="Résumé libre" value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })} />
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1 mt-3">On le referait ?</label>
      <div className="flex gap-2 mb-3">
        {([
          ["yes", "✅ Oui"],
          ["maybe", "🤷 Peut-être"],
          ["no", "❌ Non"],
        ] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setDraft({ ...draft, wouldRedo: v })}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              draft.wouldRedo === v ? "bg-primary border-primary text-primary-foreground" : "border-border"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <Input label="Lien Spotify / YouTube" value={draft.song} onChange={(v) => setDraft({ ...draft, song: v })} />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            onSave(draft);
            setEditing(false);
          }}
          className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-md hover:bg-primary/90"
        >
          Enregistrer
        </button>
        <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-muted-foreground">
          Annuler
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{children || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Stars({
  value,
  editable = false,
  onChange,
}: {
  value: number;
  editable?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex gap-1 mb-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!editable}
          onClick={() => onChange?.(n)}
          className={editable ? "cursor-pointer hover:scale-110 transition" : "cursor-default"}
        >
          <Star
            className={`w-6 h-6 ${n <= value ? "fill-accent text-accent" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}