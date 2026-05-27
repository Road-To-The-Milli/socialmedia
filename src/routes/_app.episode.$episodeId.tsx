import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Film,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Music,
  Send,
  Star,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useCreateEpisodeComment,
  useEpisodeComments,
  useEpisodeReviews,
  useEpisodes,
  useSaveReview,
  useUploadEpisodeMedia,
} from "@/lib/store";
import type {
  Episode,
  EpisodeComment,
  EpisodeMedia,
  EpisodeMediaUpload,
  Review,
  ReviewDraft,
  Role,
  WouldRedo,
} from "@/lib/types";

export const Route = createFileRoute("/_app/episode/$episodeId")({
  component: EpisodeDetail,
});

const COUPLE: Role[] = ["samuel", "mathilde"];

function canUploadEpisodeMedia(role: Role | undefined): boolean {
  return role === "samuel" || role === "mathilde";
}

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
  const commentsQuery = useEpisodeComments(episodeId);
  const saveReview = useSaveReview(episodeId);
  const createComment = useCreateEpisodeComment(episodeId);
  const uploadMedia = useUploadEpisodeMedia(episodeId);

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
  const canManageMedia = canUploadEpisodeMedia(myRole);

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
              onSave={async (draft) => {
                const res = await saveReview.mutateAsync(draft);
                toast.success("Compte rendu enregistré");
                return res.review;
              }}
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

      <MediaSection
        episode={ep}
        canUpload={canManageMedia}
        saving={uploadMedia.isPending}
        onUpload={(files) =>
          uploadMedia.mutate(files, {
            onSuccess: () => toast.success("Média ajouté à l'épisode"),
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Impossible d'ajouter le média."),
          })
        }
      />


      <CommentsSection
        comments={commentsQuery.data?.comments ?? []}
        loading={commentsQuery.isLoading}
        saving={createComment.isPending}
        onSubmit={async (draft) => {
          const res = await createComment.mutateAsync(draft);
          toast.success("Commentaire ajoute");
          return res.comment;
        }}
      />
    </div>
  );
}

function CommentsSection({
  comments,
  loading,
  saving,
  onSubmit,
}: {
  comments: EpisodeComment[];
  loading: boolean;
  saving: boolean;
  onSubmit: (draft: { author_name: string; body: string }) => Promise<EpisodeComment>;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const canSubmit = name.trim().length >= 2 && body.trim().length >= 2 && !saving;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          className="rounded-xl border border-border bg-card p-5 shadow-poster"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit) return;
            try {
              await onSubmit({ author_name: name.trim(), body: body.trim() });
              setBody("");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Impossible d'ajouter le commentaire.");
            }
          }}
        >
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <MessageCircle className="size-4" />
            Laisser un commentaire
          </p>
          <h2 className="text-xl font-black tracking-tight">Vos reactions</h2>

          <label className="mt-4 block text-xs uppercase tracking-wider text-muted-foreground">
            Prenom
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-input/50 px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
            <UserRound className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Prenom"
              maxLength={40}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <label className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">
            Commentaire
          </label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Reagis a cet episode..."
            rows={5}
            maxLength={800}
            className="mt-1 w-full resize-none rounded-lg border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{body.length}/800</span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publier
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight">Tous les commentaires</h2>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {comments.length}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : comments.length ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-lg border border-border bg-background/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold leading-tight">{comment.author_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatCommentDate(comment.created_at)}
                      </p>
                    </div>
                    {comment.author_role && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {ROLE_LABEL[comment.author_role]?.label ?? comment.author_role}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Aucun commentaire pour le moment.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatCommentDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MediaSection({
  episode,
  canUpload,
  saving,
  onUpload,
}: {
  episode: Episode;
  canUpload: boolean;
  saving: boolean;
  onUpload: (files: EpisodeMediaUpload[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const media = episode.media ?? [];

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const allowed = files.filter((file) => {
      const okType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const okSize = file.size <= 5 * 1024 * 1024;
      if (!okType) toast.error(`${file.name} n'est ni une photo ni une vidéo.`);
      if (!okSize) toast.error(`${file.name} dépasse 5 Mo.`);
      return okType && okSize;
    });

    if (!allowed.length) return;
    const payload = await Promise.all(allowed.map(fileToUpload));
    onUpload(payload);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <Film className="size-4" />
            Souvenirs de l'épisode
          </p>
          <h2 className="text-2xl font-black tracking-tight">Photos & vidéos</h2>
        </div>

        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Ajouter
            </button>
          </>
        )}
      </div>

      {media.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item, index) => (
            <MediaTile key={item.id || item.url || index} item={item} />
          ))}
        </div>
      ) : canUpload ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={saving}
          className="mt-5 w-full rounded-xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-foreground disabled:opacity-40"
        >
          <ImagePlus className="mx-auto mb-2 size-6" />
          Ajouter des photos ou vidéos
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          <ImagePlus className="mx-auto mb-2 size-6" />
          Aucun souvenir ajouté pour cet épisode.
        </div>
      )}
    </section>
  );
}

function MediaTile({ item }: { item: EpisodeMedia }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-card"
      title={item.filename}
    >
      {item.type === "video" ? (
        <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
      ) : item.type === "image" ? (
        <img src={item.url} alt={item.filename} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Film className="size-7" />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
        {item.filename}
      </span>
    </a>
  );
}

function fileToUpload(file: File): Promise<EpisodeMediaUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const [, base64 = ""] = result.split(",");
      resolve({
        file: base64,
        filename: file.name || `media-${Date.now()}`,
        contentType: file.type || "application/octet-stream",
      });
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
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
  onSave: (r: ReviewDraft) => Promise<Review>;
}) {
  const [editing, setEditing] = useState(!review && editable);
  const [draft, setDraft] = useState<ReviewDraft>(reviewToDraft(review));
  const [savedReview, setSavedReview] = useState<Review | undefined>(review);
  const displayedReview = savedReview ?? review;

  useEffect(() => {
    setSavedReview(review);
    if (review) setDraft(reviewToDraft(review));
  }, [review]);

  if (!editing) {
    if (!displayedReview) {
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
                setDraft(reviewToDraft(displayedReview));
                setEditing(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Modifier
            </button>
          )}
        </div>
        <Stars value={displayedReview.rating} />
        <Field label="Moment préféré">{displayedReview.favorite_moment}</Field>
        <Field label="Moment gênant">{displayedReview.awkward_moment}</Field>
        <Field label="Citation drôle">{displayedReview.funny_quote}</Field>
        <Field label="Note de bas de page" large>{displayedReview.summary}</Field>
        <Field label="On le referait ?">
          {displayedReview.would_redo
            ? { yes: "✅ Oui clairement", no: "❌ Non merci", maybe: "🤷 Peut-être" }[
                displayedReview.would_redo
              ]
            : "—"}
        </Field>
        {displayedReview.song && (
          <a
            href={displayedReview.song}
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
          onClick={async () => {
            try {
              const nextReview = await onSave(draft);
              setSavedReview(nextReview);
              setDraft(reviewToDraft(nextReview));
              setEditing(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement.");
            }
          }}
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
