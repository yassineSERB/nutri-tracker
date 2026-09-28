import { deleteEntry } from "@/app/actions";
import { formatTime } from "@/lib/date";
import { MEAL_LABELS, MEAL_TYPES } from "@/db/schema";
import type { EntryWithFood } from "@/lib/dal";

function DeleteButton({ id }: { id: number }) {
  return (
    <form action={deleteEntry}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Supprimer l'entrée"
        className="rounded px-2 py-1 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
      >
        ✕
      </button>
    </form>
  );
}

export function EntryList({ entries }: { entries: EntryWithFood[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/60 dark:border-white/25 dark:text-white/60">
        Rien d&apos;enregistré pour cette journée.
      </p>
    );
  }

  return (
    <>
      {MEAL_TYPES.map((meal) => {
        const group = entries.filter((row) => row.entry.mealType === meal);
        if (group.length === 0) return null;

        const kcal = group.reduce(
          (sum, { entry, food }) => sum + food.kcalPer100g * (entry.quantityG / 100),
          0,
        );

        return (
          <section key={meal}>
            <div className="mt-8 mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                {MEAL_LABELS[meal]}
              </h2>
              <span className="text-sm tabular-nums text-black/50 dark:text-white/50">
                {Math.round(kcal)} kcal
              </span>
            </div>

            <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
              {group.map(({ entry, food }) => {
                const ratio = entry.quantityG / 100;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {food.brand ? `${food.brand} — ` : ""}
                        {food.name}
                      </div>
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {formatTime(entry.eatenAt)} · {entry.quantityG} g
                        {entry.note ? ` · ${entry.note}` : ""}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right text-sm tabular-nums">
                        <div>{Math.round(food.kcalPer100g * ratio)} kcal</div>
                        <div className="text-xs text-black/50 dark:text-white/50">
                          P {Math.round(food.proteinPer100g * ratio)} · G{" "}
                          {Math.round(food.carbsPer100g * ratio)} · L{" "}
                          {Math.round(food.fatPer100g * ratio)}
                        </div>
                      </div>
                      <DeleteButton id={entry.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
