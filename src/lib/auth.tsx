import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

const KEY = "nous-and-chill-user";

export const ROLES: { role: Role; name: string; emoji: string; color: string }[] = [
  { role: "samuel", name: "Samuel", emoji: "🎬", color: "from-red-600 to-red-800" },
  { role: "mathilde", name: "Mathilde", emoji: "🌹", color: "from-pink-500 to-rose-700" },
  { role: "amis_samuel", name: "Amis de Samuel", emoji: "🍻", color: "from-amber-500 to-orange-700" },
  { role: "amis_mathilde", name: "Amis de Mathilde", emoji: "💅", color: "from-purple-500 to-fuchsia-700" },
];

interface AuthCtx {
  user: User | null;
  login: (role: Role, name?: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login = (role: Role, name?: string) => {
    const fallback = ROLES.find((r) => r.role === role)?.name ?? "Anonyme";
    const u: User = { role, name: name?.trim() || fallback };
    setUser(u);
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}