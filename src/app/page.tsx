import { auth } from "@/auth";
import { AddEntryForm } from "@/components/add-entry-form";
import { AppShell } from "@/components/app-shell";
import { EntryList } from "@/components/entry-list";
import { GoalsPanel } from "@/components/goals-panel";
import { TotalsGrid } from "@/components/totals";
import { WaterTracker } from "@/components/water-tracker";
import { formatDayLabel, todayKey } from "@/lib/date";
import {
  getEntriesForDay,
  getProfile,
  getWaterForDay,
  listSavedFoods,
  totalsFor,
} from "@/lib/dal";
import { computeGoals } from "@/lib/goals";

export default async function HomePage() {
  const session = await auth();
  const dayKey = todayKey();

  const [dayEntries, catalog, water, profile] = await Promise.all([
    getEntriesForDay(dayKey),
    listSavedFoods("", 200),
    getWaterForDay(dayKey),
    getProfile(),
  ]);

  const goals = computeGoals(profile);

  return (
    <AppShell pathname="/" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold capitalize">
          {formatDayLabel(dayKey)}
        </h1>

        <div className="mt-6 space-y-4">
          <TotalsGrid totals={totalsFor(dayEntries)} />
          <GoalsPanel
            totals={totalsFor(dayEntries)}
            waterGlasses={water.glasses}
            goals={goals}
          />
          <WaterTracker dayKey={dayKey} glasses={water.glasses} />
          <AddEntryForm
            foods={catalog.map((f) => ({ id: f.id, name: f.name, brand: f.brand }))}
            dayKey={dayKey}
          />
        </div>

        <EntryList entries={dayEntries} />
      </main>
    </AppShell>
  );
}
