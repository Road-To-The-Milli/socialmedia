import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ArrowLeft, Music, MapPin, Calendar, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useEpisodeReviews, useEpisodes, useSaveReview } from "@/lib/store";
import type { Review, ReviewDraft, Role, WouldRedo } from "@/lib/types";

export const Route = createFileRoute("/_app/episode/$episodeId")({
  component: EpisodeDetail,
});

const COUPLE: Role[] = ["samuel", "mathilde"];

const ROLE_LABEL: Record<Role, { label: string; emoji: string }> = {
  samuel: { label: "Samuel", emoji: "🎬" },
  mathilde: { label: "Mathilde", emoji: "🌹" },
  amis_samuel: { label: "Amis de Samuel", emoji: "🍻" },
  amis_mathilde: { label: "Amis de Mathilde", emoji: "💅" },
};

function EpisodeDetail() {
  const { episodeId } = Route.useParams();
  const { user } = useAuth();
  const episodesQuery = useEpisodes();
  const reviewsQuery = useEpisodeReviews(episodeId);
  const saveReview = useSaveReview(episodeId);

  if (episodesQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const ep = episodesQuery.data?.find((e) => e.id === episodeId);
  if (!ep) throw notFound();

  const reviewsData = reviewsQuery.data;
  const reviews = reviewsData?.reviews ?? [];
  const seasonUnlocked = reviewsData?.season_unlocked ?? false;
  const visibleRatings = reviews.map((r) => r.rating).filter((n) => n > 0);
  const avg = visibleRatings.length
    ? visibleRatings.reduce((a, b) => a + b, 0) / visibleRatings.length
    : null;

  const myRole = user?.role;

  const reviewByRole = (role: Role) => reviews.find((r) => r.author_role === role);
  const myReview = myRole ? reviews.find((r) => r.author_role === myRole) : undefined;
  const couplePartner: Role | null =
    myRole === "samuel" ? "mathilde" : myRole === "mathilde" ? "samuel" : null;

  return (
    <div>
      <div className="relative h-[50vh] min-h-[340px] -mt-14">
        {ep.cover_url && (
          <img src={ep.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
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
            {avg !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                {avg.toFixed(1)}/5
                {!seasonUnlocked && couplePartner && (
                  <span className="ml-1 inline-flex items-center text-xs">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-6">
        {COUPLE.map((role) => {
          const review = reviewByRole(role);
          const isMine = role === myRole;
          const editable = isMine;
          const partnerHidden = !seasonUnlocked && role === couplePartner;

          if (partnerHidden) {
            return (
              <LockedReviewPanel
                key={role}
                label={`${ROLE_LABEL[role].emoji} Le compte rendu de ${ROLE_LABEL[role].label}`}
              />
            );
          }

          return (
            <ReviewPanel
              key={role}
              label={`${ROLE_LABEL[role].emoji} Le compte rendu de ${ROLE_LABEL[role].label}`}
              review={review}
              editable={editable}
              saving={saveReview.isPending}
              onSave={(draft) =>
                saveReview.mutate(draft, {
                  onSuccess: () => toast.success("Compte rendu enregistré"),
                  onError: () => toast.error("Échec de l'enregistrement."),
                })
              }
            />
          );
        })}
      </div>

      {myReview && !seasonUnlocked && couplePartner && (
        <p className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-10 text-center text-xs text-muted-foreground">
          ✨ Tu as livré ton compte rendu. Celui de {ROLE_LABEL[couplePartner].label} sera révélé
          à la fin de la saison.
        </p>
      )}
    </div>
  );
}

function LockedReviewPanel({ label }: { label: string }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
      <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
      <h3 className="font-bold mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground">
        🔒 Visible à la fin de la saison. Pas de spoilers.
      </p>
    </div>
  );
}

const empty: ReviewDraft = {
  rating: 0,
  favorite_moment: "",
  awkward_moment: "",
  funny_quote: "",
  summary: "",
  would_redo: "",
  song: "",
};

function reviewToDraft(r?: Review): ReviewDraft {
  if (!r) return empty;
  return {
    rating: r.rating,
    favorite_moment: r.favorite_moment,
    awkward_moment: r.awkward_moment,
    funny_quote: r.funny_quote,
    summary: r.summary,
    would_redo: r.would_redo,
    song: r.song,
  };
}

function ReviewPanel({
  label,
  review,
  editable,
  saving,
  onSave,
}: {
  label: string;
  review?: Review;
  editable: boolean;
  saving: boolean;
  onSave: (r: ReviewDraft) => void;
}) {
  const [editing, setEditing] = useState(!review && editable);
  const [draft, setDraft] = useState<ReviewDraft>(reviewToDraft(review));

  if (!editing) {
    if (!review) {
      return (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <h3 className="font-bold mb-1">{label}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Pas encore de compte rendu. Suspense.
          </p>
          {editable && (
            <button
              onClick={() => {
                setDraft(empty);
                setEditing(true);
              }}
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
            <button
              onClick={() => {
                setDraft(reviewToDraft(review));
                setEditing(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              modifier
            </button>
          )}
        </div>
        <Stars value={review.rating} />
        <Field label="Moment préféré">{review.favorite_moment}</Field>
        <Field label="Moment gênant">{review.awkward_moment}</Field>
        <Field label="Citation drôle">{review.funny_quote}</Field>
        <Field label="Note de bas de page" large>{review.summary}</Field>
        <Field label="On le referait ?">
          {review.would_redo
            ? { yes: "✅ Oui clairement", no: "❌ Non merci", maybe: "🤷 Peut-être" }[
                review.would_redo
              ]
            : "—"}
        </Field>
        {review.song && (
          <a
            href={review.song}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent hover:bg-accent/15"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
              <Music className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-xs uppercase tracking-wider text-accent/80">
                Musique de la date
              </span>
              <span className="font-semibold">Ouvrir le lien Spotify</span>
            </span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary rounded-xl p-5 shadow-glow">
      <h3 className="font-bold mb-3">{label}</h3>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Note
      </label>
      <Stars value={draft.rating} editable onChange={(v) => setDraft({ ...draft, rating: v })} />
      <Input
        label="Moment préféré"
        value={draft.favorite_moment}
        onChange={(v) => setDraft({ ...draft, favorite_moment: v })}
      />
      <Input
        label="Moment gênant"
        value={draft.awkward_moment}
        onChange={(v) => setDraft({ ...draft, awkward_moment: v })}
      />
      <Input
        label="Citation drôle"
        value={draft.funny_quote}
        onChange={(v) => setDraft({ ...draft, funny_quote: v })}
      />
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1 mt-3">
        On le referait ?
      </label>
      <div className="flex gap-2 mb-3">
        {(
          [
            ["yes", "✅ Oui"],
            ["maybe", "🤷 Peut-être"],
            ["no", "❌ Non"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setDraft({ ...draft, would_redo: v as WouldRedo })}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              draft.would_redo === v
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Music className="size-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold">Musique de la date</h4>
            <p className="text-xs text-muted-foreground">
              Colle ici un lien Spotify pour garder la bande-son de l'aventure.
            </p>
          </div>
        </div>
      <Input
        label="Lien Spotify / YouTube"
        value={draft.song}
        onChange={(v) => setDraft({ ...draft, song: v })}
        placeholder="https://open.spotify.com/..."
      />
      </div>
      <Textarea
        label="Grande note de fin"
        value={draft.summary}
        onChange={(v) => setDraft({ ...draft, summary: v })}
        rows={7}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(draft)}
          disabled={saving}
          className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-md hover:bg-primary/90 disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-2 text-sm text-muted-foreground"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  large = false,
}: {
  label: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className={large ? "mt-5 rounded-xl border border-border bg-background/40 p-4" : "mt-3"}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={large ? "mt-2 whitespace-pre-wrap text-base leading-7" : "text-sm mt-0.5"}>
        {children || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
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
            className={`w-6 h-6 ${
              n <= value ? "fill-accent text-accent" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

