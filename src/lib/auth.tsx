import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearSession, readSession, writeSession, ApiError } from "./api";
import type { Session, User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<User | null> => {
    const stored = readSession();
    if (!stored) {
      setUser(null);
      return null;
    }
    try {
      const res = await api.post<{ user: User }>("/auth/me");
      setUser(res.user);
      return res.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const requestMagicLink = useCallback(async (email: string) => {
    await api.post<{ ok: true }>("/auth/request", { email });
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<User> => {
    const res = await api.post<Session>("/auth/verify", { token });
    writeSession({ session_token: res.session_token, user: res.user });
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network/server failures — we always clear locally.
    }
    clearSession();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, requestMagicLink, verifyMagicLink, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
