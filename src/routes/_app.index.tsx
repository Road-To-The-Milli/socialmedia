import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Compass,
  Flame,
  Info,
  Loader2,
  LogIn,
  Play,
  Plus,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useActiveSpace, useActiveSpaceId } from "@/lib/space-context";
import { useCreateSpace, useEpisodes, useIdeas, useJoinSpace, useSpaces } from "@/lib/store";
import type { Space } from "@/lib/types";
import { EpisodeCard } from "@/components/EpisodeCard";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Nous & Chill" }] }),
  component: Dashboard,
});

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

// ──────────────────────────────────────────────
// Écran d'accueil : aucun espace rejoint
// ──────────────────────────────────────────────

type HomeView = "home" | "create" | "join";

function WelcomeScreen() {
  const { user } = useAuth();
  const [view, setView] = useState<HomeView>("home");

  if (view === "create") return <CreateAdventureScreen onBack={() => setView("home")} />;
  if (view === "join") return <JoinAdventureScreen onBack={() => setView("home")} />;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4">
        Nous &amp; Chill
      </p>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3">
        Bienvenue{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="text-muted-foreground text-sm max-w-xs mb-10">
        Crée une nouvelle aventure ou rejoins-en une avec un code.
      </p>

      <div className="flex gap-4 w-full max-w-sm">
        <button
          type="button"
          onClick={() => setView("create")}
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-primary text-primary-foreground rounded-2xl py-8 font-bold text-sm hover:bg-primary/90 active:scale-[0.97] transition"
        >
          <Plus className="size-7" />
          Créer une aventure
        </button>

        <button
          type="button"
          onClick={() => setView("join")}
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl py-8 font-bold text-sm hover:border-primary hover:text-primary active:scale-[0.97] transition"
        >
          <LogIn className="size-7" />
          Rejoindre une aventure
        </button>
      </div>
    </div>
  );
}

function CreateAdventureScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const createSpace = useCreateSpace();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createSpace.mutate(
      { name: trimmed, type: "other" },
      {
        onSuccess: () => toast.success("Aventure créée !"),
        onError: () => toast.error("Impossible de créer l'aventure."),
      },
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3 text-center">
          Nouvelle aventure
        </p>
        <h2 className="text-3xl font-black tracking-tighter mb-2 text-center">
          Nomme ton aventure
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Un code unique sera généré automatiquement pour inviter tes amis.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Vacances Grèce 2026"
            autoFocus
            className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!name.trim() || createSpace.isPending}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold disabled:opacity-40"
          >
            {createSpace.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlusCircle className="size-4" />
            )}
            Créer l'aventure
          </button>
        </form>
      </div>
    </div>
  );
}

