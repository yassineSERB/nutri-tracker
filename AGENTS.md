<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack (verified)

Next.js **16.3.6** (not 15 — `create-next-app@latest` ships 16.x), React 19.2.8, TypeScript 5, Tailwind **v4**, ESLint 9 flat config. Requires Node **20.9+**.

App Router only, with `src/` (`app/` lives at `src/app/`). Path alias `@/*` → `./src/*`. No test runner, no CI, no formatter — don't assume `npm test` or Prettier exist.

## Commands

```bash
npm run dev      # next dev   (Turbopack, http://localhost:3000)
npm run build    # next build (Turbopack)
npm run start    # next start
npm run lint     # bare `eslint` — see below
npx tsc --noEmit # typecheck; no npm script exists for this
```

Verified green: `lint`, `tsc --noEmit`, `build`.

### Two things that will bite you

- **`next build` no longer lints.** `next lint` was removed in v16, so `npm run lint` is a bare `eslint` call and lint failures do *not* fail the build. Run `lint` explicitly before declaring work done.
- **Run `npx next typegen` after adding or renaming a route.** `PageProps<"/route">`, `LayoutProps<"/route">`, and `RouteContext<"/route">` are *generated* global types. `src/app/layout.tsx` already uses `LayoutProps<"/">`. A brand-new route will fail `tsc --noEmit` with unresolved `PageProps` until typegen (or a `next build` / `next dev`) has run.

## Framework quirks

- **Turbopack is the default** for both `dev` and `build`. Do not add `--turbopack`. If a `webpack` key ever appears in `next.config.ts`, the build fails by design — use `--webpack` to opt out, or migrate the config.
- **Async request APIs, no sync fallback.** `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are all Promises. `const { slug } = await params`. Next 15's temporary sync compat is gone.
- **`middleware.ts` → `proxy.ts`.** The `middleware` filename and the `middleware` named export are deprecated; the export is `proxy`, and it runs on the Node runtime (no `edge`). Config flags renamed too (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`).
- **`revalidateTag` needs 2 args** now: `revalidateTag('tag', 'max')`, where the second is a `cacheLife` profile. For read-your-writes in a Server Action use `updateTag(tag)`.
- `experimental.ppr` / `experimental.dynamicIO` are removed; the replacement is the top-level `cacheComponents` flag. Do not re-add `experimental.turbopack` — `turbopack` is top-level now.
- `dev` writes to `.next/dev`, `build` to `.next`, so the two can run at once. A lockfile at `.next/dev/lock` makes a second `next dev` report the running server's URL and PID instead of starting a duplicate — connect to it rather than spawning another.

## Tailwind v4

CSS-first config. There is **no `tailwind.config.js`** and you should not create one — theme tokens live in `src/app/globals.css` under `@theme inline` (currently `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono`). The PostCSS plugin is `@tailwindcss/postcss`, wired in `postcss.config.mjs`.

## Auth

Multi-user, `users` table. Registration is open: `/register` inserts a row with a bcrypt hash (cost 10 — `bcryptjs` is pure JS, so 12 would cost seconds) and then signs the new user straight in. `src/proxy.ts` guards every route except `/login`, `/register` and `/api/auth`. The proxy redirect is optimistic — `verifySession()` in `src/lib/dal.ts` is the authoritative check and redirects too, so never read user data outside the DAL.

`session.user.id` is the numeric owner id and comes from the `session` callback in `src/auth.ts`, not from the JWT `email`. `currentUserId()` in the DAL is the only way to obtain it, and it throws rather than returning a falsy value: a filter silently dropped is how one account ends up reading another's rows.

`normalizeEmail()` in `src/lib/email.ts` is the single place an email is shaped, and both the unique lookup and registration must use it, or `A@x.fr` and `a@x.fr` become two accounts. Login compares against a decoy hash when the email is unknown so a missing account and a wrong password cost the same.

`trustHost: true` is set in `src/auth.ts`. Auth.js rejects every request with a "problem with the server configuration" message outside `next dev` without it, because it cannot verify the `Host` header of a self-hosted deployment. Do not remove it; the symptom is a login that fails only under `next start`.

`AUTH_USER_EMAIL` / `AUTH_USER_PASSWORD_HASH` are **legacy**. `promoteLegacyOwner()` in `src/db/index.ts` hands the migration's placeholder owner over to those credentials, in place, so pre-existing rows keep their `id`. It runs once at import. Every `$` in the hash must be written as `\$` — `@next/env` expands dollar signs, and an unescaped hash arrives empty, which surfaces as a "wrong password" for the correct credentials.

The proxy matcher excludes `api`, so API route handlers are public to the matcher and must call `auth()` themselves.

## Data

SQLite via `better-sqlite3` (synchronous) + Drizzle. Schema in `src/db/schema.ts`, client in `src/db/index.ts`, migrations in `drizzle/`, database at `data/app.db` (gitignored, override with `DATABASE_PATH`).

