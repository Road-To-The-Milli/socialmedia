import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ROLES, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { Clapperboard } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");

  const submit = () => {
    if (!role) return;
    login(role, name);
    nav({ to: search.redirect || "/" });
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
            <span className="text-4xl font-black tracking-tighter text-gradient-red">NOUS & CHILL</span>
          </div>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.3em]">
            Saison 1 · épisodes en cours
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 shadow-poster">
          <h2 className="text-xl font-bold mb-1">Qui regarde ?</h2>
          <p className="text-sm text-muted-foreground mb-5">Choisis ton profil. Pas de mot de passe, on se fait confiance.</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => setRole(r.role)}
                className={`group relative aspect-square rounded-xl bg-gradient-to-br ${r.color} p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                  role === r.role ? "ring-4 ring-primary scale-105" : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
              >
                <span className="text-4xl">{r.emoji}</span>
                <span className="text-xs font-semibold text-center leading-tight">{r.name}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Ton prénom (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-input/50 border border-border rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            onClick={submit}
            disabled={!role}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 rounded-lg transition-all"
          >
            ▶ Lancer la lecture
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          ⚠ Contenu réservé. Toute fuite entraîne une annulation immédiate de la saison.
        </p>
      </div>
    </div>
  );
}