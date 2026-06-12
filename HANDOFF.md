# Nous & Chill — Handoff Backend

> ⚠️ **Obsolète** : ce document décrit l'ancien backend n8n + Airtable et le
> login par code secret. L'app utilise désormais **Supabase** (DB, Auth
> email/mot de passe, Storage) — voir `supabase/migrations/0001_init.sql` et
> `src/lib/{supabase,auth,store}.ts*`. Conservé pour archive uniquement.

Document à passer à Claude Code (ou à toi-même) pour câbler le frontend
React/Lovable existant à un backend Airtable + n8n.

But : transformer le prototype en plateforme privée fonctionnelle, sans
serveur custom, avec authentification par magic link et règles de
confidentialité strictes (le couple ne voit pas mutuellement ses comptes
rendus pendant la saison).

---

## 0. Variables d'environnement

À ajouter dans `.env` côté frontend :

```
VITE_N8N_BASE_URL=https://n8n.tondomaine.com/webhook
VITE_N8N_API_KEY=<long-secret-partagé-front-n8n>
VITE_SEASON_END_DATE=2025-06-30
```

Côté n8n (variables d'environnement de l'instance) :

```
AIRTABLE_PAT=<personal-access-token-scoped>
AIRTABLE_BASE_ID=appXXXXXXXXXXXX
RESEND_API_KEY=<resend-ou-brevo>
APP_BASE_URL=https://tondomaine.com
SHARED_API_KEY=<même-valeur-que-VITE_N8N_API_KEY>
SEASON_END_DATE=2025-06-30
ANTHROPIC_API_KEY=<pour-la-synthèse-IA>
```

Tous les webhooks n8n doivent vérifier `headers['x-api-key'] === SHARED_API_KEY`
en première étape, sinon retourner `401`.

---

## 1. Schéma Airtable

Base : `Nous & Chill` (`appXXXXXXXXXXXX`)

### Table `Users`

| Champ                | Type                  | Notes                                                   |
| -------------------- | --------------------- | ------------------------------------------------------- |
| `id`                 | Auto-number / formula | Clé primaire textuelle ex. `usr_001`                    |
| `email`              | Email                 | unique                                                  |
| `name`               | Single line           |                                                         |
| `role`               | Single select         | `samuel` · `mathilde` · `amis_samuel` · `amis_mathilde` |
| `magic_token`        | Single line           | uuid v4, écrit à chaque demande de magic link           |
| `token_expires_at`   | DateTime              | now + 15 min                                            |
| `session_token`      | Single line           | uuid v4, écrit après vérification (30 j)                |
| `session_expires_at` | DateTime              | now + 30 j                                              |
| `created_at`         | DateTime              | auto                                                    |

Seed initial : 2 lignes (`samuel`, `mathilde`) + N lignes amis avec
les rôles `amis_samuel` / `amis_mathilde`.

### Table `Episodes`

| Champ        | Type         | Notes                            |
| ------------ | ------------ | -------------------------------- |
| `id`         | Formula      | ex. `ep_01`                      |
| `number`     | Number       | unique, 1..N                     |
| `title`      | Single line  |                                  |
| `date`       | Date         |                                  |
| `place`      | Single line  |                                  |
| `duration`   | Single line  | ex. `2h47`                       |
| `tags`       | Multi select | Slow burn, Cliffhanger, Awkward… |
| `cover_url`  | URL          |                                  |
| `created_at` | DateTime     | auto                             |

### Table `Reviews`

| Champ             | Type                   | Notes                                      |
| ----------------- | ---------------------- | ------------------------------------------ |
| `id`              | Formula                |                                            |
| `episode`         | Link → Episodes        |                                            |
| `author`          | Link → Users           |                                            |
| `author_role`     | Lookup (`author.role`) | **Champ critique pour la confidentialité** |
| `rating`          | Number (1..5)          |                                            |
| `favorite_moment` | Long text              |                                            |
| `awkward_moment`  | Long text              |                                            |
| `funny_quote`     | Long text              |                                            |
| `summary`         | Long text              |                                            |
| `would_redo`      | Single select          | `yes` · `no` · `maybe`                     |
| `song`            | URL                    | Spotify / YouTube                          |
| `created_at`      | DateTime               | auto                                       |
| `updated_at`      | DateTime               | onChange                                   |

