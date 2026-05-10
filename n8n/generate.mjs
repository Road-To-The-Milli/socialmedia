/**
 * Emits importable n8n workflow JSON scaffolds for Nous & Chill.
 *
 * Each scaffold contains: Webhook trigger → API key guard → (optional)
 * Session lookup → TODO Function node → Respond. Replace TODO nodes with
 * real Airtable / HTTP nodes once the base is provisioned.
 *
 * Usage: node n8n/generate.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const HEADERS_HINT = "x-api-key (required), x-session-token (auth routes)";

const webhooks = [
  // === AUTH ===
  {
    file: "auth.request.json",
    name: "POST /auth/request",
    method: "POST",
    pathSegments: "auth/request",
    auth: false,
    todo: `// HANDOFF.md §3.1
// 1. Find Users where email = {{ $json.body.email }}
// 2. If not found → respond 200 { ok: true } anyway (anti-enumeration)
// 3. Else generate token = uuid(), expires = now + 15 min
// 4. Update user → magic_token, token_expires_at
// 5. Send Resend mail with link APP_BASE_URL/auth/callback?token=<token>
// 6. Respond 200 { ok: true }
return [{ json: { ok: true } }];`,
  },
  {
    file: "auth.verify.json",
    name: "POST /auth/verify",
    method: "POST",
    pathSegments: "auth/verify",
    auth: false,
    todo: `// HANDOFF.md §3.2
// 1. Find user where magic_token = {{ $json.body.token }} AND token_expires_at > now
// 2. If not found → respond 401 { error: "expired" }
// 3. Generate session_token = uuid(), session_expires_at = now + 30d
// 4. Update user → session_token, session_expires_at, clear magic_token
// 5. Respond { session_token, user: { id, name, role } }
return [{ json: { error: "not_implemented", code: "todo" } }];`,
  },
  {
    file: "auth.me.json",
    name: "POST /auth/me",
    method: "POST",
    pathSegments: "auth/me",
    auth: true,
    todo: `// HANDOFF.md §3.3
// 1. Lookup user by session_token (already validated by Session Lookup node)
// 2. Respond { user: { id, name, role } }
return [{ json: { user: $('Session Lookup').first().json } }];`,
  },
  {
    file: "auth.logout.json",
    name: "POST /auth/logout",
    method: "POST",
    pathSegments: "auth/logout",
    auth: true,
    todo: `// HANDOFF.md §3.4
// 1. Clear session_token + session_expires_at on user
// 2. Respond { ok: true }
return [{ json: { ok: true } }];`,
  },

  // === EPISODES ===
  {
    file: "episodes.list.json",
    name: "GET /episodes",
    method: "GET",
    pathSegments: "episodes",
    auth: false,
    todo: `// HANDOFF.md §3.5
// 1. Airtable list Episodes sorted by number
// 2. Respond { episodes: [...] }
return [{ json: { episodes: [] } }];`,
  },
  {
    file: "episodes.reviews.list.json",
    name: "GET /episodes/:id/reviews",
    method: "GET",
    pathSegments: "episodes/:id/reviews",
    auth: true,
    todo: `// HANDOFF.md §3.6 — PRIVACY GATE LIVES HERE
// 1. Get session.role from Session Lookup node
// 2. Read Settings.season_unlocked
// 3. CAN_SEE = {
//      samuel: ['samuel'],
//      mathilde: ['mathilde'],
//      amis_samuel: ['amis_samuel','amis_mathilde'],
//      amis_mathilde: ['amis_samuel','amis_mathilde'],
//    }
//    if (season_unlocked) allowed = all four
//    else allowed = CAN_SEE[session.role]
// 4. Airtable list Reviews where episode = $json.params.id AND author_role IN allowed
// 5. Respond { reviews: [...], season_unlocked }
return [{ json: { reviews: [], season_unlocked: false } }];`,
  },
  {
    file: "episodes.reviews.upsert.json",
    name: "POST /episodes/:id/reviews",
    method: "POST",
    pathSegments: "episodes/:id/reviews",
    auth: true,
    todo: `// HANDOFF.md §3.7
// 1. session.user_id, session.role from Session Lookup
// 2. SECURITY: force author_role = session.role — never read from body
// 3. Upsert Reviews where episode = $json.params.id AND author = session.user_id
// 4. Respond { review: {...} }
return [{ json: { review: null, error: "not_implemented" } }];`,
  },

  // === IDEAS ===
  {
    file: "ideas.list.json",
    name: "GET /ideas",
    method: "GET",
    pathSegments: "ideas",
    auth: true,
    todo: `// HANDOFF.md §3.8
// 1. Read all Ideas
// 2. For each: compute my_vote based on session.user_id presence in likes/dislikes
// 3. Respond { ideas: [...] }
return [{ json: { ideas: [] } }];`,
  },
  {
    file: "ideas.create.json",
    name: "POST /ideas",
    method: "POST",
    pathSegments: "ideas",
    auth: true,
    todo: `// HANDOFF.md §3.9
// 1. Force proposed_by = session.user_id
// 2. Create Idea with title, description, status: 'voting'
// 3. Respond { idea: {...} }
return [{ json: { idea: null, error: "not_implemented" } }];`,
  },
  {
    file: "ideas.vote.json",
    name: "POST /ideas/:id/vote",
    method: "POST",
    pathSegments: "ideas/:id/vote",
    auth: true,
    todo: `// HANDOFF.md §3.10
// 1. Remove session.user_id from BOTH likes and dislikes
// 2. If kind === 'like'    → add to likes
// 3. If kind === 'dislike' → add to dislikes
// 4. If kind === 'clear'   → done
// 5. Respond { idea: {...} }
return [{ json: { idea: null } }];`,
  },
  {
    file: "ideas.status.json",
    name: "PATCH /ideas/:id/status",
    method: "PATCH",
    pathSegments: "ideas/:id/status",
    auth: true,
    todo: `// HANDOFF.md §3.11
// Optional: restrict to roles 'samuel' | 'mathilde'
// Update Idea.status to $json.body.status
return [{ json: { idea: null } }];`,
  },

  // === VOTES ===
  {
    file: "votes.list.json",
    name: "GET /votes",
    method: "GET",
    pathSegments: "votes",
    auth: true,
    todo: `// HANDOFF.md §3.12
// 1. Read VoteQuestions where active = true
// 2. For each, aggregate VoteResults rows by option → results map + total
// 3. NEVER record who voted — my_choice comes from frontend localStorage
// 4. Respond { questions: [{ id, question, options, results, total }] }
return [{ json: { questions: [] } }];`,
  },
  {
    file: "votes.cast.json",
    name: "POST /votes/:question_id",
    method: "POST",
    pathSegments: "votes/:question_id",
    auth: true,
    todo: `// HANDOFF.md §3.13
// 1. Find VoteResults where question = $json.params.question_id AND option = body.option
// 2. If exists: increment count. Else: create with count = 1
// 3. ⚠ Never persist user_id, role, or any identifier
// 4. Respond { ok: true }
return [{ json: { ok: true } }];`,
  },

  // === SYNTHESE ===
  {
    file: "synthese.get.json",
    name: "GET /synthese",
    method: "GET",
    pathSegments: "synthese",
    auth: true,
    todo: `// HANDOFF.md §3.14
// 1. Read Settings.season_unlocked
// 2. If false → respond { season_unlocked: false, body_md: null }
// 3. If true  → read Synthese row, respond { season_unlocked: true, body_md, generated_at, avg_rating, best_episode_id }
return [{ json: { season_unlocked: false, body_md: null } }];`,
  },
];

const automations = [
  {
    file: "auto.cron-friday-relance.json",
    name: "Cron Vendredi 18h — Relance comptes-rendus",
    cron: "0 18 * * 5",
    todo: `// HANDOFF.md §4 cron 0 18 * * 5
// 1. List Episodes where date in [now - 7d, now]
// 2. For each, check Reviews has both samuel AND mathilde
// 3. Mail any defaulter via Resend: "🎬 Tu dois ton compte-rendu de E0X"
return [];`,
  },
  {
    file: "auto.trigger-review-complete.json",
    name: "Trigger — Review complet",
    trigger: "airtable",
    todo: `// HANDOFF.md §4 — Airtable trigger on Reviews insert
// 1. After insert, count Reviews for the same episode
// 2. If both samuel + mathilde present → mail both: "✨ L'épisode E0X est complet"
return [];`,
  },
  {
    file: "auto.cron-season-end.json",
    name: "Cron quotidien — Bascule fin de saison",
    cron: "0 9 * * *",
    todo: `// HANDOFF.md §4 cron quotidien
// SI now >= Settings.season_end_date AND season_unlocked === false:
//   1. Settings.season_unlocked = true
//   2. Trigger workflow "Generate Synthese"
//   3. Mail tous les users: "🎟 Le grand reveal est dispo"
return [];`,
  },
  {
    file: "auto.generate-synthese.json",
    name: "Workflow — Generate Synthese",
    trigger: "manual",
    todo: `// HANDOFF.md §4 — Generate Synthese
// 1. Fetch Episodes, Reviews, Ideas, VoteResults
// 2. Build prompt with system message:
//    "Tu es un critique de série bienveillant et un peu absurde. Génère un bilan
//     de fin de saison en markdown : pitch officiel, épisode marquant, dynamique
//     du couple, pronostic saison 2, citation finale. Ton fun-mais-sincère."
// 3. Call Anthropic API (claude-sonnet-4-5) with ANTHROPIC_API_KEY
// 4. Store response in Synthese.body_md
return [];`,
  },
];

function nodeId() {
  return randomUUID();
}

function makeWebhookWorkflow(spec) {
  const webhookNode = {
    parameters: {
      httpMethod: spec.method,
      path: spec.pathSegments,
      responseMode: "responseNode",
      options: {},
    },
    id: nodeId(),
    name: "Webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [240, 300],
    webhookId: nodeId(),
    notes: HEADERS_HINT,
  };

  const apiKeyGuard = {
    parameters: {
      conditions: {
        options: { caseSensitive: true, typeValidation: "strict" },
        conditions: [
          {
            id: nodeId(),
            leftValue: '={{ $json.headers["x-api-key"] }}',
            rightValue: "={{ $env.SHARED_API_KEY }}",
            operator: { type: "string", operation: "equals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    id: nodeId(),
    name: "API Key Guard",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [460, 300],
  };

  const respondUnauthorized = {
    parameters: {
      respondWith: "json",
      responseBody: '={{ JSON.stringify({ error: "unauthorized", code: "no_key" }) }}',
      options: { responseCode: 401 },
    },
    id: nodeId(),
    name: "401 Unauthorized",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.2,
    position: [680, 460],
  };

  const todoNode = {
    parameters: {
      mode: "runOnceForEachItem",
      jsCode: spec.todo,
    },
    id: nodeId(),
    name: "TODO — Implement logic",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [900, 200],
  };

  const respondOk = {
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {},
    },
    id: nodeId(),
    name: "Respond",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.2,
    position: [1120, 200],
  };

  const nodes = [webhookNode, apiKeyGuard, respondUnauthorized];

  let sessionLookup = null;
  let sessionGuard = null;
  let respondSessionExpired = null;

  if (spec.auth) {
    sessionLookup = {
      parameters: {
        // Replace this with a real Airtable Search node bound to your base.
        mode: "runOnceForEachItem",
        jsCode: `// TODO: replace with Airtable Search on Users
// Filter formula: AND({session_token} = "{{ $json.headers['x-session-token'] }}", IS_AFTER({session_expires_at}, NOW()))
// Then return the user record under \`session\` so downstream nodes can reach it via $('Session Lookup').
const token = $json.headers["x-session-token"];
if (!token) throw new Error("no_session_token");
return { json: { _todo: "wire to Airtable Users search", token } };`,
      },
      id: nodeId(),
      name: "Session Lookup",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [680, 200],
    };

    sessionGuard = {
      parameters: {
        conditions: {
          options: { caseSensitive: true, typeValidation: "strict" },
          conditions: [
            {
              id: nodeId(),
              leftValue: "={{ Boolean($json.token) }}",
              rightValue: "={{ true }}",
              operator: { type: "boolean", operation: "true", singleValue: true },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
      id: nodeId(),
      name: "Session Guard",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [820, 200],
    };

    respondSessionExpired = {
      parameters: {
        respondWith: "json",
        responseBody: '={{ JSON.stringify({ error: "expired", code: "session_invalid" }) }}',
        options: { responseCode: 401 },
      },
      id: nodeId(),
      name: "401 Session Expired",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.2,
      position: [1040, 360],
    };

    nodes.push(sessionLookup, sessionGuard, respondSessionExpired);
  }

  nodes.push(todoNode, respondOk);

  const connections = {
    Webhook: { main: [[{ node: "API Key Guard", type: "main", index: 0 }]] },
  };

  if (spec.auth) {
    connections["API Key Guard"] = {
      main: [
        [{ node: "Session Lookup", type: "main", index: 0 }],
        [{ node: "401 Unauthorized", type: "main", index: 0 }],
      ],
    };
    connections["Session Lookup"] = {
      main: [[{ node: "Session Guard", type: "main", index: 0 }]],
    };
    connections["Session Guard"] = {
      main: [
        [{ node: "TODO — Implement logic", type: "main", index: 0 }],
        [{ node: "401 Session Expired", type: "main", index: 0 }],
      ],
    };
  } else {
    connections["API Key Guard"] = {
      main: [
        [{ node: "TODO — Implement logic", type: "main", index: 0 }],
        [{ node: "401 Unauthorized", type: "main", index: 0 }],
      ],
    };
  }
  connections["TODO — Implement logic"] = {
    main: [[{ node: "Respond", type: "main", index: 0 }]],
  };

  return {
    name: spec.name,
    nodes,
    connections,
    pinData: {},
    settings: { executionOrder: "v1" },
    active: false,
    meta: {
      templateCredsSetupCompleted: false,
      handoffSection: "HANDOFF.md §3",
    },
  };
}

function makeAutomationWorkflow(spec) {
  let triggerNode;
  if (spec.cron) {
    triggerNode = {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: spec.cron }],
        },
      },
      id: nodeId(),
      name: "Schedule Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300],
    };
  } else if (spec.trigger === "airtable") {
    triggerNode = {
      parameters: {
        // Replace with the Airtable Trigger node, watching the Reviews table on insert.
        notice: "Replace with Airtable Trigger watching Reviews → onInsert.",
      },
      id: nodeId(),
      name: "Airtable Trigger (replace)",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 300],
    };
  } else {
    triggerNode = {
      parameters: {},
      id: nodeId(),
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 300],
    };
  }

  const todoNode = {
    parameters: {
      mode: "runOnceForAllItems",
      jsCode: spec.todo,
    },
    id: nodeId(),
    name: "TODO — Implement automation",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [460, 300],
  };

  return {
    name: spec.name,
    nodes: [triggerNode, todoNode],
    connections: {
      [triggerNode.name]: {
        main: [[{ node: "TODO — Implement automation", type: "main", index: 0 }]],
      },
    },
    pinData: {},
    settings: { executionOrder: "v1" },
    active: false,
    meta: { handoffSection: "HANDOFF.md §4" },
  };
}

async function main() {
  await mkdir(ROOT, { recursive: true });
  for (const w of webhooks) {
    const json = makeWebhookWorkflow(w);
    await writeFile(path.join(ROOT, w.file), JSON.stringify(json, null, 2));
    console.log("wrote", w.file);
  }
  for (const a of automations) {
    const json = makeAutomationWorkflow(a);
    await writeFile(path.join(ROOT, a.file), JSON.stringify(json, null, 2));
    console.log("wrote", a.file);
  }
  console.log(`✅ Generated ${webhooks.length + automations.length} workflow files in n8n/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
