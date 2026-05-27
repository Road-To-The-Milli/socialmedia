# n8n workflows - Nous & Chill

Importable workflow scaffolds for the webhooks and automations.

## Import order

1. **Credentials first** - set up `Airtable PAT` with access to your base.
   The token must include `data.records:read` and `data.records:write`; without
   write access, comment creation returns Airtable `403`.
2. **Environment variables** in n8n:
   - `AIRTABLE_BASE_ID` - appXXXXXXXXXXXX
   - `AIRTABLE_PAT` or `AIRTABLE_API_KEY`
   - `SHARED_API_KEY` - same long secret as `VITE_N8N_API_KEY`
   - `APP_BASE_URL` - public URL of the front
   - `SEASON_END_DATE` - YYYY-MM-DD
   - `CODE_SAMUEL` - secret code for Samuel
   - `CODE_MATHILDE` - secret code for Mathilde
   - `CODE_AMIS_SAMUEL` - secret code for Samuel's friends
   - `CODE_AMIS_MATHILDE` - secret code for Mathilde's friends
   - `AIRTABLE_COMMENT_TABLE` - optional, defaults to `Comments`
   - `AIRTABLE_COMMENT_EPISODE_FIELD` - optional, defaults to `episode`
   - `ANTHROPIC_API_KEY` - for the synthese workflow
3. **Import workflows**:
   1. `auth.verify.json`, `auth.me.json`, `auth.logout.json`
   2. `episodes.list.json`, `episodes.create.json`, `episodes.reviews.list.json`, `episodes.reviews.upsert.json`, `episodes.comments.list.json`, `episodes.comments.create.json`
   3. `ideas.list.json`, `ideas.create.json`, `ideas.vote.json`, `ideas.status.json`
   4. `votes.list.json`, `votes.cast.json`
   5. `synthese.get.json`
   6. `auto.cron-friday-relance.json`, `auto.trigger-review-complete.json`,
      `auto.cron-season-end.json`, `auto.generate-synthese.json`
4. Activate each workflow once you've verified it in test mode.

## Code Auth

The frontend now calls `POST /auth/verify` with:

```json
{ "code": "group-secret-code" }
```

`auth.verify.json` maps that code to one of the four roles:

```js
samuel
mathilde
amis_samuel
amis_mathilde
```

It then finds the first `Users` record with that `role`, writes a fresh
`session_token` and `session_expires_at`, and returns:

```json
{
  "session_token": "...",
  "user": { "id": "...", "name": "...", "role": "samuel" }
}
```

Unknown code -> `401 { "error": "Code invalide", "code": "invalid_group_code" }`.

Group codes live only in n8n environment variables. Do not expose them in the
frontend env.

## Ideas

Create an Airtable table named `Ideas` (or set `AIRTABLE_IDEAS_TABLE`) with these fields:

```txt
title             Single line text
description       Long text
proposed_by_id    Single line text
proposed_by_name  Single line text
status            Single select  (voting | selected | scheduled | done)
likes             Long text      (JSON array of user IDs, e.g. ["rec123","rec456"])
dislikes          Long text      (JSON array of user IDs)
```

The app calls:

```txt
GET   /ideas
POST  /ideas
POST  /ideas/:id/vote   { kind: "like" | "dislike" | "clear" }
PATCH /ideas/:id/status { status: "voting" | "selected" | "scheduled" | "done" }
```

`likes` and `dislikes` are serialized JSON strings. The workflows parse/stringify them automatically.

## Episode Comments

Create an Airtable table named `Comments` with these fields:

```txt
episode       Link to Episodes
author_name   Single line text
author_role   Single line text
body          Long text
```

If `POST /episodes/:id/comments` returns
`airtable_comment_permission_denied`, regenerate the Airtable PAT with
`data.records:write` and make sure the token is authorized on the base that
contains the `Comments` table.

The app calls:

```txt
GET  /episodes/:id/comments
POST /episodes/:id/comments
```

The write webhook uses the session headers for `author_role` and requires the
friend to provide `author_name` and `body`.

## Authenticated Routes

Authenticated webhooks must look up `Users` where:

```txt
session_token = {{ $json.headers["x-session-token"] }}
AND session_expires_at > NOW()
```

Failed auth returns 401.

## Privacy Gate

For `episodes.reviews.list` and any future read of Reviews, enforce server-side:

```js
const CAN_SEE = {
  samuel: ["samuel"],
  mathilde: ["mathilde"],
  amis_samuel: ["amis_samuel", "amis_mathilde"],
  amis_mathilde: ["amis_samuel", "amis_mathilde"],
};

const seasonUnlocked = settings.season_unlocked === true;
const allowedRoles = seasonUnlocked
  ? ["samuel", "mathilde", "amis_samuel", "amis_mathilde"]
  : CAN_SEE[session.role];

const visible = reviews.filter((r) => allowedRoles.includes(r.author_role));
```

Never trust `author_role` from a request body. Always force it to `session.role`
on writes.

## Testing Checklist

1. `POST /auth/verify` with each group code returns the expected role.
2. `POST /auth/verify` with an unknown code returns 401.
3. Missing `x-api-key` header returns 401 on every webhook.
4. Expired `session_token` returns 401 on authenticated routes.
5. `GET /episodes/ep_01/reviews` as Samuel never returns Mathilde's review while `season_unlocked = false`.
6. `POST /episodes/ep_01/reviews` as Samuel with `body.author_role = "mathilde"` still stores `samuel`.