Index conseillé : un seul review par couple `(episode, author)`. n8n upsert
par recherche `episode = X AND author = Y`.

### Table `Ideas`

| Champ         | Type               | Notes                                        |
| ------------- | ------------------ | -------------------------------------------- |
| `id`          | Formula            |                                              |
| `title`       | Single line        |                                              |
| `description` | Long text          |                                              |
| `proposed_by` | Link → Users       |                                              |
| `status`      | Single select      | `voting` · `selected` · `scheduled` · `done` |
| `likes`       | Multi-link → Users |                                              |
| `dislikes`    | Multi-link → Users |                                              |
| `created_at`  | DateTime           | auto                                         |

### Table `VoteQuestions`

| Champ      | Type             | Notes                     |
| ---------- | ---------------- | ------------------------- |
| `id`       | Formula          |                           |
| `question` | Long text        |                           |
| `options`  | Long text (JSON) | ex. `["E01","E02","E04"]` |
| `active`   | Checkbox         |                           |

### Table `VoteResults`

Une ligne **par option par question** — on n'enregistre **jamais** qui a voté.
n8n incrémente juste un compteur.

| Champ      | Type                 | Notes              |
| ---------- | -------------------- | ------------------ |
| `id`       | Formula              |                    |
| `question` | Link → VoteQuestions |                    |
| `option`   | Single line          |                    |
| `count`    | Number               | incrémenté par n8n |

### Table `Synthese`

Une seule ligne, écrite quand `season_unlocked = true`.

| Champ          | Type            | Notes                      |
| -------------- | --------------- | -------------------------- |
| `id`           | Formula         |                            |
| `body_md`      | Long text       | markdown généré par Claude |
| `generated_at` | DateTime        | auto                       |
| `avg_rating`   | Number          |                            |
| `best_episode` | Link → Episodes |                            |

### Table `Settings` (singleton)

| Champ             | Type     | Notes                                      |
| ----------------- | -------- | ------------------------------------------ |
| `season_unlocked` | Checkbox | `false` pendant la saison, `true` à la fin |
| `season_end_date` | Date     | utilisé par le cron de bascule             |

---

## 2. Règle de confidentialité — la table de vérité

Implémentée **dans n8n uniquement**, jamais dans le front.

```
const CAN_SEE = {
  samuel:        ['samuel'],                       // pendant la saison
  mathilde:      ['mathilde'],
  amis_samuel:   ['amis_samuel', 'amis_mathilde'],
  amis_mathilde: ['amis_samuel', 'amis_mathilde'],
};
// Si Settings.season_unlocked === true → tout le monde voit tout.
```

À appliquer sur **tous** les endpoints qui retournent des `Reviews`.

---

## 3. Contrats des webhooks n8n

Tous les webhooks :

- `Method: POST` (sauf indication)
- Header `x-api-key: <SHARED_API_KEY>` obligatoire
- Header `x-session-token: <session_token>` pour les routes authentifiées
- Réponse en JSON, codes HTTP standards
- Erreurs : `{ "error": "string", "code": "string" }`

### 3.1 `POST /auth/request`

Demande un magic link.

**Request**

```json
{ "email": "samuel@example.com" }
```

**n8n flow**

1. Find user in `Users` where `email = {{email}}`
2. Si pas trouvé : retourner `200 { ok: true }` quand même (anti-énumération)
3. Générer `token = uuid()`, `expires = now + 15min`
4. Update user → `magic_token`, `token_expires_at`
5. Envoyer mail Resend avec lien
   `${APP_BASE_URL}/auth/callback?token=${token}`
6. Retourner `200 { ok: true }`

**Response** : `200 { "ok": true }`

### 3.2 `POST /auth/verify`

Échange un magic token contre une session.

**Request**

```json
{ "token": "uuid" }
```

**n8n flow**

1. Find user where `magic_token = {{token}}` AND `token_expires_at > now`
2. Si pas trouvé → `401 { error: "expired" }`
3. Générer `session_token = uuid()`, `session_expires = now + 30j`
4. Update user → `session_token`, `session_expires_at`, vider `magic_token`
5. Retourner

**Response**

```json
{
  "session_token": "uuid",
  "user": { "id": "usr_001", "name": "Samuel", "role": "samuel" }
}
```

