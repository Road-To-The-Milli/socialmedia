import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Star, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/timeline")({
  head: () => ({ meta: [{ title: "Timeline · Nous & Chill" }] }),
  component: Timeline,
});

function Timeline() {
  const { episodes } = useStore();
  const sorted = [...episodes].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10 text-center animate-float-in">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">📜 Le récap chronologique</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">La saison épisode par épisode</h1>
        <p className="text-muted-foreground mt-3">Du pilote au cliffhanger. Spoilers inside.</p>
      </div>

      <div className="relative pl-6 sm:pl-10">
        <div className="absolute left-2 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        {sorted.map((ep, i) => {
          const ratings = [ep.reviews.samuel?.rating, ep.reviews.mathilde?.rating].filter(Boolean) as number[];
          const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
          return (
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
                  {ep.cover && (
                    <div className="sm:w-48 aspect-video sm:aspect-auto relative shrink-0">
                      <img src={ep.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 sm:p-5 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary tracking-widest">
                        S01·E{String(ep.number).padStart(2, "0")}
                      </span>
                      {avg !== null && (
                        <span className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 fill-accent text-accent" />
                          {avg.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-primary transition">{ep.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ep.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ep.place}
                      </span>
                    </div>
                    {ep.reviews.samuel?.summary && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2 italic">
                        « {ep.reviews.samuel.summary} »
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}