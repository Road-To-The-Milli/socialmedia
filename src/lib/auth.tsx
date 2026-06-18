import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "./supabase";
import type { User } from "./types";

export const OAUTH_PENDING_KEY = "oauth_pending_setup";

export interface OAuthPending {
  pendingAdventureName?: string;
  pendingInviteCode?: string;
}

interface SignUpParams {
  email: string;
  password: string;
  name: string;
  /** Nom de l'aventure à créer une fois l'email confirmé. */
  pendingAdventureName?: string;
  /** Code d'invitation à utiliser une fois l'email confirmé. */
  pendingInviteCode?: string;
}

interface SignUpResult {
  /** true si un email de confirmation a été envoyé (pas de session immédiate). */
  emailConfirmationRequired: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google", pending?: OAuthPending) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadUser(authUserId: string, email: string | undefined): Promise<User | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, bio, role, invite_code")
    .eq("id", authUserId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    avatar_url: data.avatar_url ?? undefined,
    bio: data.bio ?? undefined,
    email,
    role: (data.role as "aventurier" | "ami") ?? undefined,
    invite_code: data.invite_code ?? undefined,
  };
}

/**
 * Si le compte a une aventure ou un code d'invitation "en attente" (posés au
 * moment de l'inscription, avant la confirmation par email), on les applique
 * ici, à la première session authentifiée. Le flag est ensuite nettoyé pour
 * ne s'exécuter qu'une seule fois.
 */
async function applyPendingSpaceSetup(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown>;
  const adventureName =
    typeof meta.pending_adventure_name === "string" ? meta.pending_adventure_name : undefined;
  const inviteCode =
    typeof meta.pending_invite_code === "string" ? meta.pending_invite_code : undefined;
  if (!adventureName && !inviteCode) return;

  try {
    if (adventureName) {
      const { error } = await supabase.rpc("become_aventurier");
      if (error) throw error;
    } else if (inviteCode) {
      const { error } = await supabase.rpc("use_invite_code", { p_code: inviteCode });
      if (error) throw error;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("invalid_invite_code")) {
      toast.error("Le code d'invitation n'est plus valide.");
    } else if (!message.includes("already_member")) {
      toast.error("Impossible de finaliser la configuration de ton aventure.");
    }
  } finally {
    await supabase.auth.updateUser({
      data: { pending_adventure_name: null, pending_invite_code: null },
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session) await applyPendingSpaceSetup(session);
      const profile = session ? await loadUser(session.user.id, session.user.email) : null;
      if (!active) return;
      setUser(profile);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) await applyPendingSpaceSetup(session);
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

  const signUp = useCallback(async ({
    email,
    password,
    name,
    pendingAdventureName,
    pendingInviteCode,
  }: SignUpParams): Promise<SignUpResult> => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          ...(pendingAdventureName ? { pending_adventure_name: pendingAdventureName } : {}),
          ...(pendingInviteCode ? { pending_invite_code: pendingInviteCode } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return { emailConfirmationRequired: !signUpData.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (
    provider: "google",
    pending?: OAuthPending,
  ) => {
    if (pending?.pendingAdventureName || pending?.pendingInviteCode) {
      localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(pending));
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      localStorage.removeItem(OAUTH_PENDING_KEY);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const profile = session ? await loadUser(session.user.id, session.user.email) : null;
    setUser(profile);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, signUp, signIn, signInWithOAuth, signOut, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
