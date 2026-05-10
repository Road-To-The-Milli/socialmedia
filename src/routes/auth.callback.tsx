import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const { token, redirect } = Route.useSearch();
  const { verifyMagicLink } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide ou incomplet.");
      return;
    }
    let cancelled = false;
    void verifyMagicLink(token)
      .then(() => {
        if (!cancelled) nav({ to: redirect || "/" });
      })
      .catch(() => {
        if (!cancelled) setError("Ce lien a expiré ou a déjà été utilisé.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, redirect, verifyMagicLink, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center gap-2 mb-6">
          <Clapperboard className="w-7 h-7 text-primary" />
          <span className="text-3xl font-black tracking-tighter text-gradient-red">
            NOUS &amp; CHILL
          </span>
        </div>
        {error ? (
          <>
            <h1 className="text-xl font-bold mb-2">Lien périmé</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => nav({ to: "/login", search: { redirect: "/" } })}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold"
            >
              Demander un nouveau lien
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Vérification du lien…</p>
          </>
        )}
      </div>
    </div>
  );
}
