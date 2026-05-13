/**
 * Airtable seed importer for Nous & Chill.
 *
 * Reads `seed.json` at repo root and writes Users, Settings, Episodes,
 * VoteQuestions, then Ideas (resolving `proposed_by_email` → Airtable user
 * record id).
 *
 * Usage:
 *   AIRTABLE_PAT=pat... AIRTABLE_BASE_ID=app... bun run scripts/seed.ts
 *
 * Requires Node 18+/Bun (uses native fetch). The Airtable base must already
 * have the 8 tables described in HANDOFF.md §1.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = path.join(ROOT, "seed.json");

const PAT = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!PAT || !BASE_ID) {
  console.error("Missing AIRTABLE_PAT or AIRTABLE_BASE_ID env vars.");
  process.exit(1);
}

const API = `https://api.airtable.com/v0/${BASE_ID}`;
const HEADERS = {
  authorization: `Bearer ${PAT}`,
  "content-type": "application/json",
};

interface SeedFile {
  Users: Array<{ email: string; name: string; role: string }>;
  Settings: Array<{ season_unlocked: boolean; season_end_date: string }>;
  Episodes: Array<{
    number: number;
    title: string;
    date: string;
    place: string;
    duration?: string;
    tags?: string[];
    cover_url?: string;
  }>;
  Ideas: Array<{
    title: string;
    description: string;
    proposed_by_email: string;
    status: string;
  }>;
  VoteQuestions: Array<{
    question: string;
    options: string[];
    active: boolean;
  }>;
}

async function airtable<T>(method: string, table: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/${encodeURIComponent(table)}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${method} ${table} → ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function createInBatches<TIn, TOut>(
  table: string,
  rows: TIn[],
  toFields: (r: TIn) => Record<string, unknown>,
): Promise<Array<{ id: string; fields: TOut }>> {
  const out: Array<{ id: string; fields: TOut }> = [];
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const res = await airtable<{ records: Array<{ id: string; fields: TOut }> }>(
      "POST",
      table,
      { records: batch.map((r) => ({ fields: toFields(r) })) },
    );
    out.push(...res.records);
  }
  return out;
}

async function main() {
  const raw = await readFile(SEED_PATH, "utf-8");
  const seed = JSON.parse(raw) as SeedFile;

  console.log("→ Settings");
  await createInBatches("Settings", seed.Settings, (s) => ({
    season_unlocked: s.season_unlocked,
    season_end_date: s.season_end_date,
  }));

  console.log("→ Users");
  const users = await createInBatches<SeedFile["Users"][number], { email: string }>(
    "Users",
    seed.Users,
    (u) => ({ email: u.email, name: u.name, role: u.role }),
  );
  const userIdByEmail = new Map<string, string>();
  for (const u of users) userIdByEmail.set(u.fields.email, u.id);

  console.log("→ Episodes");
  await createInBatches("Episodes", seed.Episodes, (e) => ({
    number: e.number,
    title: e.title,
    date: e.date,
    place: e.place,
    duration: e.duration,
    tags: e.tags ?? [],
    cover_url: e.cover_url,
  }));

  console.log("→ VoteQuestions");
  await createInBatches("VoteQuestions", seed.VoteQuestions, (q) => ({
    question: q.question,
    options: JSON.stringify(q.options),
    active: q.active,
  }));

  console.log("→ Ideas (resolving proposed_by by email)");
  await createInBatches("Ideas", seed.Ideas, (i) => {
    const userId = userIdByEmail.get(i.proposed_by_email);
    if (!userId) throw new Error(`No user found for email ${i.proposed_by_email}`);
    return {
      title: i.title,
      description: i.description,
      proposed_by: [userId],
      status: i.status,
    };
  });

  console.log("✅ Seed complete.");
  console.log(
    `   Inserted: ${seed.Users.length} users, ${seed.Episodes.length} episodes, ${seed.Ideas.length} ideas, ${seed.VoteQuestions.length} questions.`,
  );
  console.log("   Reviews / VoteResults / Synthese tables left empty — they fill at runtime.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