Le front stocke ça dans `localStorage` clé `nc_session`.

### 3.3 `POST /auth/me`

Hydrate la session au reload.

**Headers** : `x-session-token`

**n8n flow** : find user where `session_token = X` AND `session_expires_at > now`.

**Response**

```json
{ "user": { "id": "usr_001", "name": "Samuel", "role": "samuel" } }
```

→ ou `401` si invalide.

### 3.4 `POST /auth/logout`

Invalide la session.

### 3.5 `GET /episodes`

**n8n flow** : retourne tous les épisodes triés par `number`.

**Response**

```json
{
  "episodes": [
    {
      "id": "ep_01",
      "number": 1,
      "title": "Le Pilote — Premier Verre",
      "date": "2025-03-12",
      "place": "Bar à Vin, Le Marais",
      "duration": "2h47",
      "tags": ["Slow burn", "Vin renversé"],
      "cover_url": "https://..."
    }
  ]
}
```

### 3.6 `POST /episodes`

Crée une nouvelle date / un nouvel épisode. Réservé aux rôles `samuel` et
`mathilde`.

**Headers** : `x-session-token`

**Request**

```json
{
  "title": "E05 — Dîner surprise",
  "date": "2025-05-24",
  "place": "Paris, Le Marais",
  "duration": "2h30",
  "tags": ["Slow burn", "Fou rire"],
  "cover_url": "https://..."
}
```

**n8n flow**

1. Auth → `session.role`
2. Refuser si le rôle n'est pas `samuel` ou `mathilde`
3. Valider `title`, `date`, `place`
4. Calculer `number = max(Episodes.number) + 1`
5. Créer l'épisode dans Airtable
6. Retourner `{ "episode": {...} }`

### 3.7 `GET /episodes/:id/reviews`

**Headers** : `x-session-token`

**n8n flow** :

1. Auth → récupère `session.role`
2. Récupère `Settings.season_unlocked`
3. Calcule `allowed_roles` selon table de vérité
4. Si `season_unlocked === true` → `allowed_roles = ['samuel','mathilde','amis_samuel','amis_mathilde']`
5. Récupère `Reviews` where `episode = id` AND `author_role IN allowed_roles`
6. Retourne

**Response**

```json
{
  "reviews": [
    {
      "id": "rev_xx",
      "author_role": "samuel",
      "author_name": "Samuel",
      "rating": 5,
      "favorite_moment": "...",
      "awkward_moment": "...",
      "funny_quote": "...",
      "summary": "...",
      "would_redo": "yes",
      "song": "https://open.spotify.com/...",
      "updated_at": "..."
    }
  ],
  "season_unlocked": false
}
```

### 3.8 `POST /episodes/:id/reviews`

Crée ou met à jour le review de l'utilisateur courant. Un seul review par
`(episode, author)`.

**Headers** : `x-session-token`

**Request**

```json
{
  "rating": 5,
  "favorite_moment": "...",
  "awkward_moment": "...",
  "funny_quote": "...",
  "summary": "...",
  "would_redo": "yes",
  "song": "https://..."
}
```

**n8n flow**

1. Auth → `session.user_id`, `session.role`
2. **Sécurité** : `author_role` est forcé à `session.role`, jamais lu du body
3. Upsert dans `Reviews` where `episode = id AND author = user_id`
4. Retourner le review créé/màj

### 3.9 `GET /ideas`

Retourne toutes les idées (visibles par tous).

**Response**

```json
{
  "ideas": [
    {
      "id": "idea_01",
      "title": "...",
      "description": "...",
      "proposed_by_id": "usr_002",
      "proposed_by_name": "Mathilde",
      "status": "voting",
      "likes": ["usr_001"],
      "dislikes": [],
      "my_vote": "like" // calculé par n8n vs session.user_id
    }
  ]
}
```

### 3.9 `POST /ideas`

**Headers** : `x-session-token`

**Request**

```json
{ "title": "...", "description": "..." }
```

`proposed_by` est forcé à `session.user_id`.

### 3.10 `POST /ideas/:id/vote`

**Headers** : `x-session-token`

**Request**

```json
{ "kind": "like" } // "like" | "dislike" | "clear"
```

n8n :

- Retire `user_id` des deux multi-links
- Si `kind=like` → ajoute à `likes`
- Si `kind=dislike` → ajoute à `dislikes`
- `kind=clear` → ne fait rien d'autre

