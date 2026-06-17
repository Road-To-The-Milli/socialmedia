import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { OAuthButtons } from "@/components/OAuthButtons";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: SignupPage,
});

type Status = "idle" | "submitting" | "error" | "sent";

const inputClass =
  "w-full bg-input/50 border border-border rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function SignupPage() {
  const { user, signUp, signInWithOAuth } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav({ to: search.redirect || "/" });
  }, [user, nav, search.redirect]);

  const canSubmit = name.trim().length >= 2 && email.trim().length > 0 && password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setError(null);
    try {
      const { emailConfirmationRequired } = await signUp({ email, password, name });
      if (emailConfirmationRequired) {
        setStatus("sent");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Inscription impossible pour le moment.");
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
            Saison 1 - épisodes en cours
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 shadow-poster">
          {status === "sent" ? (
            <div className="text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <MailCheck className="size-6" />
              </span>
              <h2 className="text-xl font-bold mb-2">Confirme ton adresse email</h2>
              <p className="text-sm text-muted-foreground mb-1">
                On a envoyé un lien à <span className="text-foreground">{email}</span>.
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                Clique sur le lien (vérifie aussi tes spams), puis connecte-toi pour commencer.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all"
              >
                ← Retour
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-xl font-bold mb-1">Créer un compte</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Rejoins l'aventure en quelques secondes.
              </p>

              <input
                type="text"
                autoComplete="name"
                required
                placeholder="Prénom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                placeholder="Mot de passe (6 caractères min.)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />

              {status === "error" && error && (
                <p className="text-xs text-destructive mb-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === "submitting"}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 rounded-lg transition-all"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Création...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Déjà un compte ?{" "}
                <Link
                  to="/login"
                  search={{ redirect: search.redirect }}
                  className="text-primary hover:underline"
                >
                  Connecte-toi
                </Link>
              </p>

              <OAuthButtons onOAuth={(p) => signInWithOAuth(p)} />
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contenu réservé. Toute fuite entraîne une annulation immédiate de la saison.
        </p>
      </div>
    </div>
  );
}
