import { Link, useNavigate } from "@tanstack/react-router";
import { Film, Heart, LogOut, Clapperboard, LogIn, Settings, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/", label: "Accueil", icon: Film },
  { to: "/timeline", label: "Saison", icon: Clapperboard },
  { to: "/ideas", label: "Idées", icon: Heart },
] as const;

export function NavBar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/login", search: { redirect: "/" } });
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-gradient-to-b from-background to-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-black tracking-tighter text-gradient-red">N&amp;C</span>
          <span className="hidden sm:inline text-xs uppercase tracking-widest text-muted-foreground">
            Nous &amp; Chill
          </span>
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

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors outline-none shrink-0">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatar_url} alt={user.name} />
                <AvatarFallback className="text-xs font-bold">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold truncate">{user.name}</span>
                  {user.email && (
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {user.email}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="size-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="size-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            search={{ redirect: "/" }}
            className="flex items-center gap-2 text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-md transition-colors shrink-0"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </Link>
        )}
      </div>
    </header>
  );
}
