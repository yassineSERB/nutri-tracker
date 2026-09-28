"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { saveProduct, type ActionState } from "@/app/actions";

export type Product = {
  barcode: string | null;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: "openfoodfacts" | "manual";
};

function AddToCatalogButton({ product }: { product: Product }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="product" value={JSON.stringify(product)} />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {pending ? "…" : state?.message ? "✓" : "Ajouter"}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
      {state?.message && (
        <span className="max-w-40 text-right text-xs text-black/60 dark:text-white/60">
          {state.message}
        </span>
      )}
    </form>
  );
}

export function ProductRow({ product }: { product: Product }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {product.brand ? `${product.brand} — ` : ""}
          {product.name}
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">
          {Math.round(product.kcalPer100g)} kcal · P{" "}
          {Math.round(product.proteinPer100g)} · G{" "}
          {Math.round(product.carbsPer100g)} · L{" "}
          {Math.round(product.fatPer100g)} (pour 100 g)
        </div>
      </div>
      <AddToCatalogButton product={product} />
    </li>
  );
}

/** Read-only row for a food already in the catalog. */
export function CatalogRow({
  food,
}: {
  food: {
    id: number;
    barcode: string | null;
    name: string;
    brand: string | null;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    source: string;
  };
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {food.brand ? `${food.brand} — ` : ""}
          {food.name}
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">
          {Math.round(food.kcalPer100g)} kcal · P{" "}
          {Math.round(food.proteinPer100g)} · G{" "}
          {Math.round(food.carbsPer100g)} · L{" "}
          {Math.round(food.fatPer100g)} (pour 100 g)
        </div>
      </div>
      <span className="shrink-0 text-xs text-black/40 dark:text-white/40">
        {food.source === "openfoodfacts" ? "Open Food Facts" : "manuel"}
      </span>
    </li>
  );
}

type Detector = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): Detector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  // Every render that mounts an active scanner re-attaches the detection loop.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let raf = 0;
    const Detector = window.BarcodeDetector;
    const video = videoRef.current;

    async function start() {
      if (!Detector) {
        setError("BarcodeDetector non supporté par ce navigateur.");
        return;
      }
      if (!video) return;

      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        video.srcObject = streamRef.current;
        await video.play();
      } catch {
        setError("Accès à la caméra refusé.");
        return;
      }

      const detector = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const tick = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            onDetected(codes[0].rawValue);
            return;
          }
        } catch {
          // A frame can be unreadable; keep looping rather than bailing out.
        }
        raf = requestAnimationFrame(() => void tick());
      };
      void tick();
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active, onDetected]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        className="self-start rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
      >
        {active ? "Arrêter le scan" : "Scanner un code-barres"}
      </button>

      {active && (
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full max-w-sm rounded-lg border border-black/15 dark:border-white/20"
        />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-xs text-black/50 dark:text-white/50">
        Sans caméra ? Saisis le code ci-dessous.
      </p>
    </div>
  );
}
