"use client";

import { useActionState } from "react";
import { addEntry, type ActionState } from "@/app/actions";
import { MEAL_LABELS, MEAL_TYPES } from "@/db/schema";

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function AddEntryForm({
  foods,
  dayKey,
}: {
  foods: { id: number; name: string; brand: string | null }[];
  dayKey: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addEntry,
    undefined,
  );

  if (foods.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/60 dark:border-white/25 dark:text-white/60">
        Ton catalogue est vide. Ajoute un aliment depuis la page{" "}
        <a href="/foods" className="underline">
          Aliments
        </a>{" "}
        avant de pouvoir enregistrer un repas.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Aliment</span>
          <select
            name="foodId"
            required
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          >
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.brand ? `${food.brand} — ` : ""}
                {food.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-28 flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Quantité (g)</span>
          <input
            name="quantityG"
            type="number"
            min="1"
            max="5000"
            step="1"
            defaultValue="100"
            required
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex w-40 flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Repas</span>
          <select
            name="mealType"
            defaultValue="lunch"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          >
            {MEAL_TYPES.map((meal) => (
              <option key={meal} value={meal}>
                {MEAL_LABELS[meal]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-28 flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Heure</span>
          <input
            name="time"
            type="time"
            defaultValue={currentTime()}
            required
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
      </div>

      <input type="hidden" name="eatenOn" value={dayKey} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Ajouter"}
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
