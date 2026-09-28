import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  bloodResults,
  entries,
  foods,
  profiles,
  waterLogs,
  type Entry,
  type Food,
  type MealType,
  type Profile,
} from "@/db/schema";
import { MEAL_LABELS, MEAL_TYPES } from "@/db/schema";
import { analyteByCode } from "@/lib/lab";

/**
 * Data Access Layer. Every read of user data goes through here so that the
 * session is verified at the source rather than in each page. Proxy gives the
 * optimistic redirect; this is the authoritative check.
 */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
});

/**
 * The owner key for every query in this file. Registration is open and the
 * catalog is private, so a missing `id` here must never be treated as "no
 * filter": it throws instead of leaking every row in the table.
 */
export async function currentUserId(): Promise<number> {
  const session = await verifySession();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) {
    throw new Error("Session sans identifiant utilisateur.");
  }
  return id;
}

export type EntryWithFood = { entry: Entry; food: Food };

export type DayTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  itemCount: number;
};

export async function getEntriesForDay(dayKey: string): Promise<EntryWithFood[]> {
  const userId = await currentUserId();

  return db
    .select({ entry: entries, food: foods })
    .from(entries)
    .innerJoin(foods, eq(entries.foodId, foods.id))
    .where(and(eq(entries.userId, userId), eq(entries.eatenOn, dayKey)))
    .orderBy(entries.eatenAt);
}

export function totalsFor(list: EntryWithFood[]): DayTotals {
  return list.reduce<DayTotals>(
    (acc, { entry, food }) => {
      const ratio = entry.quantityG / 100;
      acc.kcal += food.kcalPer100g * ratio;
      acc.protein += food.proteinPer100g * ratio;
      acc.carbs += food.carbsPer100g * ratio;
      acc.fat += food.fatPer100g * ratio;
      acc.itemCount += 1;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, itemCount: 0 },
  );
}

export type DaySummary = {
  dayKey: string;
  totals: DayTotals;
};

/** Aggregates in SQL: one row per day, only for days that have entries. The
 *  `quantityG / 100` factor converts per-100 g values to the served amount. */
export async function getDaySummaries(limit = 30): Promise<DaySummary[]> {
  const userId = await currentUserId();

  const rows = await db
    .select({
      dayKey: entries.eatenOn,
      kcal: sql<number>`sum(${foods.kcalPer100g} * ${entries.quantityG} / 100.0)`,
      protein: sql<number>`sum(${foods.proteinPer100g} * ${entries.quantityG} / 100.0)`,
      carbs: sql<number>`sum(${foods.carbsPer100g} * ${entries.quantityG} / 100.0)`,
      fat: sql<number>`sum(${foods.fatPer100g} * ${entries.quantityG} / 100.0)`,
      itemCount: sql<number>`count(*)`,
    })
    .from(entries)
    .innerJoin(foods, eq(entries.foodId, foods.id))
    .where(eq(entries.userId, userId))
    .groupBy(entries.eatenOn)
    .orderBy(desc(entries.eatenOn))
    .limit(limit);

  return rows.map((row) => ({
    dayKey: row.dayKey,
    totals: {
      kcal: row.kcal,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      itemCount: row.itemCount,
    },
  }));
}

export async function getFoodById(id: number): Promise<Food | undefined> {
  const userId = await currentUserId();
  return db.query.foods.findFirst({ where: and(eq(foods.id, id), eq(foods.userId, userId)) });
}

/** Scoped to the caller, so a guessed id from another account resolves to
 *  nothing rather than to that account's product. */
export async function getFoodsByIds(ids: number[]): Promise<Food[]> {
  const userId = await currentUserId();
  if (ids.length === 0) return [];
  return db
    .select()
    .from(foods)
    .where(and(inArray(foods.id, ids), eq(foods.userId, userId)));
}

/** Looks up a food already imported from Open Food Facts by barcode, so a
 *  second scan of the same product reuses the existing row. */
export async function findFoodByBarcode(barcode: string): Promise<Food | undefined> {
  const userId = await currentUserId();
  return db.query.foods.findFirst({
    where: and(eq(foods.barcode, barcode), eq(foods.userId, userId)),
  });
}

export async function listSavedFoods(search: string, limit = 25): Promise<Food[]> {
  const userId = await currentUserId();
  const term = search.trim();
  return db
    .select()
    .from(foods)
    .where(
      and(
        eq(foods.userId, userId),
        term ? or(like(foods.name, `%${term}%`), like(foods.brand, `%${term}%`)) : undefined,
      ),
    )
    .orderBy(foods.name)
    .limit(limit);
}

/** Volume of one glass, in millilitres. The whole UI counts glasses, not ml. */
export const GLASS_ML = 250;

export type WaterDay = { dayKey: string; glasses: number };

/** Defaults to zero: a day with no row simply has no water logged. */
export async function getWaterForDay(dayKey: string): Promise<WaterDay> {
  const userId = await currentUserId();
  const row = db
    .select({ glasses: waterLogs.glasses })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.dayKey, dayKey)))
    .get();
  return { dayKey, glasses: row?.glasses ?? 0 };
}

