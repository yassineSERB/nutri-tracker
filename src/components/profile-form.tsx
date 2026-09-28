"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/actions";
import {
  ACTIVITY_LABELS,
  GOAL_MODE_LABELS,
  SEX_LABELS,
} from "@/lib/goals";
import {
  ACTIVITY_LEVELS,
  GOAL_MODES,
  SEXES,
  type Profile,
} from "@/db/schema";

function field(
  label: string,
  hint: string,
  input: React.ReactNode,
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      {input}
      <span className="text-xs text-black/45 dark:text-white/45">{hint}</span>
    </label>
  );
}

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

type Suggestion = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
} | null;

/** Only the fields the formula could actually resolve are named, so the hint
 *  never promises a number the app cannot yet compute. */
function suggestionText(suggested: Suggestion): string {
  if (!suggested?.kcal) {
    return "Renseigne ton sexe, ton année de naissance, ta taille et ton poids pour obtenir une suggestion.";
  }

  const parts = [`${suggested.kcal} kcal`];
  if (suggested.protein !== null) parts.push(`${suggested.protein} g de protéines`);
  if (suggested.carbs !== null) parts.push(`${suggested.carbs} g de glucides`);
  if (suggested.fat !== null) parts.push(`${suggested.fat} g de lipides`);

  return `Calcul recommandé : ${parts.join(", ")}.`;
}

function placeholder(value: number | null | undefined): string {
  return value === null || value === undefined ? "auto" : String(value);
}

export function ProfileForm({
  profile,
  suggested,
}: {
  profile: Profile;
  suggested: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateProfile,
    undefined,
  );

  const year = new Date().getFullYear();

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {field(
          "Sexe",
          "Utilisé par la formule de calcul des calories.",
          <select name="sex" defaultValue={profile.sex ?? ""} className={inputClass}>
            <option value="">Non renseigné</option>
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {SEX_LABELS[sex]}
              </option>
            ))}
          </select>,
        )}

        {field(
          "Année de naissance",
          "Nécessaire pour le calcul automatique.",
          <input
            name="birthYear"
            type="number"
            min="1900"
            max={year}
            defaultValue={profile.birthYear ?? ""}
            className={inputClass}
          />,
        )}

        {field(
          "Taille (cm)",
          "Entre 80 et 250 cm.",
          <input
            name="heightCm"
            type="number"
            min="80"
            max="250"
            defaultValue={profile.heightCm ?? ""}
            className={inputClass}
          />,
        )}

        {field(
          "Poids (kg)",
          "Utilisé pour les macros et l'IMC.",
          <input
            name="weightKg"
            type="number"
            step="0.1"
            min="25"
            max="300"
            defaultValue={profile.weightKg ?? ""}
            className={inputClass}
          />,
        )}

        {field(
          "Niveau d'activité",
          "Multiplie le métabolisme de base.",
          <select name="activity" defaultValue={profile.activity} className={inputClass}>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACTIVITY_LABELS[level]}
              </option>
            ))}
          </select>,
        )}

        {field(
          "Objectif",
          "Ajuste les calories calculées.",
          <select name="goalMode" defaultValue={profile.goalMode} className={inputClass}>
            {GOAL_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {GOAL_MODE_LABELS[mode]}
              </option>
            ))}
          </select>,
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
          Objectifs journaliers
        </h3>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {suggestionText(suggested)}
        </p>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Laisse un champ vide pour suivre la valeur calculée. Un chiffre le remplace.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          {field(
            "Calories (kcal)",
            "Automatique si vide.",
            <input
              name="kcalGoal"
              type="number"
              min="0"
              max="20000"
              defaultValue={profile.kcalGoal ?? ""}
              placeholder={placeholder(suggested?.kcal)}
              className={inputClass}
            />,
          )}
          {field(
            "Protéines (g)",
            "Automatique si vide.",
            <input
              name="proteinGoal"
              type="number"
              min="0"
              max="20000"
              defaultValue={profile.proteinGoal ?? ""}
              placeholder={placeholder(suggested?.protein)}
              className={inputClass}
            />,
          )}
          {field(
            "Glucides (g)",
            "Automatique si vide.",
            <input
              name="carbsGoal"
              type="number"
              min="0"
              max="20000"
              defaultValue={profile.carbsGoal ?? ""}
              placeholder={placeholder(suggested?.carbs)}
              className={inputClass}
            />,
          )}
          {field(
            "Lipides (g)",
            "Automatique si vide.",
            <input
              name="fatGoal"
              type="number"
              min="0"
              max="20000"
              defaultValue={profile.fatGoal ?? ""}
              placeholder={placeholder(suggested?.fat)}
              className={inputClass}
            />,
          )}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state?.error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
        {state?.message && (
          <span className="text-sm text-black/60 dark:text-white/60">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
