import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { FoodFinder } from "@/components/food-finder";
import { ManualFoodForm } from "@/components/manual-food-form";
import { CatalogRow } from "@/components/food-search";
import { listSavedFoods } from "@/lib/dal";

export default async function FoodsPage() {
  const session = await auth();
  const saved = await listSavedFoods("", 200);

  return (
    <AppShell pathname="/foods" email={session?.user?.email}>
      <main className="px-4 py-8">
        <h1 className="text-2xl font-semibold">Aliments</h1>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Trouver un produit
          </h2>
          <FoodFinder />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Ajouter à la main
          </h2>
          <ManualFoodForm />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Mon catalogue ({saved.length})
          </h2>

          {saved.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/60 dark:border-white/25 dark:text-white/60">
              Ton catalogue est vide.
            </p>
          ) : (
            <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
              {saved.map((food) => (
                <CatalogRow key={food.id} food={food} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
