import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Real accounts: registration is open, so every other table is owned by a user
 * and every read is filtered on `userId`. `email` is stored lowercased and
 * unique, which is what makes it the login identifier.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  snack: "Goûter",
  dinner: "Dîner",
};

export const FOOD_SOURCES = ["openfoodfacts", "manual"] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/**
 * Nutritional values are always stored per 100 g so that quantities in grams
 * can change without rewriting the macros. A product imported by two users is
 * two rows: the catalog is private, not shared.
 */
export const foods = sqliteTable(
  "foods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    barcode: text("barcode"),
    source: text("source", { enum: FOOD_SOURCES })
      .notNull()
      .default("manual"),
    kcalPer100g: real("kcal_per_100g").notNull(),
    proteinPer100g: real("protein_per_100g").notNull().default(0),
    carbsPer100g: real("carbs_per_100g").notNull().default(0),
    fatPer100g: real("fat_per_100g").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("foods_user_id_idx").on(table.userId)],
);

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /**
     * Redundant with `foodId` on purpose: the owner is stored on the row itself
     * so that deleting an entry never depends on a join, and so a stray
     * `foodId` from another user cannot be logged.
     */
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    mealType: text("meal_type", { enum: MEAL_TYPES }).notNull(),
    quantityG: real("quantity_g").notNull(),
    /** Full ISO timestamp, for ordering within a day. */
    eatenAt: text("eaten_at").notNull(),
    /**
     * Local calendar day as `YYYY-MM-DD`. Kept alongside `eatenAt` so that
     * grouping by day stays correct regardless of the server timezone.
     */
    eatenOn: text("eaten_on").notNull(),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("entries_eaten_on_idx").on(table.eatenOn),
    index("entries_food_id_idx").on(table.foodId),
    index("entries_user_id_idx").on(table.userId),
  ],
);


export const SEXES = ["female", "male", "other"] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "athlete",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOAL_MODES = ["lose", "maintain", "gain"] as const;
export type GoalMode = (typeof GOAL_MODES)[number];

/** One row per user: the primary key *is* the owner, so a missing row simply
 *  means the user has not filled their profile in yet. */
export const profiles = sqliteTable("profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex", { enum: SEXES }),
  birthYear: integer("birth_year"),
  heightCm: integer("height_cm"),
  weightKg: real("weight_kg"),
  activity: text("activity", { enum: ACTIVITY_LEVELS })
    .notNull()
    .default("sedentary"),
  goalMode: text("goal_mode", { enum: GOAL_MODES })
    .notNull()
    .default("maintain"),
  /**
   * Nullable on purpose: a null goal means "follow the computed value", which is
   * what happens until the user overrides it. Emptying the field clears the
   * override and hands control back to the formula.
   */
  kcalGoal: integer("kcal_goal"),
  proteinGoal: integer("protein_goal"),
  carbsGoal: integer("carbs_goal"),
  fatGoal: integer("fat_goal"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/** One row per user per day, so a glass can be added or removed without an
 *  audit trail. `dayKey` is the same local `YYYY-MM-DD` used by
 *  `entries.eatenOn`, which is why the primary key is the pair. */
export const waterLogs = sqliteTable(
  "water_logs",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(),
    glasses: integer("glasses").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dayKey] })],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
