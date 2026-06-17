import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OAUTH_PENDING_KEY, type OAuthPending } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: AuthCallbackPage,
});

async function applyOAuthPending() {
  const raw = localStorage.getItem(OAUTH_PENDING_KEY);
  if (!raw) return;
  try {
    const pending = JSON.parse(raw) as OAuthPending;
    if (pending.pendingAdventureName) {
      await supabase.rpc("become_aventurier");
    } else if (pending.pendingInviteCode) {
      await supabase.rpc("use_invite_code", { p_code: pending.pendingInviteCode });
    }
  } catch {
    // silently ignore — user can retry setup
  } finally {
    localStorage.removeItem(OAUTH_PENDING_KEY);
  }
}

function AuthCallbackPage() {
  const nav = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session) {
        await applyOAuthPending();
        nav({ to: search.redirect || "/" });
      } else {
        nav({ to: "/login", search: { redirect: search.redirect || "/" } });
      }
    });

    return () => {
      active = false;
    };
  }, [nav, search.redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="size-5 animate-spin" />
      Connexion en cours...
    </div>
  );
}