- `foods`, `entries`, `water_logs` and `profiles` all carry `userId` and cascade on user deletion. `entries.userId` is redundant with `entries.foodId` on purpose: ownership is then checkable without a join, and a form cannot log someone else's product.
- `profiles.userId` is the primary key, and `water_logs` is keyed on `(userId, dayKey)`. A missing row means "not filled in yet" and is answered with defaults, never a shared row.
- `foods` holds nutrition **per 100 g**; `entries` holds `quantityG`, `mealType`, `eatenAt` and `eatenOn`.
- `water_logs` counts **glasses**, not millilitres — `GLASS_ML` in the DAL is the single place that conversion exists. `addWater()` clamps the delta in JS and floors the result at 0 in SQL. In the `INSERT` branch of the upsert the starting value is just the clamped delta: the column cannot be referenced there, there is no existing row yet. The conflict target is the `(userId, dayKey)` pair.
- The catalog is private, not shared: the same EAN imported by two users is two rows, and `importProduct(userId, product)` is idempotent per user, not globally.
- `eatenOn` is a local `YYYY-MM-DD` string, kept next to the ISO `eatenAt` so day grouping does not shift with the server timezone. Never group by `eatenAt`.
- All reads go through `src/lib/dal.ts`; it is `server-only` and calls `verifySession()` first. Imports/updates of `foods` go through `importProduct()` in `src/lib/foods.ts`.
- `getDaySummaries()` aggregates in SQL with `quantityG / 100` as the scaling factor, filtered on `userId`. Keep the arithmetic in SQL, not in JS.
- `npx drizzle-kit migrate` does **not** create the `data/` directory; `src/db/index.ts` does, but the CLI needs it to already exist.

### SQLite rebuilds in migrations

`drizzle-kit generate` prompts for a TTY as soon as a migration adds a column, so it cannot run from a script here — use `drizzle-kit generate --custom --name <x>` and write the SQL. Two SQLite rules then dictate the order of any rebuild:

- `DROP TABLE <parent>` performs an implicit `DELETE FROM`, so `ON DELETE CASCADE` wipes the children. Rebuild leaves first (`profiles`, `water_logs`), then a parent before its own child (`foods` before `entries`), and never drop a table that is still referenced.
- `PRAGMA foreign_keys` is ignored inside a transaction and drizzle migrates inside a `BEGIN`, so it cannot be used to make a rebuild safe. `PRAGMA legacy_alter_table=ON` *does* work in a transaction and stops SQLite from rewriting foreign keys on `ALTER TABLE ... RENAME TO`, which is what makes the rename-then-recreate order above legal.

`drizzle/0003_multi_user.sql` is the worked example. A hand-written migration also means the snapshot in `drizzle/meta/` is not updated, so check that a later `generate` still reports no changes before trusting it — `0004` exists only because `email` had to end up as a unique *index* (what `.unique()` means to Drizzle) rather than the table constraint `0003` wrote.

## Open Food Facts

`src/lib/openfoodfacts.ts`. Two different backends with two different shapes — this is deliberate, not redundancy:

- Single EAN: `world.openfoodfacts.org/api/v2/product/{code}.json`.
- Text search: **`search.openfoodfacts.org/search`**, which returns `hits` with `brands` as an **array**. The legacy `cgi/search.pl` returns `products` with `brands` as a string and answers 503 far more often; `extractHits()` accepts both shapes as a safety net.

OFF is a volunteer project and rate-limits hard, so `request()` retries 429/5xx three times with backoff. `/api/foods/search` always returns the local catalog alongside remote results, so an OFF outage degrades the page instead of breaking search. `BarcodeDetector` is Chromium-only; the `/foods` search box doubles as the manual barcode fallback.

## Profile and goals

`profiles` has one row per user and is keyed on `userId`, so it is a lookup like every other table. There is no weight history: the user chose a single current weight, so do not add a `weights` table unless asked.

`src/lib/goals.ts` is pure, framework-free and deliberately **not** `server-only`, so both the server pages and any client component can import it. It resolves each field independently — a manual override wins, and whatever is left is filled in by the formula only if the profile holds the inputs for it. That is why `DailyGoals` fields are `number | null` and `computeGoals()` never returns `null`:

- `null` means "no target known yet". It must not be collapsed to `0`: `GoalsPanel` treats `0` as "no target" and would render a full green bar.
- BMR is Mifflin-St Jeor (`10·kg + 6.25·cm − 5·age + 5/−161`), where `other` and an unset sex both use the `-78` midpoint. Inputs outside 25–300 kg, 100–250 cm or age 10–120 return `null` rather than a nonsense number.
- Calories floor at 1200 **only when computed**; a value the user typed is respected as entered, however low.
- Carbs are the remainder, `(kcal − protein·4 − fat·9) / 4`, floored at 0 so a large protein/fat override cannot produce a negative target.
- `computed` is true only when **all four** overrides are null. A single manual field makes it a mix, and the UI says "Valeurs personnalisées".
- The water target is **not** in the profile; `WaterTracker` still uses a hardcoded 8 glasses.

The suggestion line under the goal fields must name only the fields the formula could resolve (`suggestionText()` in the profile form) — it must never promise a number the app cannot compute.

## Editing this file

The `<!-- BEGIN/END:nextjs-agent-rules -->` markers are managed by Next.js: `next dev` upserts that block, and content outside the markers is preserved. Keep your guidance below `END:nextjs-agent-rules` and do not edit inside the block. `CLAUDE.md` is just `@AGENTS.md` and needs no changes.