### 3.11 `PATCH /ideas/:id/status`

**Headers** : `x-session-token`

**Request** : `{ "status": "selected" }`

Optionnel : restreindre à `samuel` ou `mathilde`.

### 3.12 `GET /votes`

Retourne les questions actives + résultats agrégés. Ne dit jamais qui a
voté quoi.

**Response**

```json
{
  "questions": [
    {
      "id": "q_01",
      "question": "Quel épisode est le plus susceptible de devenir un mème ?",
      "options": ["E01 Premier Verre", "E02 Cinéma Mystère", "..."],
      "results": { "E01 Premier Verre": 3, "E02 Cinéma Mystère": 5 },
      "total": 8,
      "my_choice": "E02 Cinéma Mystère" // depuis localStorage côté front, pas d'Airtable
    }
  ]
}
```

### 3.13 `POST /votes/:question_id`

**Request** : `{ "option": "E02 Cinéma Mystère" }`

n8n :

1. Trouve la ligne `VoteResults where question = X AND option = Y`
2. Incrémente `count` (créer si pas existante)
3. Retourne `{ ok: true }`
4. ⚠ Aucune trace de qui a voté n'est jamais écrite côté serveur

Front : stocke `nc_votes` en localStorage `{ q_01: "E02..." }` pour bloquer
le double-vote et afficher `my_choice` au reload.

### 3.14 `GET /synthese`

Retourne la synthèse. Si `season_unlocked === false` → retourne le placeholder
simulé (comme dans le prototype). Si `true` → retourne la ligne `Synthese`
générée par Claude.

---

## 4. Workflows n8n d'automatisation

### Cron `0 18 * * 5` (vendredi 18h) — Relance comptes-rendus

1. Récupère tous les épisodes où `date` est dans les 7 derniers jours
2. Pour chaque épisode, vérifie si `Reviews` contient les entrées samuel ET mathilde
3. Si manquant : envoie un mail au défaillant
   _"🎬 Tu dois ton compte-rendu de E0X — c'est le moment"_

### Trigger Airtable — Review complet

Quand `Reviews` reçoit un nouveau record, vérifier si l'épisode a maintenant
2 reviews (samuel + mathilde). Si oui → mail aux deux :
_"✨ L'épisode E0X est complet. Tu verras le sien à la fin de la saison."_

### Cron quotidien — Bascule de fin de saison

```
SI now >= Settings.season_end_date AND season_unlocked === false
  THEN
    UPDATE Settings.season_unlocked = true
    Trigger workflow "Generate Synthese"
    Send mail à tous les users : "🎟 Le grand reveal est dispo. Vote, regarde, savoure."
```

### Workflow "Generate Synthese"

1. Récupère tous les `Episodes`, `Reviews`, `Ideas`, `VoteResults`
2. Construit un prompt avec ces données
3. Appelle Claude (`claude-sonnet-4-5`) avec un system prompt :
   _"Tu es un critique de série bienveillant et un peu absurde. Génère un bilan
   de fin de saison en markdown : pitch officiel, épisode marquant, dynamique
   du couple, pronostic saison 2, citation finale. Ton fun-mais-sincère."_
4. Stocke la réponse dans `Synthese.body_md`

### Cron J-7 avant fin

Mail à tous : _"🎟 Le verdict approche, prépare ton vote."_

---

## 5. Refacto du frontend (instructions à Claude Code)

> Voici les instructions exactes à donner à Claude Code dans le handoff.

### 5.1 Créer un client API

`src/lib/api.ts` — wrapper `fetch` qui :

- ajoute `x-api-key` toujours
- ajoute `x-session-token` si `localStorage.nc_session.session_token` existe
- gère le `401` → redirige vers `/login`
- expose `api.get(path)`, `api.post(path, body)`, `api.patch(path, body)`

### 5.2 Refactor `src/lib/auth.tsx`

Remplacer le `login(role, name)` actuel par deux étapes :

```ts
requestMagicLink(email: string)         // POST /auth/request
verifyMagicLink(token: string)          // POST /auth/verify, stocke nc_session
me()                                    // POST /auth/me, hydrate au mount
logout()                                // POST /auth/logout, vide localStorage
```

