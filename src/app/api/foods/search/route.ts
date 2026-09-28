import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { listSavedFoods } from "@/lib/dal";
import { OpenFoodFactsError, searchByName } from "@/lib/openfoodfacts";

/**
 * Two sources on purpose: the local catalog answers instantly and always works,
 * while Open Food Facts is the slow, rate-limited part. A flaky upstream should
 * degrade the page, not break the search.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ local: [], remote: [] });
  }

  const local = (await listSavedFoods(query, 25)).map((food) => ({
    barcode: food.barcode,
    name: food.name,
    brand: food.brand,
    kcalPer100g: food.kcalPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    source: food.source,
  }));

  try {
    const remote = await searchByName(query);
    return NextResponse.json({ local, remote });
  } catch (error) {
    if (!(error instanceof OpenFoodFactsError)) throw error;

    return NextResponse.json(
      {
        local,
        remote: [],
        warning: "Open Food Facts est momentanément injoignable.",
      },
      { status: 200 },
    );
  }
}
