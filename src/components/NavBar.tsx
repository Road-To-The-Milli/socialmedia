import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Film, Heart, Vote, Sparkles, LogOut, Clapperboard } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Accueil", icon: Film },
  { to: "/timeline", label: "Saison", icon: Clapperboard },
  { to: "/ideas", label: "Idées", icon: Heart },
  { to: "/vote", label: "Vote final", icon: Vote },
  { to: "/synthese", label: "Synthèse IA", icon: Sparkles },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== "undefined") {
    window.addEventListener(
      "scroll",
      () => setScrolled(window.scrollY > 20),
      { passive: true, once: false },
    );
  }

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-gradient-to-b from-background to-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-black tracking-tighter text-gradient-red">N&C</span>
          <span className="hidden sm:inline text-xs uppercase tracking-widest text-muted-foreground">Nous & Chill</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 whitespace-nowrap"
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <button
            onClick={() => {
              logout();
              nav({ to: "/login" });
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">{user.name}</span>
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}