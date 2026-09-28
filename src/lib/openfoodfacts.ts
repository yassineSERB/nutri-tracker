import "server-only";

import { z } from "zod";
import { FOOD_SOURCES, type FoodSource } from "@/db/schema";

/** Legacy product endpoint. Still the reliable way to resolve a single EAN. */
const API = "https://world.openfoodfacts.org";
/** Open Food Facts' own search service. The legacy `cgi/search.pl` answers 503
 *  under load far more often, so this is the primary search backend. */
const SEARCH = "https://search.openfoodfacts.org";

export class OpenFoodFactsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenFoodFactsError";
  }
}

/**
 * Open Food Facts returns values per 100 g, with a lot of shapes depending on
 * the product. `z.coerce` + a permissive catch-all keeps this from becoming a
 * maintenance burden when their schema drifts.
 */
const offNutrimentsSchema = z
  .object({
    "energy-kcal_100g": z.coerce.number().optional(),
    proteins_100g: z.coerce.number().optional(),
    carbohydrates_100g: z.coerce.number().optional(),
    fat_100g: z.coerce.number().optional(),
  })
  .passthrough()
  .optional();

/** `brands` is a comma-separated string on the legacy endpoints but a real
 *  array on `off-search`, so both are accepted. */
const offRawProductSchema = z
  .object({
    code: z.string().optional(),
    product_name: z.string().optional(),
    brands: z.union([z.string(), z.array(z.string())]).optional(),
    nutriments: offNutrimentsSchema,
  })
  .passthrough();

/** `cgi/search.pl` returns `products`; `off-search` returns `hits`. */
const offLegacySearchSchema = z
  .object({ products: z.array(offRawProductSchema) })
  .passthrough();

const offSearchServiceSchema = z
  .object({ hits: z.array(offRawProductSchema) })
  .passthrough();

function extractHits(data: unknown): z.infer<typeof offRawProductSchema>[] {
  const hits = offSearchServiceSchema.safeParse(data);
  if (hits.success) return hits.data.hits;

  const legacy = offLegacySearchSchema.safeParse(data);
  if (legacy.success) return legacy.data.products;

  return [];
}

export type OffProduct = {
  barcode: string | null;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: FoodSource;
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function firstBrand(raw: z.infer<typeof offRawProductSchema>): string | null {
  const { brands } = raw;
  const first = Array.isArray(brands) ? brands[0] : brands?.split(",")[0];
  return first?.trim() || null;
}

function toProduct(
  barcode: string | null,
  raw: z.infer<typeof offRawProductSchema>,
): OffProduct | null {
  const name = raw.product_name?.trim();
  if (!name) return null;

  const n = raw.nutriments;
  if (!n || n["energy-kcal_100g"] == null) return null;

  return {
    barcode,
    name,
    brand: firstBrand(raw),
    kcalPer100g: round(n["energy-kcal_100g"]),
    proteinPer100g: round(n.proteins_100g ?? 0),
    carbsPer100g: round(n.carbohydrates_100g ?? 0),
    fatPer100g: round(n.fat_100g ?? 0),
    source: FOOD_SOURCES[0],
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Open Food Facts is a volunteer project and answers 429/503 under load, so a
 * single failure is not worth surfacing: retry with a short backoff and only
 * give up after a few attempts.
 */
async function request(
  url: string,
  attempts = 3,
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "app-web/1.0 (https://github.com/openfoodfacts)",
          Accept: "application/json",
        },
        // Nutritional data barely changes; an hour of freshness is plenty and
        // keeps repeat searches off the network entirely.
        next: { revalidate: 3600 },
      });

      if (res.ok) return await res.json();

      lastError = new OpenFoodFactsError(
        `Open Food Facts a répondu ${res.status}`,
      );
      // Client errors will not get better by asking again.
      if (res.status < 500 && res.status !== 429) throw lastError;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new OpenFoodFactsError("Requête Open Food Facts impossible");
    }

    if (attempt < attempts - 1) await sleep(300 * 2 ** attempt);
  }

  throw lastError ?? new OpenFoodFactsError("Open Food Facts est injoignable");
}

/** Looks up a single product by EAN/UPC code. */
export async function fetchByBarcode(
  barcode: string,
): Promise<OffProduct | null> {
  const data = await request(
    `${API}/api/v2/product/${encodeURIComponent(barcode)}.json`,
  );
  const parsed = z
    .object({ product: offRawProductSchema })
    .passthrough()
    .safeParse(data);

  if (!parsed.success) return null;
  return toProduct(barcode, parsed.data.product);
}

/** Full-text search. Returns an empty list rather than throwing when a query
 *  legitimately has no results. */
export async function searchByName(query: string): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: "20",
    fields: "code,product_name,brands,nutriments",
  });

  const data = await request(`${SEARCH}/search?${params}`);

  return extractHits(data)
    .map((product) => toProduct(product.code ?? null, product))
    .filter((p): p is OffProduct => p !== null);
}
