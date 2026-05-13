import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { clearSession, readSession, writeSession } from "./api";
import type { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  loginWithCode: (code: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
}

const Ctx = createContext<AuthCtx | null>(null);

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const LOCAL_CODE_USERS: Array<User & { code: string | undefined }> = [
  { id: "samuel", name: "Samuel", role: "samuel", code: import.meta.env.VITE_CODE_SAMUEL || "nerve" },
  { id: "mathilde", name: "Mathilde", role: "mathilde", code: import.meta.env.VITE_CODE_MATHILDE || "mathilde" },
  { id: "amis_samuel", name: "Amis de Samuel", role: "amis_samuel", code: import.meta.env.VITE_CODE_AMIS_SAMUEL || "amis-samuel" },
  { id: "amis_mathilde", name: "Amis de Mathilde", role: "amis_mathilde", code: import.meta.env.VITE_CODE_AMIS_MATHILDE || "amis-mathilde" },
];

function normalizeCode(value: string | undefined) {
  return String(value || "").trim().toLowerCase();
}

function createLocalToken() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession()?.user ?? null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<User | null> => {
    const stored = readSession();
    if (!stored) {
      setUser(null);
      return null;
    }
    setUser(stored.user);
    return stored.user;
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const loginWithCode = useCallback(async (code: string): Promise<User> => {
    const cleanCode = normalizeCode(code);
    const match = LOCAL_CODE_USERS.find((u) => normalizeCode(u.code) === cleanCode);
    if (!match) throw new Error("invalid_code");

    const user: User = { id: match.id, name: match.name, role: match.role };
    writeSession({
      session_token: createLocalToken(),
      user,
      expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, loginWithCode, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}

