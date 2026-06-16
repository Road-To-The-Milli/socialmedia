import { Link } from "@tanstack/react-router";
import { Film, Clapperboard, Heart } from "lucide-react";

const tabs = [
  { to: "/", label: "Accueil", icon: Film },
  { to: "/timeline", label: "Saison", icon: Clapperboard },
  { to: "/ideas", label: "Idées", icon: Heart },
] as const;

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-0.5 flex-1 py-2 text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
