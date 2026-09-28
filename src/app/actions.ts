"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  ACTIVITY_LEVELS,
  entries,
  foods,
  GOAL_MODES,
  MEAL_TYPES,
  SEXES,
} from "@/db/schema";
import {
  addWater,
  currentUserId,
  deleteBloodPanel,
  saveBloodResults,
  saveProfile,
  verifySession,
} from "@/lib/dal";
import {
  foodPayloadSchema,
  importProduct,
  safeJsonParse,
} from "@/lib/foods";

export type ActionState = { error?: string; message?: string } | undefined;

const entrySchema = z.object({
  foodId: z.coerce.number().int().positive(),
  mealType: z.enum(MEAL_TYPES),
  quantityG: z.coerce.number().positive().max(5000),
  eatenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().max(200).optional(),
});

export async function addEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = entrySchema.safeParse({
    foodId: formData.get("foodId"),
    mealType: formData.get("mealType"),
    quantityG: formData.get("quantityG"),
    eatenOn: formData.get("eatenOn"),
    time: formData.get("time"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Entrée invalide." };
  }

  const { foodId, mealType, quantityG, eatenOn, time, note } = parsed.data;

  const userId = await currentUserId();

  // Ownership is checked on the food, not just on the id, so a form cannot log
  // someone else's product.
  const food = db
    .select({ id: foods.id })
    .from(foods)
    .where(and(eq(foods.id, foodId), eq(foods.userId, userId)))
    .get();

  if (!food) {
    return { error: "Aliment introuvable." };
  }

  const [hours, minutes] = time.split(":").map(Number);
  const eatenAt = new Date(`${eatenOn}T00:00:00`);
  eatenAt.setHours(hours, minutes, 0, 0);

  db.insert(entries)
    .values({
      userId,
      foodId,
      mealType,
      quantityG,
      eatenAt: eatenAt.toISOString(),
      eatenOn,
      note: note?.trim() || null,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/history");
  return { message: "Entrée ajoutée." };
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const userId = await currentUserId();

  const parsed = z.coerce.number().int().positive().safeParse(formData.get("id"));
  if (!parsed.success) return;

  db.delete(entries)
    .where(and(eq(entries.id, parsed.data), eq(entries.userId, userId)))
    .run();

  revalidatePath("/");
  revalidatePath("/history");
}

/** Saves a product the user picked from the Open Food Facts results, or typed
 *  by hand. */
export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();

  const raw = formData.get("product");
  const parsed = foodPayloadSchema.safeParse(
    typeof raw === "string" ? safeJsonParse(raw) : null,
  );

  if (!parsed.success) {
    return { error: "Produit invalide." };
  }

  importProduct(userId, parsed.data);
  revalidatePath("/foods");
  revalidatePath("/");
  return { message: `${parsed.data.name} ajouté à ton catalogue.` };
}

const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

/**
 * A bound the form left blank is "the lab printed none", which is null and not
 * zero: zero would be a real, if very low, limit.
 *
 * The empty string is listed *before* `z.coerce.number()` on purpose. Coercion
 * accepts `null` and turns it into `0`, which would silently record "LDL has a
 * lower bound of 0" and flag every result as out of range; keeping the
 * literals first means the transform below only ever sees them as null.
 */
const labBound = z
  .union([z.literal(""), z.literal(null), z.coerce.number().finite()])
  .transform((v) => (v === "" || v === null ? null : (v as number)))
  .refine((v) => v === null || Math.abs(v) < 1e6, "Borne de référence invalide");

const bloodResultSchema = z.object({
  analyte: z.string().min(1).max(40),
  value: z.coerce.number().finite(),
  unit: z.string().min(1).max(20),
  refLow: labBound,
  refHigh: labBound,
  note: z
    .union([z.literal(""), z.literal(null), z.string().max(200)])
    .transform((v) => (v === "" || v === null ? null : v)),
});

const bloodPanelSchema = z.object({
  testOn: dayKeySchema,
  results: z.array(bloodResultSchema).max(60),
});

/**
 * Stores a whole panel for one date. Blank analytes are dropped client-side, so
 * anything arriving here is a measurement the user actually filled in. Saving an
 * existing date replaces it, which is how a mistyped value is corrected.
 */
export async function saveBloodPanel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get("panel");
  const parsed = bloodPanelSchema.safeParse(
    typeof raw === "string" ? safeJsonParse(raw) : null,
  );

  if (!parsed.success) {
    return { error: "Panneau invalide." };
  }

  const { testOn, results } = parsed.data;

  if (results.length === 0) {
    return { error: "Renseigne au moins une valeur." };
  }

  await saveBloodResults(testOn, results);
  revalidatePath("/analyses");

  return {
    message:
      results.length === 1
        ? "1 valeur enregistrée."
        : `${results.length} valeurs enregistrées.`,
  };
}

export async function removeBloodPanel(formData: FormData): Promise<void> {
  const testOn = dayKeySchema.safeParse(formData.get("testOn"));
  if (!testOn.success) return;

  await deleteBloodPanel(testOn.data);
  revalidatePath("/analyses");
}
/** Empty input means "no override", not zero: the form sends "" for a cleared
 *  goal and the column goes back to null so the formula takes over again. */
const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().min(0).max(20000).nullable());

