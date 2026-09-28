import type { DayTotals } from "@/lib/dal";
import type { DailyGoals } from "@/lib/goals";
import { GLASS_ML } from "@/lib/dal";

function Bar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  // A target of zero would divide by zero, and a missing goal must not look
  // like a completed one.
  const hasTarget = target > 0;
  const ratio = hasTarget ? Math.min(1, value / target) : 0;
  const reached = hasTarget && value >= target;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-black/70 dark:text-white/70">{label}</span>
        <span className="tabular-nums">
          <span className="font-medium">{Math.round(value)}</span>
          <span className="text-black/50 dark:text-white/50">
            {" "}
            / {hasTarget ? target : "—"} {unit}
          </span>
        </span>
      </div>

      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
        role="img"
        aria-label={
          hasTarget
            ? `${Math.round(value)} ${unit} sur ${target}, ${Math.round(ratio * 100)} %`
            : `${Math.round(value)} ${unit}, aucun objectif`
        }
      >
        <div
          className={`h-full rounded-full transition-[width] ${
            reached ? "bg-emerald-500" : "bg-foreground"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function GoalsPanel({
  totals,
  waterGlasses,
  goals,
  waterGoalGlasses = 8,
}: {
  totals: DayTotals;
  waterGlasses: number;
  goals: DailyGoals;
  waterGoalGlasses?: number;
}) {
  return (
    <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
          Objectifs du jour
        </h2>
        <span className="text-xs text-black/50 dark:text-white/50">
          {goals?.kcal
            ? goals.computed
              ? "Valeurs calculées depuis ton profil"
              : "Valeurs personnalisées"
            : "Aucun objectif : complète ton profil"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Bar label="Calories" value={totals.kcal} target={goals.kcal ?? 0} unit="kcal" />
        <Bar label="Protéines" value={totals.protein} target={goals.protein ?? 0} unit="g" />
        <Bar label="Glucides" value={totals.carbs} target={goals.carbs ?? 0} unit="g" />
        <Bar label="Lipides" value={totals.fat} target={goals.fat ?? 0} unit="g" />
        <Bar
          label="Eau"
          value={waterGlasses * GLASS_ML}
          target={waterGoalGlasses * GLASS_ML}
          unit="ml"
        />
      </div>
    </section>
  );
}
