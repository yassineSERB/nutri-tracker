import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { bmiFrom, bmiLabel, computeGoals, restingKcal } from "@/lib/goals";
import { getProfile } from "@/lib/dal";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && (
        <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">{hint}</div>
      )}
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const profile = await getProfile();

  const goals = computeGoals(profile);
  const bmi = bmiFrom(profile.heightCm, profile.weightKg);
  const resting = restingKcal(profile);
  const hasSuggestion = goals.kcal !== null;

  return (
    <AppShell pathname="/profile" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold">Profil</h1>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="IMC"
            value={bmi === null ? "—" : bmi.toFixed(1)}
            hint={bmi === null ? "Renseigne taille et poids" : bmiLabel(bmi)}
          />
          <Stat
            label="Métabolisme de base"
            value={resting === null ? "—" : `${Math.round(resting)} kcal`}
            hint="Mifflin-St Jeor"
          />
          <Stat
            label="Objectif journalier"
            value={goals.kcal === null ? "—" : `${goals.kcal} kcal`}
            hint={
              goals.kcal === null
                ? "Profil incomplet"
                : goals.computed
                  ? "Calculé"
                  : "Personnalisé"
            }
          />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Mes informations
          </h2>
          <ProfileForm
            profile={profile}
            suggested={
              hasSuggestion
                ? {
                    kcal: goals.kcal,
                    protein: goals.protein,
                    carbs: goals.carbs,
                    fat: goals.fat,
                  }
                : null
            }
          />
        </section>

        <p className="mt-8 text-xs text-black/45 dark:text-white/45">
          Les valeurs calculées sont des estimations issues d&apos;une formule
          statistique, pas un avis médical.{" "}
          <Link href="/" className="underline underline-offset-4">
            Retour au journal
          </Link>
        </p>
      </main>
    </AppShell>
  );
}
