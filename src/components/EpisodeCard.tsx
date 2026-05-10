import { Link } from "@tanstack/react-router";
import type { Episode } from "@/lib/types";
import { Star } from "lucide-react";

const fallbackCover =
  "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1200&q=80";

export function EpisodeCard({ ep, index = 0 }: { ep: Episode; index?: number }) {
  const ratings = [ep.reviews.samuel?.rating, ep.reviews.mathilde?.rating].filter(
    (n): n is number => typeof n === "number",
  );
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return (
    <Link
      to="/episode/$episodeId"
      params={{ episodeId: ep.id }}
      className="group relative block w-[260px] sm:w-[300px] shrink-0 rounded-xl overflow-hidden shadow-poster transition-transform duration-300 hover:scale-[1.04] hover:shadow-glow animate-float-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-secondary">
        <img
          src={ep.cover || fallbackCover}
          alt={ep.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold tracking-wider">
          S01·E{String(ep.number).padStart(2, "0")}
        </div>
        {avg !== null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/70 text-xs font-semibold">
            <Star className="w-3 h-3 fill-accent text-accent" />
            {avg.toFixed(1)}
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h3 className="font-bold text-base leading-tight line-clamp-2">{ep.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(ep.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {" · "}
            {ep.place}
          </p>
        </div>
      </div>
    </Link>
  );
}