function JoinAdventureScreen({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const joinSpace = useJoinSpace();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    joinSpace.mutate(code.trim(), {
      onSuccess: () => toast.success("Tu as rejoint l'aventure !"),
      onError: (err) => {
        const msg = extractErrorMessage(err);
        if (msg.includes("already_member")) toast.error("Tu es déjà membre de cette aventure.");
        else if (msg.includes("invite_code_expired")) toast.error("Ce code a expiré.");
        else if (msg.includes("invite_code_exhausted")) toast.error("Ce code a atteint sa limite.");
        else if (msg.includes("invalid_invite_code")) toast.error("Code introuvable.");
        else toast.error("Erreur : " + msg);
      },
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3 text-center">
          Rejoindre
        </p>
        <h2 className="text-3xl font-black tracking-tighter mb-2 text-center">
          Entre le code
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Saisis le code unique de l'aventure que tu veux rejoindre.
        </p>

        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE D'INVITATION"
            maxLength={12}
            autoFocus
            className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.3em] text-primary uppercase focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!code.trim() || joinSpace.isPending}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold disabled:opacity-40"
          >
            {joinSpace.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Bandeau "rejoindre une autre aventure" (dans le dashboard)
// ──────────────────────────────────────────────

function JoinBanner() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const joinSpace = useJoinSpace();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    joinSpace.mutate(code.trim(), {
      onSuccess: () => {
        toast.success("Tu as rejoint l'aventure !");
        setOpen(false);
        setCode("");
      },
      onError: (err) => {
        const msg = extractErrorMessage(err);
        if (msg.includes("already_member")) toast.error("Tu es déjà membre de cette aventure.");
        else if (msg.includes("invite_code_expired")) toast.error("Ce code a expiré.");
        else if (msg.includes("invite_code_exhausted")) toast.error("Ce code a atteint sa limite.");
        else if (msg.includes("invalid_invite_code")) toast.error("Code introuvable.");
        else toast.error("Erreur : " + msg);
      },
    });
  };

  if (!open) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary rounded-xl py-3 text-sm font-semibold transition"
        >
          <PlusCircle className="size-4" />
          Rejoindre une autre aventure
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <div className="bg-card border border-border rounded-xl p-5 relative">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition"
        >
          <X className="size-4" />
        </button>
        <p className="text-sm font-semibold mb-3">Rejoindre une autre aventure</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE D'INVITATION"
            maxLength={12}
            autoFocus
            className="flex-1 bg-input/50 border border-border rounded-lg px-3 py-2 text-center font-mono text-sm font-bold tracking-[0.2em] text-primary uppercase focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!code.trim() || joinSpace.isPending}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-bold disabled:opacity-40 shrink-0"
          >
            {joinSpace.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Aperçu des aventures : "Mes aventures" / "Aventures amis"
// ──────────────────────────────────────────────

function AdventureCard({
  space,
  active,
}: {
  space: Space;
  active: boolean;
}) {
  return (
    <Link
      to="/adventure/$spaceId"
      params={{ spaceId: space.id }}
      className={`relative shrink-0 w-52 rounded-xl overflow-hidden border text-left transition snap-start ${
        active
          ? "border-primary ring-2 ring-primary"
          : "border-border hover:border-primary"
      }`}
    >
      <div className="h-24 w-full bg-secondary relative">
        {space.cover_url ? (
          <img src={space.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
        )}
        {active && (
          <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            Actif
          </span>
        )}
      </div>
      <div className="p-3 bg-card">
        <p className="font-semibold text-sm truncate">{space.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {space.member_count ?? 1} membre{(space.member_count ?? 1) > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

type AdventureTab = "mine" | "friends";

function AdventuresOverview({ spaces }: { spaces: Space[] }) {
  const { activeSpaceId } = useActiveSpace();
  const mine = spaces.filter((s) => s.my_role === "owner");
  const friends = spaces.filter((s) => s.my_role !== "owner");

  const [tab, setTab] = useState<AdventureTab>(mine.length ? "mine" : "friends");

  if (!mine.length && !friends.length) return null;

  const shown = tab === "mine" ? mine : friends;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
      <div className="inline-flex items-center gap-1 bg-secondary/50 rounded-lg p-1 mb-4">
        <button
          type="button"
          onClick={() => setTab("mine")}
          disabled={!mine.length}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
            tab === "mine"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="size-4" /> Mes aventures
        </button>
        <button
          type="button"
          onClick={() => setTab("friends")}
          disabled={!friends.length}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
            tab === "friends"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" /> Aventures amis
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
        {shown.map((s) => (
          <AdventureCard key={s.id} space={s} active={s.id === activeSpaceId} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Dashboard principal
// ──────────────────────────────────────────────

function Dashboard() {
  const { user } = useAuth();
  const spaceId = useActiveSpaceId();
  const spacesQuery = useSpaces();
  const episodesQuery = useEpisodes(spaceId);
  const ideasQuery = useIdeas(spaceId);

  if (spacesQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!spacesQuery.data?.length) {
    return <WelcomeScreen />;
  }

  if (episodesQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const episodes = episodesQuery.data ?? [];
  const ideas = ideasQuery.data ?? [];
  const featured = episodes[episodes.length - 1];
  const sorted = [...episodes].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const trending = [...ideas].sort((a, b) => b.likes.length - a.likes.length).slice(0, 6);

  return (
    <div>
      <AdventuresOverview spaces={spacesQuery.data ?? []} />
      <JoinBanner />
      {featured && (
        <section className="relative h-[70vh] min-h-[460px] -mt-14 flex items-end">
          <img
            src={
              featured.cover_url ||
              "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1920&q=80"
            }
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 w-full">
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
              🔴 EN DIRECT · Bienvenue {user?.name}
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-3 max-w-2xl">
              {featured.title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-6">
              Le carnet de bord de votre aventure, épisode par épisode. {episodes.length} épisode
              {episodes.length > 1 ? "s" : ""} au compteur.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/episode/$episodeId"
                params={{ episodeId: featured.id }}
                className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-md font-bold hover:bg-foreground/90 transition"
              >
                <Play className="w-5 h-5 fill-current" /> Voir l'épisode
              </Link>
              <Link
                to="/timeline"
                className="inline-flex items-center gap-2 bg-secondary/80 backdrop-blur text-foreground px-6 py-3 rounded-md font-semibold hover:bg-secondary transition"
              >
                <Info className="w-5 h-5" /> Toute la saison
              </Link>
            </div>
          </div>
        </section>
      )}

      <Row title="📺 Derniers épisodes">
        {sorted.map((ep, i) => (
          <EpisodeCard key={ep.id} ep={ep} index={i} />
        ))}
      </Row>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" /> Idées qui buzzent
          </h2>
          <Link to="/ideas" className="text-sm text-muted-foreground hover:text-foreground">
            Tout voir →
          </Link>
        </div>
        {ideasQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trending.map((i) => (
              <Link
                key={i.id}
                to="/ideas"
                className="block bg-card border border-border rounded-xl p-4 hover:border-primary transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold group-hover:text-primary transition">{i.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary shrink-0">
                    {statusLabel(i.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{i.description}</p>
                <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                  <span>👍 {i.likes.length}</span>
                  <span>👎 {i.dislikes.length}</span>
                  <span>par {i.proposed_by_name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory">
        {Array.isArray(children)
          ? children.map((c, i) => (
              <div key={i} className="snap-start">
                {c}
              </div>
            ))
          : children}
      </div>
    </section>
  );
}

function statusLabel(s: string) {
  return (
    {
      voting: "🗳 À voter",
      selected: "✅ Sélectionné",
      scheduled: "📅 Programmé",
      done: "🎬 Réalisé",
    }[s] || s
  );
}
