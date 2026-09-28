"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeScanner, ProductRow, type Product } from "./food-search";

type SearchResponse = {
  local: Product[];
  remote: Product[];
  warning?: string;
  error?: string;
};

export function FoodFinder() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse>({ local: [], remote: [] });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setData({ local: [], remote: [] });
      setStatus(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      const json: SearchResponse = await res.json();

      if (!res.ok) {
        setStatus(json.error ?? "Recherche impossible.");
        setData({ local: [], remote: [] });
        return;
      }

      setData(json);
      setStatus(
        json.local.length + json.remote.length === 0 ? "Aucun résultat." : null,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setStatus("Recherche impossible.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced so every keystroke does not hit Open Food Facts.
  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const lookupBarcode = useCallback(async (code: string) => {
    setStatus(`Lecture du code ${code}…`);
    setQuery(code);

    try {
      const res = await fetch(`/api/foods/barcode/${code}`);
      const json = await res.json();
      if (!res.ok) {
        setStatus(json.error ?? "Produit introuvable.");
        setData({ local: [], remote: [] });
        return;
      }
      setData({ local: [], remote: [json.product as Product] });
      setStatus(null);
    } catch {
      setStatus("Open Food Facts est injoignable.");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/60 dark:text-white/60">
          Rechercher un produit ou entrer un code-barres
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex. nutella, 3017620422003"
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </label>

      <BarcodeScanner onDetected={lookupBarcode} />

      {status && (
        <p className="text-sm text-black/60 dark:text-white/60">
          {loading ? "Recherche…" : status}
        </p>
      )}

      {data.warning && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {data.warning}
        </p>
      )}

      {data.local.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Dans ton catalogue
          </h3>
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
            {data.local.map((product) => (
              <li key={`local-${product.barcode ?? product.name}`} className="px-4 py-3">
                <div className="truncate font-medium">
                  {product.brand ? `${product.brand} — ` : ""}
                  {product.name}
                </div>
                <div className="text-xs text-black/50 dark:text-white/50">
                  {Math.round(product.kcalPer100g)} kcal pour 100 g · déjà
                  enregistré
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.remote.length > 0 && (
        <section>
          {data.local.length > 0 && (
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
              Open Food Facts
            </h3>
          )}
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
            {data.remote.map((product) => (
              <ProductRow
                key={product.barcode ?? product.name}
                product={product}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
