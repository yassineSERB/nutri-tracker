import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchByBarcode } from "@/lib/openfoodfacts";

/** Barcode lookup. `RouteContext` is a generated global type; `params` is a
 *  Promise in Next.js 16. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/foods/barcode/[code]">,
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { code } = await context.params;

  if (!/^\d{8,14}$/.test(code)) {
    return NextResponse.json(
      { error: "Code-barres invalide (8 à 14 chiffres attendus)." },
      { status: 400 },
    );
  }

  try {
    const product = await fetchByBarcode(code);
    if (!product) {
      return NextResponse.json(
        { error: "Produit introuvable dans Open Food Facts." },
        { status: 404 },
      );
    }
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json(
      { error: "Open Food Facts est injoignable." },
      { status: 502 },
    );
  }
}
