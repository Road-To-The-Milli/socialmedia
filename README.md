# Nous & Chill — Product Spec v2

> Un réseau social coopératif et gamifié pour vivre des aventures à plusieurs — et en garder une trace qui dure.

---

## Vision

Les réseaux sociaux existants sont construits pour l'individu : on poste pour soi, on accumule des likes, on performe. Nous & Chill fait le pari inverse — **la relation est le sujet, pas la personne**.

N'importe quel groupe peut créer un espace : un couple, des amis en vacances, une famille, un groupe de mariage, une coloc. Ensemble, ils documentent leurs aventures sous forme d'épisodes, rédigent chacun leur propre review en privé, et découvrent les retours des autres à la fin de la saison — le tout couronné par une vidéo souvenir générée automatiquement.

**Principe fondateur :** chaque membre vit l'expérience de son côté, mais c'est ensemble qu'on découvre ce qu'on a vraiment vécu.

---

## Concepts clés

### Espace (`space`)
L'unité centrale du produit. Un espace est une aventure partagée entre N personnes.

- Un utilisateur peut appartenir à plusieurs espaces (son couple ET un groupe d'amis)
- Chaque espace a son propre nom, sa propre cover, ses propres épisodes et sa propre saison
- Exemples : "Samuel & Mathilde S1", "Vacances Grèce 2026", "Mariage de Léa", "Tribu Barcelone"

### Membre (`member`)
Un utilisateur appartenant à un espace avec un rôle précis.

| Rôle | Accès |
|---|---|
| `owner` | Crée l'espace, invite des membres, gère les épisodes, peut fermer la saison |
| `member` | Poste des reviews, commente, vote sur les idées, propose des idées |
| `observer` | Lit le contenu public (épisodes, commentaires), réagit, mais ne rédige pas de review |

### Épisode (`episode`)
Un moment vécu par le groupe. Un épisode a un titre, une date, un lieu, une durée, des médias (photos/vidéos) et des tags.

Les médias d'un épisode alimentent la vidéo souvenir de fin de saison.

### Review (`review`)
La réponse personnelle de chaque membre à un épisode. Toujours privée pendant la saison — visible par tous uniquement après l'unlock.

Champs : note (1–5), moment préféré, moment gênant, citation drôle, résumé, referait ? (oui/non/peut-être), lien musique.

### Saison (`season`)
Une période avec un début et une fin. Quand la saison se termine (date atteinte ou unlock manuel par l'owner), toutes les reviews deviennent visibles et la vidéo souvenir est générée.

La mécanique de la saison crée le suspense et la récompense : personne ne sait ce que l'autre a écrit avant la révélation finale.

### Vidéo souvenir
Feature phare. À la fin de la saison, une vidéo est générée automatiquement à partir des photos et vidéos postées dans les épisodes. Format court (30–90 secondes), exportable, partageable.

---

## Architecture de données

### Schéma Supabase (v2)

```
profiles
  id         uuid PK → auth.users
  name       text
  avatar_url text
  created_at timestamptz

spaces
  id          uuid PK
  name        text
  description text
  cover_url   text
  created_by  uuid → profiles
  season_start date
  season_end   date
  season_unlocked boolean default false
  created_at  timestamptz

space_members
  space_id  uuid → spaces
  user_id   uuid → profiles
  role      text CHECK ('owner','member','observer')
  joined_at timestamptz
  PK (space_id, user_id)

invite_codes
  code       text PK
  space_id   uuid → spaces
  role       text CHECK ('member','observer')
  max_uses   int  (null = illimité)
  use_count  int  default 0
  expires_at timestamptz (null = pas d'expiration)
  created_by uuid → profiles

episodes
  id         uuid PK
  space_id   uuid → spaces
  number     int
  title      text
  date       date
  place      text
  duration   text
  tags       text[]
  cover_url  text
  notes      text
  music_url  text
  created_by uuid → profiles
  created_at timestamptz
  UNIQUE (space_id, number)

episode_media
  id          uuid PK
  episode_id  uuid → episodes
  space_id    uuid → spaces  (dénormalisé pour RLS)
  url         text
  filename    text
  type        text CHECK ('image','video','file')
  content_type text
  size        int8
  uploaded_by uuid → profiles
  created_at  timestamptz

episode_likes
  episode_id uuid → episodes
  user_id    uuid → profiles
  created_at timestamptz
  PK (episode_id, user_id)

reviews
  id               uuid PK
  episode_id       uuid → episodes
  space_id         uuid → spaces  (dénormalisé pour RLS)
  author_id        uuid → profiles
  author_name      text  (snapshot au moment de l'écriture)
  rating           int   CHECK (1..5)
  favorite_moment  text
  awkward_moment   text
  funny_quote      text
  summary          text
  would_redo       text  CHECK ('yes','no','maybe')
  song             text
  created_at       timestamptz
  updated_at       timestamptz
  UNIQUE (episode_id, author_id)

episode_comments
  id          uuid PK
  episode_id  uuid → episodes
  space_id    uuid → spaces
  author_id   uuid → profiles
  author_name text
  body        text
  created_at  timestamptz

comment_reactions
  comment_id uuid → episode_comments
  user_id    uuid → profiles
  emoji      text
  created_at timestamptz
  PK (comment_id, user_id, emoji)

ideas
  id          uuid PK
  space_id    uuid → spaces
  title       text
  description text
  proposed_by uuid → profiles
  status      text CHECK ('voting','selected','scheduled','done')
  created_at  timestamptz

idea_votes
  idea_id  uuid → ideas
  user_id  uuid → profiles
  kind     text CHECK ('like','dislike')
  voted_at timestamptz
  PK (idea_id, user_id)

vote_questions
  id       uuid PK
  space_id uuid → spaces
  question text
  options  jsonb
  active   boolean default true

vote_ballots
  question_id uuid → vote_questions
  voter_id    uuid → profiles
  voted_at    timestamptz
  PK (question_id, voter_id)

vote_results
  id          uuid PK
  question_id uuid → vote_questions
  option      text
  count       int default 0
  UNIQUE (question_id, option)

synthese
  id             uuid PK
  space_id       uuid → spaces
  body_md        text
  generated_at   timestamptz
  avg_rating     numeric
  best_episode_id uuid → episodes
  video_url      text  (URL de la vidéo souvenir générée)
```

### Règles de confidentialité (RLS)

**Reviews :** un membre voit toujours sa propre review. Il voit les reviews des autres uniquement si `spaces.season_unlocked = true` pour cet espace.

**Episodes / médias / commentaires / idées :** visibles par tous les membres de l'espace (owner + member + observer).

**Espaces :** un utilisateur ne voit que les espaces dont il est membre.

```sql
-- Exemple RLS reviews
create policy "reviews_select" on reviews
  for select to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1 from spaces s
      join space_members sm on sm.space_id = s.id
      where s.id = reviews.space_id
        and sm.user_id = auth.uid()
        and s.season_unlocked = true
    )
  );
```

---

## Parcours utilisateur

### 1. Créer un espace
1. S'inscrire / se connecter
2. "Créer un espace" → nom, description, dates de saison, cover
3. Obtenir un code d'invitation à partager au groupe

### 2. Rejoindre un espace
1. Recevoir un code d'invitation
2. S'inscrire avec le code → rôle attribué automatiquement (member ou observer)

### 3. Vivre la saison
- L'owner crée les épisodes (ou tous les members selon config)
- Chaque member upload des photos/vidéos dans l'épisode
- Chaque member rédige sa review en privé
- Le groupe commente, propose des idées, vote

### 4. Fin de saison
- La date arrive (ou l'owner débloque manuellement)
- Toutes les reviews deviennent visibles
- La vidéo souvenir est générée automatiquement
- La synthèse IA (bilan de saison) est produite

---

## Pages de l'application

```
/                          → Landing / liste des espaces de l'utilisateur
/auth/login                → Connexion
/auth/signup               → Inscription (avec ou sans code d'invitation)
/auth/callback             → Callback magic link (optionnel)

/spaces/new                → Créer un espace

/:spaceSlug/               → Dashboard de l'espace (épisodes en vedette)
/:spaceSlug/episodes       → Liste de tous les épisodes
/:spaceSlug/episodes/:id   → Détail d'un épisode (médias, reviews, commentaires)
/:spaceSlug/timeline       → Vue chronologique de la saison
/:spaceSlug/ideas          → Idées & votes du groupe
/:spaceSlug/season         → Bilan de saison (locked ou unlocked)
/:spaceSlug/members        → Liste des membres + gestion des invitations
/:spaceSlug/settings       → Paramètres de l'espace (owner only)

/profile                   → Profil utilisateur, liste de tous ses espaces
```

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + TypeScript |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| UI | Tailwind CSS + Radix UI (shadcn/ui) |
| Forms | React Hook Form + Zod |
| Backend / DB | Supabase (Postgres + RLS + Auth) |
| Storage | Supabase Storage (bucket `episode-media`) |
| Auth | Supabase Auth (email + password, magic link optionnel) |
| Vidéo souvenir | FFmpeg / Remotion (à décider à l'implémentation) |
| IA synthèse | Anthropic API (Claude Sonnet) |
| Hosting | Vercel |

---

## Roadmap

### Phase 1 — Multi-espaces (refacto structurelle)
- [ ] Nouveau schéma Supabase avec `spaces` et `space_members`
- [ ] Authentification propre (email + password, inscription avec/sans code)
- [ ] CRUD espaces : créer, modifier, inviter des membres
- [ ] Associer tous les épisodes/reviews/idées à un `space_id`
- [ ] RLS multi-espaces
- [ ] Page dashboard par espace
- [ ] Page liste des espaces de l'utilisateur

### Phase 2 — Expérience de groupe
- [ ] Upload médias par n'importe quel member (pas seulement owner)
- [ ] Observateurs : accès lecture seule sans review
- [ ] Notifications (nouveau épisode, review complète, fin de saison imminente)
- [ ] Gamification : streaks, badges, stats de participation

### Phase 3 — Révélation & vidéo souvenir
- [ ] Unlock de saison (automatique à la date ou manuel)
- [ ] Synthèse IA (bilan de saison en markdown via Claude)
- [ ] Vidéo souvenir auto-générée à partir des médias de la saison
- [ ] Export et partage de la vidéo

---

## Ce qui change par rapport à la v1

| v1 (couple uniquement) | v2 (multi-groupes) |
|---|---|
| Rôles hardcodés `aventurier` / `ami` | Rôles flexibles `owner` / `member` / `observer` |
| Un seul espace global | N espaces par utilisateur |
| Codes d'invitation fixes | Codes d'invitation par espace avec expiration |
| `settings` singleton global | `season_unlocked` par espace dans `spaces` |
| `synthese` table singleton | `synthese` liée à un `space_id` |
| Episodes sans `space_id` | Tout est scopé au `space_id` |
| Pas de vidéo | Vidéo souvenir = feature phare de fin de saison |

---

## Variables d'environnement

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
VITE_SEASON_END_DATE=2026-12-31   # défaut, peut être surchargé par espace
```

---

## Principes de développement

1. **Privacy by default** — les reviews restent privées jusqu'au unlock. Ne jamais exposer une review via un endpoint sans vérifier `season_unlocked`.
2. **Space-scoped everything** — chaque entité (episode, review, idea, vote) est toujours associée à un `space_id`. Aucune donnée globale sauf le profil utilisateur.
3. **RLS first** — les règles de confidentialité vivent dans la base de données (RLS Supabase), jamais uniquement côté frontend.
4. **Owners vs members** — un owner peut tout gérer dans son espace. Un member peut contribuer (review, média, idée, commentaire). Un observer ne peut que lire et réagir.
5. **La vidéo est le moment de vérité** — toutes les décisions d'architecture médias doivent faciliter la génération vidéo de fin de saison.
