import {
  ACTIVITY_LEVELS,
  GOAL_MODES,
  SEXES,
  type ActivityLevel,
  type GoalMode,
  type Profile,
  type Sex,
} from "@/db/schema";

/** Multipliers applied to the resting metabolic rate. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

/** Daily calorie adjustment for the goal mode, on top of maintenance. */
export const GOAL_ADJUSTMENTS: Record<GoalMode, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

/** Protein and fat are set from weight, carbs take whatever is left so the
 *  three macros always add up to the calorie target. */
export const PROTEIN_G_PER_KG = 1.6;
export const FAT_G_PER_KG = 0.8;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire (peu ou pas de sport)",
  light: "Légère (1 à 3 séances par semaine)",
  moderate: "Modérée (3 à 5 séances par semaine)",
  active: "Active (6 à 7 séances par semaine)",
  athlete: "Athlète (2 séances ou plus par jour)",
};

export const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  lose: "Perdre du poids",
  maintain: "Maintenir",
  gain: "Prendre du poids",
};

export const SEX_LABELS: Record<Sex, string> = {
  female: "Femme",
  male: "Homme",
};

/** A null field means "no target known yet", not zero: the user has not
 *  supplied the input the formula needs, and no override either. */
export type DailyGoals = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** True only when nothing at all was overridden. */
  computed: boolean;
};

export function ageFrom(birthYear: number | null | undefined, now = new Date()): number | null {
  if (!birthYear) return null;
  const age = now.getFullYear() - birthYear;
  return age >= 10 && age <= 120 ? age : null;
}

export function bmiFrom(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm < 80) return null;
  const metres = heightCm / 100;
  return weightKg / (metres * metres);
}

export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Insuffisance pondérale";
  if (bmi < 25) return "Poids normal";
  if (bmi < 30) return "Surpoids";
  return "Obésité";
}

/**
 * Mifflin-St Jeor for the resting rate, times an activity factor, adjusted for
 * the goal. Returns null when a field needed by the formula is missing, so the
 * UI can prompt instead of inventing a number.
 */
export function restingKcal(profile: Profile, now = new Date()): number | null {
  const age = ageFrom(profile.birthYear, now);
  if (!age || !profile.heightCm || !profile.weightKg) return null;
  if (profile.heightCm < 100 || profile.heightCm > 250) return null;
  if (profile.weightKg < 25 || profile.weightKg > 300) return null;

  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  // The published constant is +5 for men and -161 for women. An unset sex uses
  // the midpoint of the two, which is the most defensible default without
  // another input.
  const offset = profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  return base + offset;
}

/**
 * Each field is resolved on its own: a user override always wins, and whatever
 * is left is filled in by the formula when the profile has the inputs for it.
 * This is why a partial profile still shows the goals it does have — including
 * the case where the user typed targets by hand and left the rest blank.
 */
export function computeGoals(profile: Profile, now = new Date()): DailyGoals {
  const resting = restingKcal(profile, now);

  // The 1200 floor protects the computed value; an explicit override is
  // respected as typed, however low.
  const kcal =
    profile.kcalGoal ??
    (resting === null
      ? null
      : Math.max(
          1200,
          Math.round(resting * ACTIVITY_FACTORS[profile.activity] + GOAL_ADJUSTMENTS[profile.goalMode]),
        ));

  const protein =
    profile.proteinGoal ??
    (profile.weightKg ? Math.round(profile.weightKg * PROTEIN_G_PER_KG) : null);

  const fat =
    profile.fatGoal ??
    (profile.weightKg ? Math.round(profile.weightKg * FAT_G_PER_KG) : null);

  // Carbs take the remainder so the macros add up to the calorie target. The
  // floor keeps a large protein/fat override from producing a negative value.
  const carbs =
    profile.carbsGoal ??
    (kcal === null
      ? null
      : Math.max(0, Math.round((kcal - (protein ?? 0) * 4 - (fat ?? 0) * 9) / 4)));

  return {
    kcal,
    protein,
    carbs,
    fat,
    computed:
      profile.kcalGoal === null &&
      profile.proteinGoal === null &&
      profile.carbsGoal === null &&
      profile.fatGoal === null,
  };
}

export { ACTIVITY_LEVELS, GOAL_MODES, SEXES };
