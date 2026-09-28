import { logWater } from "@/app/actions";
import { GLASS_ML } from "@/lib/dal";

/** Number of glasses to drink in a day. 8 x 250 ml is the usual French
 *  recommendation, and a local default avoids adding a settings table for a
 *  single value. */
export const DAILY_GOAL_GLASSES = 8;

export function WaterTracker({
  dayKey,
  glasses,
}: {
  dayKey: string;
  glasses: number;
}) {
  const goal = DAILY_GOAL_GLASSES;
  const remaining = Math.max(0, goal - glasses);
  const done = Math.min(goal, glasses);
  const reached = glasses >= goal;

  return (
    <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Eau
          </h2>
          <p className="mt-1 text-sm">
            <span className="text-2xl font-semibold tabular-nums">{glasses}</span>
            <span className="text-black/50 dark:text-white/50"> / {goal} verres</span>
            <span className="ml-2 text-black/50 dark:text-white/50">
              ({glasses * GLASS_ML} ml)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={logWater}>
            <input type="hidden" name="dayKey" value={dayKey} />
            <input type="hidden" name="delta" value="-1" />
            <button
              type="submit"
              disabled={glasses === 0}
              aria-label="Retirer un verre d'eau"
              className="h-10 w-10 rounded-md border border-black/15 text-lg disabled:opacity-30 dark:border-white/20"
            >
              −
            </button>
          </form>

          <form action={logWater}>
            <input type="hidden" name="dayKey" value={dayKey} />
            <input type="hidden" name="delta" value="1" />
            <button
              type="submit"
              aria-label="Ajouter un verre d'eau"
              className="h-10 w-24 rounded-md bg-foreground text-sm text-background"
            >
              + 1 verre
            </button>
          </form>
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1"
        role="img"
        aria-label={`${glasses} verres sur ${goal}, ${remaining} restants`}
      >
        {Array.from({ length: goal }, (_, i) => (
          <span
            key={i}
            className={`h-6 w-6 rounded-full border-2 ${
              i < done
                ? "border-sky-500 bg-sky-500/70"
                : "border-sky-500/40 bg-transparent"
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
        {reached
          ? "Objectif atteint pour aujourd'hui."
          : `Encore ${remaining} verre${remaining > 1 ? "s" : ""} (${remaining * GLASS_ML} ml).`}
      </p>
    </section>
  );
}
