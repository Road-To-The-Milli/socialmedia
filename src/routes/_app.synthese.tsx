import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { useSynthese } from "@/lib/store";

export const Route = createFileRoute("/_app/synthese")({
  head: () => ({ meta: [{ title: "Synthèse IA · Nous & Chill" }] }),
  component: SynthesePage,
});

function SynthesePage() {
  const { data, isLoading } = useSynthese();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 text-center animate-float-in">
        <Sparkles className="w-10 h-10 text-accent mx-auto mb-3" />
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">
          🤖 Bilan généré par une IA
        </p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">
          Le récap de fin de saison
        </h1>
        <p className="text-muted-foreground mt-3">
          Analyse 100% subjective et 0% scientifique de votre histoire.
        </p>
      </div>

      {!data?.season_unlocked ? (
        <LockedSynthese />
      ) : (
        <article className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-poster">
          {data.body_md ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {data.body_md}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              La synthèse n'a pas encore été générée. L'IA est en train d'écrire son verdict.
            </p>
          )}
          {data.generated_at && (
            <p className="text-xs text-muted-foreground mt-6">
              Généré le{" "}
              {new Date(data.generated_at).toLocaleString("fr-FR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          )}
        </article>
      )}
    </div>
  );
}

function LockedSynthese() {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
      <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">🔒 Verrouillé jusqu'à la fin de saison</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        La synthèse IA sera générée dès que la saison se termine. Vous y trouverez le pitch
        officiel, l'épisode marquant, la dynamique du couple et un pronostic saison 2.
      </p>
    </div>
  );
}