const optionalYear = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().min(1900).max(new Date().getFullYear()).nullable());

const optionalHeight = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().min(80).max(250).nullable());

const optionalWeight = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().min(25).max(300).nullable());

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = z
    .object({
      sex: z.enum(SEXES).nullable().catch(null),
      birthYear: optionalYear,
      heightCm: optionalHeight,
      weightKg: optionalWeight,
      activity: z.enum(ACTIVITY_LEVELS),
      goalMode: z.enum(GOAL_MODES),
      kcalGoal: optionalNumber,
      proteinGoal: optionalNumber,
      carbsGoal: optionalNumber,
      fatGoal: optionalNumber,
    })
    .safeParse({
      sex: formData.get("sex") || null,
      birthYear: formData.get("birthYear") ?? "",
      heightCm: formData.get("heightCm") ?? "",
      weightKg: formData.get("weightKg") ?? "",
      activity: formData.get("activity"),
      goalMode: formData.get("goalMode"),
      kcalGoal: formData.get("kcalGoal") ?? "",
      proteinGoal: formData.get("proteinGoal") ?? "",
      carbsGoal: formData.get("carbsGoal") ?? "",
      fatGoal: formData.get("fatGoal") ?? "",
    });

  if (!parsed.success) {
    return { error: "Profil invalide : vérifie les valeurs saisies." };
  }

  await saveProfile(parsed.data);

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { message: "Profil enregistré." };
}

/** Plain form action, not `useActionState`: the buttons carry their own
 *  `dayKey` and `delta` so the same action serves add and remove. */
export async function logWater(formData: FormData): Promise<void> {
  await verifySession();

  const dayKey = dayKeySchema.safeParse(formData.get("dayKey"));
  const delta = z.coerce.number().int().safeParse(formData.get("delta"));
  if (!dayKey.success || !delta.success) return;

  await addWater(dayKey.data, delta.data);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

export async function saveManualFood(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();

  const parsed = foodPayloadSchema.safeParse({
    barcode: (formData.get("barcode") as string)?.trim() || null,
    name: formData.get("name"),
    brand: (formData.get("brand") as string)?.trim() || null,
    kcalPer100g: formData.get("kcalPer100g"),
    proteinPer100g: formData.get("proteinPer100g") || 0,
    carbsPer100g: formData.get("carbsPer100g") || 0,
    fatPer100g: formData.get("fatPer100g") || 0,
    source: "manual",
  });

  if (!parsed.success) {
    return { error: "Aliment invalide." };
  }

  importProduct(userId, parsed.data);
  revalidatePath("/foods");
  revalidatePath("/");
  return { message: "Aliment enregistré." };
}
