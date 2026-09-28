import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { BloodPanelForm } from "@/components/blood-panel-form";
import { BloodPanelList } from "@/components/blood-panel-list";
import { getBloodPanels } from "@/lib/dal";

export default async function AnalysesPage() {
  const session = await auth();
  const panels = await getBloodPanels();

  return (
    <AppShell pathname="/analyses" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold">Analyses médicales</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Enregistre un bilan sanguin avec les valeurs de référence de ton
          laboratoire, puis suis leur évolution dans le temps.
        </p>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Saisir un bilan
          </h2>
          <BloodPanelForm />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Mes bilans
          </h2>
          <BloodPanelList panels={panels} />
        </section>

        <p className="mt-8 text-xs text-black/45 dark:text-white/45">
          Le statut compare chaque valeur aux bornes du laboratoire, sans
          interprétation. Ce n&apos;est pas un avis médical&nbsp;: parle de tes
          résultats à un professionnel de santé.
        </p>
      </main>
    </AppShell>
  );
}
