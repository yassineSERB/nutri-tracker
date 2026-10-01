import { BloodPanel } from "@/components/blood-panel";
import type { BloodPanel as BloodPanelData } from "@/lib/dal";

/** Past panels, oldest first, each with the bounds that were recorded with it. */
export function BloodPanelList({ panels }: { panels: BloodPanelData[] }) {
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
        <BloodPanel key={panel.testOn} panel={panel} />
      ))}
    </div>
  );
}
