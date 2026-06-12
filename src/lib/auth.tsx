import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Role, User } from "./types";

interface CreateAdventureParams {
  mode: "create";
  email: string;
  password: string;
  name: string;
}

interface JoinAdventureParams {
  mode: "join";
  email: string;
  password: string;
  name: string;
  inviteCode: string;
}

type SignUpParams = CreateAdventureParams | JoinAdventureParams;

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadUser(authUserId: string, email: string | undefined): Promise<User | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", authUserId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name, role: data.role as Role, email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      const profile = session ? await loadUser(session.user.id, session.user.email) : null;
      if (!active) return;
      setUser(profile);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await loadUser(session.user.id, session.user.email) : null;
      if (!active) return;
      setUser(profile);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (params: SignUpParams) => {
    const data: Record<string, string> =
      params.mode === "create"
        ? { mode: "create", name: params.name.trim() }
        : {
            mode: "join",
            name: params.name.trim(),
            invite_code: params.inviteCode.trim().toLowerCase(),
          };

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: { data },
    });
    if (error) throw error;
    if (!signUpData.session) throw new Error("signup_no_session");
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, signUp, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
