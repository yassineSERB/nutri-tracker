"use client";

import { useActionState } from "react";
import { saveManualFood, type ActionState } from "@/app/actions";

function Field({
  name,
  label,
  type = "text",
  required,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/60 dark:text-white/60">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
    </label>
  );
}

/** Escape hatch for home cooking, which barcodes cannot cover. */
export function ManualFoodForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveManualFood,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-black/60 dark:text-white/60">
        Ajout manuel — les valeurs sont pour 100 g.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Nom" required />
        <Field name="brand" label="Marque (optionnel)" />
        <Field name="kcalPer100g" label="Calories (kcal)" type="number" step="0.1" required />
        <Field name="proteinPer100g" label="Protéines (g)" type="number" step="0.1" />
        <Field name="carbsPer100g" label="Glucides (g)" type="number" step="0.1" />
        <Field name="fatPer100g" label="Lipides (g)" type="number" step="0.1" />
        <Field name="barcode" label="Code-barres (optionnel)" />
      </div>

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
