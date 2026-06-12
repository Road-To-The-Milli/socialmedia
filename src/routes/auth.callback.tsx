import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const nav = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    let active = true;

    // `detectSessionInUrl` (enabled by default) parses the confirmation
    // link's hash/code and stores the session — we just need to wait for it.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
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
