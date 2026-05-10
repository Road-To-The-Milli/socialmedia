import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Vote, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_app/vote")({
  head: () => ({ meta: [{ title: "Vote final · Nous & Chill" }] }),
  component: VotePage,
});

function VotePage() {
  const { votes, castAbsurdVote } = useStore();
  const [voted, setVoted] = useState<Record<string, string>>({});

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 text-center animate-float-in">
        <Trophy className="w-10 h-10 text-accent mx-auto mb-3" />
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2">🎟 Vote anonyme</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Le verdict du jury</h1>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Après 1 mois et demi de tournage, le public tranche. Aucune option n'est sérieuse. Toutes comptent.
        </p>
      </div>

      <div className="space-y-6">
        {votes.map((q, i) => {
          const total = Object.values(q.votes).reduce((a, b) => a + b, 0);
          const userChoice = voted[q.id];
          return (
            <div
              key={q.id}
              className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-poster animate-float-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">❓</span>
                <h2 className="text-lg sm:text-xl font-bold leading-snug">{q.question}</h2>
              </div>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const count = q.votes[opt] || 0;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const isMine = userChoice === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (userChoice) return;
                        castAbsurdVote(q.id, opt);
                        setVoted((v) => ({ ...v, [q.id]: opt }));
                        toast.success("Vote enregistré (anonymement, promis)");
                      }}
                      disabled={!!userChoice}
                      className={`relative w-full text-left p-3 rounded-lg border overflow-hidden transition ${
                        isMine ? "border-primary" : userChoice ? "border-border opacity-70" : "border-border hover:border-primary"
                      }`}
                    >
                      {userChoice && (
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/20 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <span className="text-sm font-medium">{opt}</span>
                        {userChoice && (
                          <span className="text-xs font-bold tabular-nums">
                            {pct}% · {count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!userChoice && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Vote className="w-3 h-3" /> Choisis ta vérité.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}