/**
 * `glasses` can go negative from concurrent clicks, so the floor is enforced
 * in SQL rather than trusted from the form.
 */
export async function addWater(
  dayKey: string,
  delta: number,
): Promise<WaterDay> {
  const userId = await currentUserId();
  const bounded = Math.max(-20, Math.min(20, Math.trunc(delta)));

  db.insert(waterLogs)
    .values({
      userId,
      dayKey,
      // No previous row exists in this branch, so the starting value is just
      // the delta. Referencing the column here is not valid SQL.
      glasses: Math.max(0, bounded),
    })
    .onConflictDoUpdate({
      target: [waterLogs.userId, waterLogs.dayKey],
      set: {
        // Here the existing row is visible, and `max(0, …)` keeps the count
        // from going negative when more removals than additions are posted.
        glasses: sql`max(0, ${waterLogs.glasses} + ${bounded})`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .run();

  return getWaterForDay(dayKey);
}

export { MEAL_LABELS, MEAL_TYPES };
export type { MealType };

/** One saved measurement, plus the label the UI needs. */
export type BloodResultView = {
  id: number;
  testOn: string;
  analyte: string;
  label: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  note: string | null;
};

export type BloodPanel = {
  testOn: string;
  results: BloodResultView[];
};

/** How many past panels the page shows. */
const PANEL_LIMIT = 24;

/**
 * Panels newest first, each carrying every row that shares its `testOn`. The
 * rows are fetched once and grouped in JS: the count of panels is the only thing
 * that would justify a second query, and the whole table is a few dozen rows per
 * user.
 */
export async function getBloodPanels(): Promise<BloodPanel[]> {
  const userId = await currentUserId();

  const rows = db
    .select({
      id: bloodResults.id,
      testOn: bloodResults.testOn,
      analyte: bloodResults.analyte,
      value: bloodResults.value,
      unit: bloodResults.unit,
      refLow: bloodResults.refLow,
      refHigh: bloodResults.refHigh,
      note: bloodResults.note,
    })
    .from(bloodResults)
    .where(eq(bloodResults.userId, userId))
    .orderBy(desc(bloodResults.testOn), asc(bloodResults.id))
    .all();

  const byDate = new Map<string, BloodResultView[]>();
  for (const row of rows) {
    const list = byDate.get(row.testOn) ?? [];
    list.push({ ...row, label: analyteByCode(row.analyte)?.label ?? row.analyte });
    byDate.set(row.testOn, list);
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, PANEL_LIMIT)
    .map(([testOn, results]) => ({ testOn, results }));
}

/** The analytes already measured on a date, for prefilling the form. */
export async function getBloodPanelForDate(dayKey: string): Promise<BloodResultView[]> {
  const panels = await getBloodPanels();
  return panels.find((panel) => panel.testOn === dayKey)?.results ?? [];
}

export type BloodInput = {
  analyte: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  note: string | null;
};

/**
 * One panel per date: saving a date that already exists replaces it, so a
 * mis-typed value is corrected by resending the same date rather than piling up
 * a second set of rows. Rows are removed by `userId` **and** `testOn`, never by
 * date alone, or this would delete another account's panel.
 */
export async function saveBloodResults(dayKey: string, inputs: BloodInput[]): Promise<number> {
  const userId = await currentUserId();

  db.transaction(() => {
    db.delete(bloodResults)
      .where(and(eq(bloodResults.userId, userId), eq(bloodResults.testOn, dayKey)))
      .run();

    if (inputs.length === 0) return;

    db.insert(bloodResults)
      .values(inputs.map((input) => ({ ...input, userId, testOn: dayKey })))
      .run();
  });

  return inputs.length;
}

export async function deleteBloodPanel(dayKey: string): Promise<void> {
  const userId = await currentUserId();

  db.delete(bloodResults)
    .where(and(eq(bloodResults.userId, userId), eq(bloodResults.testOn, dayKey)))
    .run();
}

const PROFILE_DEFAULTS = {
  sex: null,
  birthYear: null,
  heightCm: null,
  weightKg: null,
  activity: "sedentary",
  goalMode: "maintain",
  kcalGoal: null,
  proteinGoal: null,
  carbsGoal: null,
  fatGoal: null,
} satisfies Omit<Profile, "userId" | "updatedAt">;

/** Never null: a default row stands in until the user fills anything in. */
export async function getProfile(): Promise<Profile> {
  const userId = await currentUserId();
  const row = db.select().from(profiles).where(eq(profiles.userId, userId)).get();
  return row ?? { ...PROFILE_DEFAULTS, userId, updatedAt: "" };
}

/** Passing null for a goal clears the override, handing it back to the formula. */
export async function saveProfile(values: Partial<Profile>): Promise<Profile> {
  const userId = await currentUserId();

  db.insert(profiles)
    .values({ ...PROFILE_DEFAULTS, ...values, userId })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
    })
    .run();

  return getProfile();
}