Ajouter une route `src/routes/auth.callback.tsx` qui lit `?token=` et appelle
`verifyMagicLink`.

### 5.3 Refactor `src/lib/store.tsx`

Remplacer **tous** les `seedEpisodes / seedIdeas / seedAbsurdVotes` par des
appels API + cache TanStack Query :

```ts
useEpisodes(); // GET /episodes
useEpisodeReviews(id); // GET /episodes/:id/reviews
useSaveReview(id); // POST /episodes/:id/reviews
useIdeas(); // GET /ideas
useCreateIdea(); // POST /ideas
useVoteIdea(); // POST /ideas/:id/vote
useSetIdeaStatus(); // PATCH /ideas/:id/status
useVotes(); // GET /votes
useCastVote(); // POST /votes/:qid
useSynthese(); // GET /synthese
useSeasonUnlocked(); // dérivé du retour de /episodes/:id/reviews
```

### 5.4 Adapter l'UI au gating de fin de saison

Sur l'écran épisode :

- Si `season_unlocked === false` ET le user est samuel/mathilde →
  n'afficher que **son propre** review + un placeholder pour l'autre :
  _"🔒 Le compte rendu de Mathilde sera visible à la fin de la saison."_
- Si `season_unlocked === true` → tout afficher

Sur la timeline / le dashboard : remplacer les `avg` calculés sur les 2
ratings par `avg` calculé sur les reviews **visibles** uniquement, et afficher
un cadenas si l'autre review existe mais est cachée.

### 5.5 Supprimer le fichier `src/lib/mock-data.ts`

Une fois tous les hooks branchés sur l'API, ce fichier n'a plus d'utilité.

### 5.6 Login page

Remplacer le profile-picker actuel par un formulaire :

1. Champ email → bouton "Recevoir mon lien"
2. État de confirmation : _"📬 Vérifie tes mails. Le lien expire dans 15 min."_
3. La page `/auth/callback?token=...` récupère la session puis redirige

---

## 6. Checklist d'exécution

- [ ] Créer la base Airtable avec les 8 tables ci-dessus
- [ ] Seeder `Users` (toi, ta partenaire, amis), `Episodes` initiaux, `VoteQuestions`
- [ ] Créer instance n8n (cloud ou self-host) + configurer les variables d'env
- [ ] Brancher Resend (ou Brevo) pour les mails transactionnels
- [ ] Implémenter les 14 webhooks de la section 3 — un par un, avec test
- [ ] Implémenter les 4 workflows d'automatisation de la section 4
- [ ] Côté front : refacto sections 5.1 → 5.6
- [ ] Tester en navigation privée séparée Samuel ↔ Mathilde :
      écrire un review chacun, vérifier qu'aucun ne voit celui de l'autre
- [ ] Tester en mode "ami" : voir les reviews des autres amis, pas du couple
- [ ] Tester la bascule manuelle `season_unlocked = true` → tout devient visible
- [ ] Tester le cron de relance vendredi (le déclencher à la main une fois)
- [ ] Tester le workflow Synthese (le déclencher à la main une fois)

---

## 7. Tests d'intrusion à passer avant la mise en prod

1. Avec la session **samuel**, appeler `GET /episodes/ep_01/reviews` → ne doit
   **jamais** retourner le review de mathilde tant que `season_unlocked = false`.
2. Avec la session **samuel**, appeler `POST /episodes/ep_01/reviews` en
   forçant un body `author_role: "mathilde"` → doit être ignoré, le review
   doit être enregistré comme samuel.
3. Sans header `x-api-key` → tous les webhooks doivent retourner `401`.
4. Session token expiré → tous les endpoints authentifiés doivent retourner `401`.
5. Magic token réutilisé → `/auth/verify` doit retourner `401` à la 2e tentative.

---

## 8. Coût estimé

- Airtable : **gratuit** jusqu'à 1000 records / base (largement suffisant)
- n8n : **20 €/mois** (cloud Starter) ou gratuit en self-host sur Fly.io
- Resend : **gratuit** jusqu'à 3000 mails/mois
- Cloudflare Pages (déjà dans `wrangler.jsonc`) : **gratuit**
- Anthropic API pour la synthèse : ~**0,10 €** pour une seule génération de fin de saison

Total : **0 à 20 €/mois**, pour 4 utilisateurs.
