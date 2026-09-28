import type { DayTotals } from "@/lib/dal";

function macro(label: string, value: number, unit = "g") {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">
        {Math.round(value)}
        <span className="ml-0.5 text-sm font-normal text-black/50 dark:text-white/50">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function TotalsGrid({ totals }: { totals: DayTotals }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-4 dark:border-white/15">
      {macro("Calories", totals.kcal, "kcal")}
      {macro("Protéines", totals.protein)}
      {macro("Glucides", totals.carbs)}
      {macro("Lipides", totals.fat)}
    </div>
  );
}
