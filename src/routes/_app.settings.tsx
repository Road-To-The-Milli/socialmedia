import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BellOff, Copy, Link2, Loader2, Settings, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useActiveSpaceId } from "@/lib/space-context";
import { supabase } from "@/lib/supabase";
import { useCreateInviteCode, useSpaceInviteCodes, useUpdateProfile } from "@/lib/store";
import { usePush } from "@/hooks/use-push";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Paramètres · Nous & Chill" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const push = usePush();
  const spaceId = useActiveSpaceId();
  const inviteCodesQuery = useSpaceInviteCodes(spaceId || undefined);
  const createInviteCode = useCreateInviteCode(spaceId);

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateProfile.mutate(
      { name: trimmedName, bio, avatar_url: avatarUrl },
      {
        onSuccess: async () => {
          await refreshUser();
          toast.success("Profil mis à jour");
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Impossible de mettre à jour le profil."),
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 text-center animate-float-in">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-2 flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" /> Mon compte
        </p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Paramètres</h1>
        <p className="text-muted-foreground mt-3">Modifie tes informations de profil.</p>
      </div>

      <form
        onSubmit={submit}
        className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-poster"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="size-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Email
            </span>
            <p className="text-sm">{user.email}</p>
          </div>
        </div>

        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Nom affiché
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Photo de profil (URL)
          </span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="block mb-5">
          <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Bio
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quelques mots sur toi..."
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-input/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <button
          type="submit"
          disabled={!name.trim() || updateProfile.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
        >
          {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>



      <div className="mt-6 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-poster">
        <h2 className="text-base font-bold mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Reçois une notification push quand un épisode, un commentaire ou une idée est ajouté.
        </p>

        {push.state === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Ton navigateur ne supporte pas les notifications push.
          </p>
        )}

        {push.state === "denied" && (
          <p className="text-sm text-destructive">
            Les notifications sont bloquées dans ton navigateur. Autorise-les dans les paramètres du site.
          </p>
        )}

        {(push.state === "subscribed" || push.state === "unsubscribed") && (
          <button
            type="button"
            disabled={false}
            onClick={async () => {
              try {
                if (push.state === "subscribed") {
                  await push.unsubscribe();
                  toast.success("Notifications désactivées");
                } else {
                  await push.subscribe();
                  toast.success("Notifications activées !");
                }
              } catch {
                toast.error("Impossible de modifier les notifications.");
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
              push.state === "subscribed"
                ? "bg-secondary hover:bg-secondary/80 text-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            {push.state === "subscribed" ? (
              <><BellOff className="size-4" /> Désactiver les notifications</>
            ) : (
              <><Bell className="size-4" /> Activer les notifications</>
            )}
          </button>
        )}

        {push.state === "loading" && (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {spaceId && (
        <div className="mt-6 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-poster">
          <h2 className="text-base font-bold mb-1">Code d'invitation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Partage ce code pour inviter quelqu'un à rejoindre ce space. Il fonctionne aussi à
            l'inscription.
          </p>

          {/* Code actif (dernier généré) */}
          {inviteCodesQuery.data && inviteCodesQuery.data.length > 0 ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-input/50 border border-border rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-[0.2em] text-primary select-all">
                {inviteCodesQuery.data[0].code}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteCodesQuery.data![0].code);
                  toast.success("Code copié !");
                }}
                className="shrink-0 inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 px-4 py-3 rounded-lg text-sm font-semibold transition"
              >
                <Copy className="size-4" /> Copier
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4 italic">
              Aucun code généré pour ce space.
            </p>
          )}

          <button
            type="button"
            disabled={createInviteCode.isPending}
            onClick={() =>
              createInviteCode.mutate(
                { role: "member" },
                {
                  onSuccess: async (newCode) => {
                    // Synchronise profiles.invite_code avec le nouveau code du space
                    await supabase
                      .from("profiles")
                      .update({ invite_code: newCode.code })
                      .eq("id", user.id);
                    await refreshUser();
                    toast.success("Nouveau code généré !");
                  },
                },
              )
            }
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-semibold transition disabled:opacity-40"
          >
            {createInviteCode.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Link2 className="size-4" />
            )}
            {inviteCodesQuery.data?.length ? "Générer un nouveau code" : "Générer un code"}
          </button>
        </div>
      )}
    </div>
  );
}
