import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Film, Heart, LogOut, Clapperboard, LogIn, Settings, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMarkNotificationsRead, useNotifications } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NotificationBell() {
  const nav = useNavigate();
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationsRead();
  const notifications = notificationsQuery.data ?? [];
  const unread = useMemo(() => notifications.filter((n) => !n.read_at), [notifications]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread.length) markRead.mutate(unread.map((n) => n.id));
      }}
    >
      <DropdownMenuTrigger className="relative flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors outline-none shrink-0">
        <Bell className="size-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground text-center">
            Aucune notification pour l'instant.
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="cursor-pointer flex flex-col items-start gap-0.5 whitespace-normal py-2"
              onClick={() => {
                if (n.url) nav({ to: n.url as never });
              }}
            >
              <span className="text-sm font-medium leading-snug">{n.title}</span>
              {n.body && (
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

        <nav className="hidden md:flex items-center gap-1">
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
          <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
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
          </div>
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
