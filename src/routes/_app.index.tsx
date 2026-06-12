import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Info, Flame, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEpisodes, useIdeas } from "@/lib/store";
import { EpisodeCard } from "@/components/EpisodeCard";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Nous & Chill — Saison 1" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const episodesQuery = useEpisodes();
  const ideasQuery = useIdeas();

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
              Le carnet de bord de notre aventure, épisode par épisode. {episodes.length} épisodes
              au compteur. Spoilers garantis.
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
