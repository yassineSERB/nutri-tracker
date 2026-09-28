import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { EntryList } from "@/components/entry-list";
import { TotalsGrid } from "@/components/totals";
import { formatDayLabel, shiftDayKey, todayKey } from "@/lib/date";
import { getDaySummaries, getEntriesForDay, totalsFor } from "@/lib/dal";

function isoDayKey(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayKey();
}

export default async function HistoryPage(props: PageProps<"/history">) {
  const session = await auth();
  const params = await props.searchParams;
  const dayKey = isoDayKey(params.day);
  const isToday = dayKey === todayKey();

  const [dayEntries, summaries] = await Promise.all([
    getEntriesForDay(dayKey),
    getDaySummaries(30),
  ]);

  return (
    <AppShell pathname="/history" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold capitalize">
          {formatDayLabel(dayKey)}
        </h1>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/history?day=${shiftDayKey(dayKey, -1)}`}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            ← Précédent
          </Link>
          {!isToday && (
            <Link
              href="/history"
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            >
              Aujourd&apos;hui
            </Link>
          )}
          <Link
            href={`/history?day=${shiftDayKey(dayKey, 1)}`}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            Suivant →
          </Link>
        </div>

        <div className="mt-4">
          <TotalsGrid totals={totalsFor(dayEntries)} />
        </div>

        <EntryList entries={dayEntries} />

        <section className="mt-10">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            30 derniers jours
          </h2>

          {summaries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/60 dark:border-white/25 dark:text-white/60">
              Aucun historique pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
              {summaries.map((day) => (
                <li key={day.dayKey}>
                  <Link
                    href={`/history?day=${day.dayKey}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {formatDayLabel(day.dayKey)}
                      </div>
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {day.totals.itemCount} entrée
                        {day.totals.itemCount > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <div>{Math.round(day.totals.kcal)} kcal</div>
                      <div className="text-xs text-black/50 dark:text-white/50">
                        P {Math.round(day.totals.protein)} · G{" "}
                        {Math.round(day.totals.carbs)} · L{" "}
                        {Math.round(day.totals.fat)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
