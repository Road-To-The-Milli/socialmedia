import { Link } from "@tanstack/react-router";
import type { Episode } from "@/lib/types";

const fallbackCover =
  "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1200&q=80";

export function EpisodeCard({ ep, index = 0 }: { ep: Episode; index?: number }) {
  return (
    <Link
      to="/episode/$episodeId"
      params={{ episodeId: ep.id }}
      className="group relative block w-[260px] sm:w-[300px] shrink-0 rounded-xl overflow-hidden shadow-poster transition-transform duration-300 hover:scale-[1.04] hover:shadow-glow animate-float-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-secondary">
        <img
          src={ep.cover_url || fallbackCover}
          alt={ep.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold tracking-wider">
          S01·E{String(ep.number).padStart(2, "0")}
        </div>
        {ep.tags && ep.tags.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-wrap gap-1 max-w-[60%] justify-end">
            {ep.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-black/70 text-[10px] uppercase tracking-wider font-semibold"
              >
                {tag}
              </span>
            ))}
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
