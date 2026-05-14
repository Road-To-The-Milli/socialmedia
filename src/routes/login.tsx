 import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: LoginPage,
});

type Status = "idle" | "submitting" | "error";

function LoginPage() {
  const { user, loginWithCode } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav({ to: search.redirect || "/" });
  }, [user, nav, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setStatus("submitting");
    setError(null);
    try {
      await loginWithCode(cleanCode);
      nav({ to: search.redirect || "/" });
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        const detail = err.code ? ` (${err.code})` : "";
        setError(`${err.message}${detail}`);
        return;
      }
      setError("Impossible de vérifier le code pour le moment.");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1920&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />

      <div className="relative w-full max-w-md animate-float-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Clapperboard className="w-7 h-7 text-primary" />
            <span className="text-4xl font-black tracking-tighter text-gradient-red">
              NOUS &amp; CHILL
            </span>
          </div>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.3em]">
            Saison 1 - episodes en cours
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 shadow-poster">
          <form onSubmit={submit}>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </span>
              <h2 className="text-xl font-bold">Qui regarde ?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Entre le code secret de ton groupe pour ouvrir la saison.
            </p>
            <input
              type="password"
              inputMode="text"
              autoComplete="one-time-code"
              required
              placeholder="Code secret"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {status === "error" && error && (
              <p className="text-xs text-destructive mb-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={!code.trim() || status === "submitting"}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 rounded-lg transition-all"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Vérification...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Entrer
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contenu réservé. Toute fuite entraîne une annulation immédiate de la saison.
        </p>
      </div>
    </div>
  );
}
