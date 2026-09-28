import { formatDayLabel } from "@/lib/date";
import type { BloodPanel } from "@/lib/dal";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  formatRange,
  labStatus,
} from "@/lib/lab";
import { removeBloodPanel } from "@/app/actions";

function StatusBadge({
  value,
  refLow,
  refHigh,
}: {
  value: number;
  refLow: number | null;
  refHigh: number | null;
}) {
  const status = labStatus(value, refLow, refHigh);

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Past panels, newest first, each with the bounds that were recorded with it. */
export function BloodPanelList({ panels }: { panels: BloodPanel[] }) {
  if (panels.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        Aucun bilan enregistré. Saisis un premier prélèvement ci-dessus.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {panels.map((panel) => (
        <section
          key={panel.testOn}
          className="rounded-lg border border-black/10 dark:border-white/15"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/15">
            <div>
              <h3 className="font-semibold capitalize">
                {formatDayLabel(panel.testOn)}
              </h3>
              <p className="text-xs text-black/50 dark:text-white/50">
                {panel.results.length}{" "}
                {panel.results.length === 1 ? "analyse" : "analyses"}
              </p>
            </div>
            <form action={removeBloodPanel}>
              <input type="hidden" name="testOn" value={panel.testOn} />
              <button
                type="submit"
                className="rounded-md border border-black/15 px-3 py-1.5 text-xs text-black/60 hover:text-red-600 dark:border-white/20 dark:text-white/60 dark:hover:text-red-400"
              >
                Supprimer ce bilan
              </button>
            </form>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  <th className="px-4 py-2 font-medium">Analyse</th>
                  <th className="py-2 font-medium">Valeur</th>
                  <th className="py-2 font-medium">Référence labo</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {panel.results.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-black/5 dark:border-white/10"
                  >
                    <td className="px-4 py-2">{r.label}</td>
                    <td className="py-2 font-medium tabular-nums">
                      {r.value} <span className="text-black/50 dark:text-white/50">{r.unit}</span>
                    </td>
                    <td className="py-2 tabular-nums text-black/60 dark:text-white/60">
                      {formatRange(r.refLow, r.refHigh)}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge value={r.value} refLow={r.refLow} refHigh={r.refHigh} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
