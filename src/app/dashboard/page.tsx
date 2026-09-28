import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { CaloriesChart, MacrosChart } from "@/components/charts/nutrition-charts";
import { GoalsPanel } from "@/components/goals-panel";
import { TotalsGrid } from "@/components/totals";
import { WaterTracker } from "@/components/water-tracker";
import { formatDayLabel, todayKey } from "@/lib/date";
import {
  getDaySummaries,
  getEntriesForDay,
  getProfile,
  getWaterForDay,
  listSavedFoods,
  totalsFor,
} from "@/lib/dal";
import { computeGoals } from "@/lib/goals";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth();
  const dayKey = todayKey();

  const [todayEntries, catalog, summaries, water, profile] = await Promise.all([
    getEntriesForDay(dayKey),
    listSavedFoods("", 1000),
    getDaySummaries(30),
    getWaterForDay(dayKey),
    getProfile(),
  ]);

  const goals = computeGoals(profile);

  const todayTotals = totalsFor(todayEntries);

  // Charts are fed plain numbers from the SQL aggregation: only days that have
  // at least one entry exist, so a day you never logged is absent rather than a
  // misleading zero.
  const chartData = summaries.map((day) => ({
    dayKey: day.dayKey,
    label: `${day.dayKey.slice(8, 10)}/${day.dayKey.slice(5, 7)}`,
    kcal: Math.round(day.totals.kcal),
    protein: Math.round(day.totals.protein),
    carbs: Math.round(day.totals.carbs),
    fat: Math.round(day.totals.fat),
  }));

  const avgKcal = summaries.length > 0
    ? Math.round(
        summaries.reduce((sum, day) => sum + day.totals.kcal, 0) / summaries.length,
      )
    : 0;
  const totalItems30 = summaries.reduce(
    (sum, day) => sum + day.totals.itemCount,
    0,
  );

  return (
    <AppShell pathname="/dashboard" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Aujourd&apos;hui
          </h2>
          <TotalsGrid totals={todayTotals} />
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            {todayEntries.length} entrée{todayEntries.length > 1 ? "s" : ""} ·{" "}
            {formatDayLabel(dayKey)}
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            Voir le journal du jour
          </Link>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h3 className="text-sm font-medium">Macronutriments du jour</h3>
            <div className="mt-3">
              <MacrosChart totals={todayTotals} />
            </div>
          </div>
          <GoalsPanel
            totals={todayTotals}
            waterGlasses={water.glasses}
            goals={goals}
          />
        </section>

        <section className="mt-4">
          <WaterTracker dayKey={dayKey} glasses={water.glasses} />
        </section>

        <section className="mt-6">
          <Link
            href="/profile"
            className="inline-flex rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            {goals.kcal ? "Ajuster mes objectifs" : "Définir mes objectifs"}
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Tendance sur 30 jours
          </h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Seuls les jours avec au moins une entrée sont représentés.
          </p>

          <div className="mt-3">
            <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <h3 className="text-sm font-medium">Calories</h3>
              <div className="mt-3">
                <CaloriesChart data={chartData} goalKcal={goals.kcal} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
              Aliments dans le catalogue
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {catalog.length}
            </dd>
            <Link
              href="/foods"
              className="mt-3 inline-block text-sm underline underline-offset-4"
            >
              Ajouter des aliments
            </Link>
          </div>

          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
              Calories moyennes (30 derniers jours)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {avgKcal}
              <span className="ml-0.5 text-sm font-normal text-black/50 dark:text-white/50">
                kcal
              </span>
            </dd>
          </div>

          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
              Entrées totales (30 derniers jours)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {totalItems30}
            </dd>
            <Link
              href="/history"
              className="mt-3 inline-block text-sm underline underline-offset-4"
            >
              Voir l&apos;historique
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <dt className="text-sm text-black/60 dark:text-white/60">Email</dt>
            <dd className="mt-1 font-medium">{session?.user?.email}</dd>
          </div>
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <dt className="text-sm text-black/60 dark:text-white/60">
              Expiration de session
            </dt>
            <dd className="mt-1 font-medium">
              {session?.expires
                ? new Date(session.expires).toLocaleString()
                : "—"}
            </dd>
          </div>
        </section>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </main>
    </AppShell>
  );
}
