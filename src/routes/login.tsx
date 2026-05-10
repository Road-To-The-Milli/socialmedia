import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: LoginPage,
});

type Status = "idle" | "submitting" | "sent" | "error";

function LoginPage() {
  const { user, requestMagicLink } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav({ to: search.redirect || "/" });
  }, [user, nav, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      await requestMagicLink(email.trim().toLowerCase());
      setStatus("sent");
    } catch {
      setStatus("error");
      setError(
        "Impossible d'envoyer le lien pour le moment. Réessaie dans quelques secondes.",
      );
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
            Saison 1 · épisodes en cours
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 shadow-poster">
          {status === "sent" ? (
            <div className="text-center py-2">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold mb-1">📬 Vérifie tes mails</h2>
              <p className="text-sm text-muted-foreground mb-4">
                On t'a envoyé un lien magique sur <strong>{email}</strong>. Clique dessus
                pour ouvrir la saison. Le lien expire dans 15 min.
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Mauvaise adresse ? Recommencer
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-xl font-bold mb-1">Qui regarde ?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Renseigne ton email pour recevoir un lien magique. Pas de mot de passe, on
                se fait confiance.
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {status === "error" && error && (
                <p className="text-xs text-destructive mb-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={!email.trim() || status === "submitting"}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 rounded-lg transition-all"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
                  </>
                ) : (
                  <>📬 Recevoir mon lien</>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          ⚠ Contenu réservé. Toute fuite entraîne une annulation immédiate de la saison.
        </p>
      </div>
    </div>
  );
}
