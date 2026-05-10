# n8n workflows — Nous & Chill

Importable workflow scaffolds for the 14 webhooks (HANDOFF.md §3) and 4 automations (§4).

## Import order

1. **Credentials first** — set up two credentials in n8n:
   - `Airtable PAT` (Airtable API → Personal Access Token, scoped to your base)
   - `Resend API` (HTTP header auth: `Authorization: Bearer <RESEND_API_KEY>`)
2. **Environment variables** (n8n Settings → Environment):
   - `AIRTABLE_BASE_ID` — appXXXXXXXXXXXX
   - `SHARED_API_KEY` — same long secret as `VITE_N8N_API_KEY`
   - `APP_BASE_URL` — public URL of the front
   - `SEASON_END_DATE` — YYYY-MM-DD
   - `ANTHROPIC_API_KEY` — for the synthese workflow
3. **Import workflows** — in this order (some refer to others):
   1. `auth.request.json` (full reference, copy its patterns into the rest)
   2. `auth.verify.json`, `auth.me.json`, `auth.logout.json`
   3. `episodes.list.json`, `episodes.reviews.list.json`, `episodes.reviews.upsert.json`
   4. `ideas.list.json`, `ideas.create.json`, `ideas.vote.json`, `ideas.status.json`
   5. `votes.list.json`, `votes.cast.json`
   6. `synthese.get.json`
   7. `auto.cron-friday-relance.json`, `auto.trigger-review-complete.json`,
      `auto.cron-season-end.json`, `auto.generate-synthese.json`
4. **Activate** each workflow once you've verified it in test mode.

## What each scaffold includes

Every JSON file imports into n8n with:
- A **Webhook** trigger node bound to the path/method specified in HANDOFF.md
- An **API key guard** (IF node checking `x-api-key === $env.SHARED_API_KEY`)
- For authenticated routes: a **Session lookup** Airtable node (Users where
  `session_token = {{ $json.headers["x-session-token"] }}` AND
  `session_expires_at > NOW()`). Failed auth → 401 response.
- A **TODO** Function node containing the pseudocode for the business logic
  pulled directly from HANDOFF.md §3 / §4. Replace this with real Airtable +
  HTTP nodes.
- A **Respond to Webhook** node returning JSON.

## Privacy gate (HANDOFF.md §2)

For `episodes.reviews.list` (and any future read of Reviews), enforce server-side:

```js
const CAN_SEE = {
  samuel:        ['samuel'],
  mathilde:      ['mathilde'],
  amis_samuel:   ['amis_samuel', 'amis_mathilde'],
  amis_mathilde: ['amis_samuel', 'amis_mathilde'],
};

const seasonUnlocked = settings.season_unlocked === true;
const allowedRoles = seasonUnlocked
  ? ['samuel', 'mathilde', 'amis_samuel', 'amis_mathilde']
  : CAN_SEE[session.role];

const visible = reviews.filter(r => allowedRoles.includes(r.author_role));
```

Never trust `author_role` from a request body — always force it to `session.role`
on writes.

## Anti-pitfalls

- **Don't expose Airtable record IDs in error messages.** Wrap errors in
  `{ error: "...", code: "..." }` per HANDOFF.md §3.
- **Always 200 on `/auth/request`** even if the email is unknown
  (anti-enumeration — §3.1 step 2).
- **VoteResults** writes never persist who voted — only the per-option counter.
- **Magic tokens** must invalidate after first use (§7 test #5). Either delete
  `magic_token` after `auth/verify`, or check `token_expires_at` and write a
  consumed flag.

## Testing checklist (HANDOFF.md §7)

1. `GET /episodes/ep_01/reviews` as Samuel → never returns Mathilde's review while `season_unlocked = false`.
2. `POST /episodes/ep_01/reviews` as Samuel with `body.author_role = 'mathilde'` → server forces `samuel`.
3. Missing `x-api-key` header → 401 on every webhook.
4. Expired `session_token` → 401 on authenticated routes.
5. Reusing a magic token → 401 on the second `/auth/verify` call.
