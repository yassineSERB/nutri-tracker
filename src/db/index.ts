import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/** Kept under `data/` in the project root so Turbopack can statically scope the
 *  access instead of tracing the whole project into the server bundle. */
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "app.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/** Owner created by the multi-user migration to carry the rows that already
 *  existed. It holds a bcrypt hash of a random secret, so it cannot be used to
 *  sign in. */
const LEGACY_OWNER_EMAIL = "__legacy__@invalid.local";

/**
 * Hands the legacy owner row over to the credentials from `.env.local`, in
 * place, so the data keeps the same `id` and nothing has to be re-linked. It runs
 * once: afterwards the real email is found and the function returns.
 *
 * Raw SQL on purpose — this runs at import time and the `users` table may not
 * exist yet on a database where migrations have never been applied.
 */
function promoteLegacyOwner(): void {
  const email = process.env.AUTH_USER_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.AUTH_USER_PASSWORD_HASH;
  if (!email || !passwordHash) return;

  try {
    const owner = sqlite
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: number } | undefined;
    if (owner) return;

    const legacy = sqlite
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(LEGACY_OWNER_EMAIL) as { id: number } | undefined;
    if (!legacy) return;

    sqlite
      .prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?")
      .run(email, passwordHash, legacy.id);
  } catch (error) {
    // A missing `users` table just means the migrations have not run yet; the
    // first real query will say so with a better message than this would.
    console.warn(
      "Promotion du compte existant ignorée :",
      error instanceof Error ? error.message : error,
    );
  }
}

promoteLegacyOwner();
