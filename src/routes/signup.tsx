import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clapperboard, Compass, KeyRound, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: SignupPage,
});

type View = "choice" | "create" | "join";
type Status = "idle" | "submitting" | "error" | "sent";

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("invalid_invite_code")) return "Code d'invitation invalide ou expiré.";
  if (message.includes("already_member")) return "Tu es déjà membre de cette aventure.";
  return message || "Inscription impossible pour le moment.";
}

function SignupPage() {
  const { user, signUp } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [view, setView] = useState<View>("choice");

  useEffect(() => {
    if (user) nav({ to: search.redirect || "/" });
  }, [user, nav, search.redirect]);

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
          {view === "choice" && <ChoiceView onPick={setView} search={search} />}
          {view === "create" && <CreateForm onBack={() => setView("choice")} signUp={signUp} />}
          {view === "join" && <JoinForm onBack={() => setView("choice")} signUp={signUp} />}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contenu réservé. Toute fuite entraîne une annulation immédiate de la saison.
        </p>
      </div>
    </div>
  );
}

function ChoiceView({
  onPick,
  search,
}: {
  onPick: (view: "create" | "join") => void;
  search: { redirect: string };
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-center">Comment veux-tu commencer ?</h2>
      <p className="text-sm text-muted-foreground mb-5 text-center">
        Choisis ton parcours d'inscription.
      </p>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onPick("create")}
          className="flex items-center gap-3 rounded-xl border border-border bg-input/30 p-4 text-left transition-all hover:border-primary hover:bg-primary/10"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="size-5" />
          </span>
          <span>
            <span className="block font-bold">Créer une nouvelle aventure</span>
            <span className="block text-xs text-muted-foreground">
              Tu fondes l'aventure et invites tes amis à te suivre.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("join")}
          className="flex items-center gap-3 rounded-xl border border-border bg-input/30 p-4 text-left transition-all hover:border-primary hover:bg-primary/10"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </span>
          <span>
            <span className="block font-bold">Rejoindre une aventure</span>
            <span className="block text-xs text-muted-foreground">
              Tu as reçu un code d'invitation d'un ami.
            </span>
          </span>
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-5">
        Déjà un compte ?{" "}
        <Link
          to="/login"
          search={{ redirect: search.redirect }}
          className="text-primary hover:underline"
        >
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}

function FormShell({
  icon,
  title,
  subtitle,
  onBack,
  onSubmit,
  submitLabel,
  submittingLabel,
  canSubmit,
  status,
  error,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  submittingLabel: string;
  canSubmit: boolean;
  status: Status;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>

      {children}

      {status === "error" && error && <p className="text-xs text-destructive mb-3">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || status === "submitting"}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 rounded-lg transition-all"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> {submittingLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4"
      >
        ← Retour
      </button>
    </form>
  );
}

const inputClass =
  "w-full bg-input/50 border border-border rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function SentView({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <MailCheck className="size-6" />
      </span>
      <h2 className="text-xl font-bold mb-2">Confirme ton adresse email</h2>
      <p className="text-sm text-muted-foreground mb-1">
        On a envoyé un lien de confirmation à <span className="text-foreground">{email}</span>.
      </p>
      <p className="text-sm text-muted-foreground mb-5">
        Clique sur ce lien (vérifie aussi tes spams), puis connecte-toi pour rejoindre ton
        aventure.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all"
      >
        ← Retour
      </button>
    </div>
  );
}

function CreateForm({
  onBack,
  signUp,
}: {
  onBack: () => void;
  signUp: ReturnType<typeof useAuth>["signUp"];
}) {
  const [name, setName] = useState("");
  const [adventureName, setAdventureName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length >= 2 &&
    adventureName.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setError(null);
    try {
      const { emailConfirmationRequired } = await signUp({
        email,
        password,
        name,
        pendingAdventureName: adventureName.trim(),
      });
      if (emailConfirmationRequired) {
        setStatus("sent");
        return;
      }
      const { error: spaceError } = await supabase.rpc("become_aventurier");
      if (spaceError) throw spaceError;
    } catch (err) {
      setStatus("error");
      setError(errorMessage(err));
    }
  };

  if (status === "sent") {
    return <SentView email={email} onBack={onBack} />;
  }

  return (
    <FormShell
      icon={<Compass className="size-5" />}
      title="Créer mon compte"
      subtitle="Crée ton compte et donne un nom à votre aventure. Tu pourras inviter tes amis ensuite."
      onBack={onBack}
      onSubmit={submit}
      submitLabel="Créer mon compte"
      submittingLabel="Création..."
      canSubmit={canSubmit}
      status={status}
      error={error}
    >
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
        type="text"
        autoComplete="off"
        required
        placeholder="Nom de l'aventure (ex: Nous deux)"
        value={adventureName}
        onChange={(e) => setAdventureName(e.target.value)}
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
    </FormShell>
  );
}

function JoinForm({
  onBack,
  signUp,
}: {
  onBack: () => void;
  signUp: ReturnType<typeof useAuth>["signUp"];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    inviteCode.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setError(null);
    try {
      const { emailConfirmationRequired } = await signUp({
        email,
        password,
        name,
        pendingInviteCode: inviteCode.trim(),
      });
      if (emailConfirmationRequired) {
        setStatus("sent");
        return;
      }
      const { error: joinError } = await supabase.rpc("use_invite_code", { p_code: inviteCode.trim() });
      if (joinError) throw joinError;
    } catch (err) {
      setStatus("error");
      setError(errorMessage(err));
    }
  };

  if (status === "sent") {
    return <SentView email={email} onBack={onBack} />;
  }

  return (
    <FormShell
      icon={<KeyRound className="size-5" />}
      title="Rejoindre l'aventure"
      subtitle="Crée ton compte et entre le code d'invitation reçu pour rejoindre l'aventure."
      onBack={onBack}
      onSubmit={submit}
      submitLabel="Rejoindre cette aventure"
      submittingLabel="Inscription..."
      canSubmit={canSubmit}
      status={status}
      error={error}
    >
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
      <input
        type="text"
        autoComplete="off"
        required
        placeholder="Code d'invitation"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        className={inputClass}
      />
    </FormShell>
  );
}
