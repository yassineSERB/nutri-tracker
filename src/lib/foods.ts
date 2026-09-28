import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { foods } from "@/db/schema";

/** Normalized product shape, as stored in the `foods` table and submitted by
 *  the catalog forms. */
export const foodPayloadSchema = z.object({
  barcode: z.string().nullable(),
  name: z.string().min(1).max(200),
  brand: z.string().nullable(),
  kcalPer100g: z.number().nonnegative().max(1000),
  proteinPer100g: z.number().nonnegative().max(1000),
  carbsPer100g: z.number().nonnegative().max(1000),
  fatPer100g: z.number().nonnegative().max(1000),
  source: z.enum(["openfoodfacts", "manual"]),
});

export type FoodPayload = z.infer<typeof foodPayloadSchema>;

/**
 * Inserts the product for `userId`, or refreshes the existing row when that same
 * user already has that barcode. Nutrition data for a given EAN does not drift,
 * so scanning the same product twice is idempotent — but the catalog is private,
 * so two users importing the same EAN get two rows.
 */
export function importProduct(userId: number, product: FoodPayload): number {
  if (product.barcode) {
    const existing = db
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.barcode, product.barcode), eq(foods.userId, userId)))
      .get();

    if (existing) {
      db.update(foods)
        .set({
          name: product.name,
          brand: product.brand,
          kcalPer100g: product.kcalPer100g,
          proteinPer100g: product.proteinPer100g,
          carbsPer100g: product.carbsPer100g,
          fatPer100g: product.fatPer100g,
        })
        .where(eq(foods.id, existing.id))
        .run();
      return existing.id;
    }
  }

  return db
    .insert(foods)
    .values({ ...product, userId })
    .returning({ id: foods.id })
    .get().id;
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
