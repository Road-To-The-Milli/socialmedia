import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  Copy,
  Link2,
  Loader2,
  MapPin,
  Music,
  NotebookPen,
  Plus,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveSpace } from "@/lib/space-context";
import {
  useCreateInviteCode,
  useDeleteSpace,
  useEpisodes,
  useRemoveSpaceMember,
  useSetMemberEpisodePermission,
  useSpace,
  useSpaceInviteCodes,
  useSpaceMembers,
} from "@/lib/store";

export const Route = createFileRoute("/_app/adventure/$spaceId")({
  head: () => ({ meta: [{ title: "Aventure · Nous & Chill" }] }),
  component: AdventureDetail,
});

function AdventureDetail() {
  const { spaceId } = Route.useParams();
  const navigate = useNavigate();
  const { setActiveSpaceId } = useActiveSpace();

  const spaceQuery = useSpace(spaceId);
  const episodesQuery = useEpisodes(spaceId);
  const membersQuery = useSpaceMembers(spaceId);
  const setMemberEpisodePermission = useSetMemberEpisodePermission(spaceId);
  const removeMember = useRemoveSpaceMember(spaceId);
  const deleteSpace = useDeleteSpace();
  const inviteCodesQuery = useSpaceInviteCodes(spaceId);
  const createInviteCode = useCreateInviteCode(spaceId);

  if (spaceQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!spaceQuery.data) throw notFound();

  const space = spaceQuery.data;
  const isOwner = space.my_role === "owner";
  const canCreateEpisode = isOwner || Boolean(space.my_can_create_episodes);
  const episodes = [...(episodesQuery.data ?? [])].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Retour
      </Link>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="size-20 shrink-0 rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
          {space.cover_url ? (
            <img src={space.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🎬</span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">{space.name}</h1>
          {space.description && (
            <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {space.member_count ?? 1} membre{(space.member_count ?? 1) > 1 ? "s" : ""}
          </p>
        </div>
        {canCreateEpisode && (
          <Link
            to="/timeline"
            onClick={() => setActiveSpaceId(spaceId)}
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90"
          >
            <Plus className="size-4" /> Ajouter un épisode
          </Link>
        )}
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Épisodes</h2>
        {episodesQuery.isLoading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun épisode pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                to="/episode/$episodeId"
                params={{ episodeId: ep.id }}
                onClick={() => setActiveSpaceId(spaceId)}
                className="block bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition group shadow-poster"
              >
                <div className="flex flex-col sm:flex-row">
                  {ep.cover_url && (
                    <div className="sm:w-40 aspect-video sm:aspect-auto relative shrink-0">
                      <img
                        src={ep.cover_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary tracking-widest">
                        E{String(ep.number).padStart(2, "0")}
                      </span>
                      {ep.duration && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {ep.duration}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold group-hover:text-primary transition">
                      {ep.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(ep.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {ep.place}
                      </span>
                    </div>
                    {ep.notes && (
                      <p className="mt-2 flex gap-2 line-clamp-2 text-sm text-muted-foreground">
                        <NotebookPen className="mt-0.5 size-4 shrink-0" />
                        <span>{ep.notes}</span>
                      </p>
                    )}
                    {ep.music_url && (
                      <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        <Music className="size-3.5" />
                        Musique ajoutée
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {isOwner && (
        <section className="mb-6 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-poster">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            <Link2 className="size-4" /> Code d'invitation
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Partage ce code pour inviter quelqu'un à rejoindre uniquement "{space.name}".
          </p>

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
              Aucun code généré pour cette aventure.
            </p>
          )}

          <button
            type="button"
            disabled={createInviteCode.isPending}
            onClick={() =>
              createInviteCode.mutate(
                { role: "member" },
                {
                  onSuccess: () => toast.success("Nouveau code généré !"),
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Action impossible."),
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
        </section>
      )}

      {isOwner && (
        <section className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-poster">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            <Users className="size-4" /> Membres de l'aventure
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Promeus un membre pour qu'il puisse ajouter des épisodes, ou retire-le de
            l'aventure.
          </p>

          {membersQuery.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <ul className="space-y-2">
              {(membersQuery.data ?? [])
                .filter((m) => m.role !== "owner")
                .map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
                  >
                    <div className="size-9 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {member.profile?.name ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role === "observer" ? "Spectateur" : "Membre"}
                        {member.can_create_episodes && " · Peut ajouter des épisodes"}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {member.role === "member" && (
                        <button
                          type="button"
                          title={member.can_create_episodes ? "Rétrograder" : "Promouvoir"}
                          aria-label={member.can_create_episodes ? "Rétrograder" : "Promouvoir"}
                          disabled={setMemberEpisodePermission.isPending}
                          onClick={() =>
                            setMemberEpisodePermission.mutate(
                              {
                                userId: member.user_id,
                                canCreate: !member.can_create_episodes,
                              },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    member.can_create_episodes
                                      ? "Permission retirée"
                                      : "Membre promu : il peut maintenant ajouter des épisodes",
                                  ),
                                onError: (err) =>
                                  toast.error(
                                    err instanceof Error ? err.message : "Action impossible.",
                                  ),
                              },
                            )
                          }
                          className={`inline-flex size-9 sm:w-auto sm:h-auto items-center justify-center gap-1.5 rounded-full sm:rounded-md sm:px-3 sm:py-1.5 transition disabled:opacity-40 ${
                            member.can_create_episodes
                              ? "bg-secondary hover:bg-secondary/80 text-foreground"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          }`}
                        >
                          {member.can_create_episodes ? (
                            <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUp className="size-4" />
                          )}
                          <span className="hidden sm:inline text-xs font-semibold">
                            {member.can_create_episodes ? "Rétrograder" : "Promouvoir"}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        title="Retirer"
                        aria-label="Retirer"
                        disabled={removeMember.isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Retirer ${member.profile?.name ?? "ce membre"} de l'aventure ?`,
                            )
                          )
                            return;
                          removeMember.mutate(member.user_id, {
                            onSuccess: () => toast.success("Membre retiré de l'aventure"),
                            onError: (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Action impossible.",
                              ),
                          });
                        }}
                        className="inline-flex size-9 sm:w-auto sm:h-auto items-center justify-center gap-1.5 rounded-full sm:rounded-md sm:px-3 sm:py-1.5 border-2 sm:border border-destructive text-destructive hover:bg-destructive/10 transition disabled:opacity-40"
                      >
                        <X className="size-4" />
                        <span className="hidden sm:inline text-xs font-semibold">Retirer</span>
                      </button>
                    </div>
                  </li>
                ))}
              {(membersQuery.data ?? []).filter((m) => m.role !== "owner").length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Personne ne suit encore cette aventure.
                </p>
              )}
            </ul>
          )}
        </section>
      )}

      {isOwner && (
        <section className="mt-6 bg-card border border-destructive/30 rounded-xl p-5 sm:p-6 shadow-poster">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" /> Supprimer l'aventure
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cette action est définitive : tous les épisodes, idées et membres de cette aventure
            seront supprimés.
          </p>
          <button
            type="button"
            disabled={deleteSpace.isPending}
            onClick={() => {
              if (
                !window.confirm(
                  `Supprimer définitivement l'aventure "${space.name}" ? Cette action est irréversible.`,
                )
              )
                return;
              deleteSpace.mutate(spaceId, {
                onSuccess: () => {
                  toast.success("Aventure supprimée");
                  void navigate({ to: "/" });
                },
                onError: (err) =>
                  toast.error(err instanceof Error ? err.message : "Action impossible."),
              });
            }}
            className="inline-flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
          >
            {deleteSpace.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Supprimer l'aventure
          </button>
        </section>
      )}
    </div>
  );
}
