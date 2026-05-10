import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Sparkles, TrendingUp, Heart, Star } from "lucide-react";

export const Route = createFileRoute("/_app/synthese")({
  head: () => ({ meta: [{ title: "Synthèse IA · Nous & Chill" }] }),
  component: SynthesePage,
});

function SynthesePage() {
  const { episodes, ideas } = useStore();

  const allRatings = episodes.flatMap((e) =>
    [e.reviews.samuel?.rating, e.reviews.mathilde?.rating].filter((n): n is number => typeof n === "number"),
  );
  const avg = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : "—";
  const best = [...episodes].sort((a, b) => {
    const av = (a.reviews.samuel?.rating || 0) + (a.reviews.mathilde?.rating || 0);
    const bv = (b.reviews.samuel?.rating || 0) + (b.reviews.mathilde?.rating || 0);
    return bv - av;
  })[0];
  const totalLikes = ideas.reduce((s, i) => s + i.likes.length, 0);

  const verdict = computeVerdict(Number(avg), episodes.length);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 text-center animate-float-in">
        <Sparkles className="w-10 h-10 text-accent mx-auto mb-3" />
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">🤖 Bilan généré par une IA</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Le récap de fin de saison</h1>
        <p className="text-muted-foreground mt-3">
          Analyse 100% subjective et 0% scientifique de votre histoire.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Star className="w-4 h-4" />} label="Note moyenne" value={`${avg}/5`} />
        <Stat icon={<TrendingUp className="w-4 h-4" />} label="Épisodes" value={String(episodes.length)} />
        <Stat icon={<Heart className="w-4 h-4" />} label="Likes idées" value={String(totalLikes)} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-poster space-y-5">
        <Section title="📝 Le pitch officiel">
          <p>
            Une fiction privée en {episodes.length} épisode{episodes.length > 1 ? "s" : ""}. Lieux travaillés,
            casting réduit, dialogues parfois maladroits mais toujours sincères. Note moyenne du jury intime :{" "}
            <strong>{avg}/5</strong>.
          </p>
        </Section>

        {best && (
          <Section title="🏆 L'épisode marquant">
            <p>
              <strong>« {best.title} »</strong> rafle la palme du moment fort. Pas pour le scénario — pour la chimie.
              Les critiques sont unanimes : « bordélique mais touchant ».
            </p>
          </Section>
        )}

        <Section title="🎭 La dynamique du couple">
          <p>{verdict.dynamic}</p>
        </Section>

        <Section title="🔮 Pronostic saison 2">
          <p>{verdict.prediction}</p>
        </Section>

        <Section title="🎬 Recommandation du critique">
          <blockquote className="border-l-4 border-primary pl-4 italic text-foreground/90">
            « {verdict.quote} » <br />
            <span className="text-xs text-muted-foreground not-italic">— Le Tableau de Bord, IA bienveillante</span>
          </blockquote>
        </Section>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        💡 Brancher GPT/Claude ici plus tard pour générer un vrai bilan unique.
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className="flex justify-center text-accent mb-1">{icon}</div>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold mb-1.5">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function computeVerdict(avg: number, count: number) {
  if (count < 2) {
    return {
      dynamic: "Trop tôt pour conclure. Les producteurs attendent au moins un cliffhanger.",
      prediction: "Saison 2 sous réserve d'un développement narratif plus consistant.",
      quote: "Un pilote prometteur. La suite dira si c'est une comédie ou un drame existentiel.",
    };
  }
  if (avg >= 4.2) {
    return {
      dynamic: "Alchimie évidente. Les répliques fusent, les regards parlent, les amis sont jaloux.",
      prediction: "Renouvellement assuré. Les fans (vous deux) en redemandent.",
      quote: "Une romcom indé qui mériterait un Oscar du meilleur scénario non-écrit.",
    };
  }
  if (avg >= 3) {
    return {
      dynamic: "Belle alchimie avec quelques moments d'incertitude — ce qui rend la série crédible.",
      prediction: "Renouvelée pour une saison 2 sous réserve de plus d'épisodes en extérieur.",
      quote: "Pas parfait. Vrai. Et c'est largement mieux.",
    };
  }
  return {
    dynamic: "Tensions intéressantes. Le public reste accroché par pure curiosité morbide.",
    prediction: "Saison 2 envisagée comme un spin-off plus expérimental.",
    quote: "Un objet télé non identifié. À découvrir au moins une fois.",
  };
}