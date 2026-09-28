/**
 * Blood test panel: the catalogue of analytes the form offers, the default
 * French reference bounds, and how a value compares to them.
 *
 * Pure and deliberately **not** `server-only`, so pages and client components
 * can share it. Nothing here decides what is healthy: the bounds are the ones a
 * laboratory prints, they differ per lab, per sex and per year, and the app only
 * compares the number to them. This is not a medical opinion.
 */

/** A value within this share of the interval sits close enough to a limit to be
 *  worth watching. Only meaningful for a two-sided reference, which is the only
 *  case with a span. */
const WATCH_MARGIN = 0.1;

export type LabStatus = "normal" | "watch" | "low" | "high" | "unknown";

export type Analyte = {
  /** Stable identifier stored in the database. */
  code: string;
  label: string;
  unit: string;
  /** Null when the reference is one-sided, e.g. "HDL > 0.40". */
  refLow: number | null;
  refHigh: number | null;
  /** Shown under the field so a value like `1.2` is unambiguous. */
  example: string;
};

/**
 * The routine panel a French biology lab prints. Only analytes whose reference
 * range does not depend on sex are listed; a lab's own bounds can always be
 * corrected when saving.
 */
export const ANALYTES: readonly Analyte[] = [
  {
    code: "glycemie",
    label: "Glycémie",
    unit: "g/L",
    refLow: 0.7,
    refHigh: 1.1,
    example: "0.90",
  },
  {
    code: "hba1c",
    label: "HbA1c (hémoglobine glyquée)",
    unit: "%",
    refLow: 4,
    refHigh: 7,
    example: "5.4",
  },
  {
    code: "cholesterolTotal",
    label: "Cholestérol total",
    unit: "g/L",
    refLow: 2,
    refHigh: 2.6,
    example: "2.10",
  },
  {
    code: "hdl",
    label: "HDL-cholestérol",
    unit: "g/L",
    refLow: 0.4,
    refHigh: null,
    example: "0.55",
  },
  {
    code: "ldl",
    label: "LDL-cholestérol",
    unit: "g/L",
    refLow: null,
    refHigh: 1.6,
    example: "1.20",
  },
  {
    code: "triglycerides",
    label: "Triglycérides",
    unit: "g/L",
    refLow: null,
    refHigh: 1.5,
    example: "1.00",
  },
  {
    code: "ferritine",
    label: "Ferritine",
    unit: "µg/L",
    refLow: 30,
    refHigh: 400,
    example: "120",
  },
  {
    code: "asat",
    label: "ASAT (transaminases)",
    unit: "U/L",
    refLow: 0,
    refHigh: 40,
    example: "25",
  },
  {
    code: "alat",
    label: "ALAT (transaminases)",
    unit: "U/L",
    refLow: 0,
    refHigh: 40,
    example: "22",
  },
  {
    code: "uree",
    label: "Urée",
    unit: "g/L",
    refLow: 2.5,
    refHigh: 7.5,
    example: "4.50",
  },
  {
    code: "creatinine",
    label: "Créatinine",
    unit: "mg/L",
    refLow: 6,
    refHigh: 14,
    example: "9",
  },
  {
    code: "crp",
    label: "CRP (protéine C réactive)",
    unit: "mg/L",
    refLow: null,
    refHigh: 3,
    example: "1.2",
  },
  {
    code: "vitamineD",
    label: "Vitamine D (25-OH)",
    unit: "ng/mL",
    refLow: 10,
    refHigh: 30,
    example: "18",
  },
];

export function analyteByCode(code: string): Analyte | undefined {
  return ANALYTES.find((a) => a.code === code);
}

/** Human-readable bounds, e.g. `0.40 - 0.60` or `< 1.60` or `> 0.40`. */
export function formatRange(refLow: number | null, refHigh: number | null): string {
  const trim = (n: number) => String(Number(n.toFixed(2)));

  if (refLow !== null && refHigh !== null) return `${trim(refLow)} - ${trim(refHigh)}`;
  if (refHigh !== null) return `< ${trim(refHigh)}`;
  if (refLow !== null) return `> ${trim(refLow)}`;
  return "—";
}

/**
 * Compares a value to the bounds recorded with it. Returns `unknown` when the
 * lab published neither bound — an unjudged value is not a normal one.
 *
 * The bounds are inclusive, so a value sitting exactly on one is in range. The
 * "watch" band is the slice of the interval adjacent to a bound: it needs a span
 * to be a fraction of, which only a two-sided reference has. A one-sided
 * reference like `LDL < 1.60` is therefore simply in or out — using the bound
 * itself as the span would mark the last 10% of a large limit, and the last
 * fraction of a small one, as worth watching.
 */
export function labStatus(
  value: number,
  refLow: number | null,
  refHigh: number | null,
): LabStatus {
  if (refLow === null && refHigh === null) return "unknown";
  if (refLow !== null && value < refLow) return "low";
  if (refHigh !== null && value > refHigh) return "high";

  if (refLow === null || refHigh === null) return "normal";

  const margin = (refHigh - refLow) * WATCH_MARGIN;
  const aboveLow = value - refLow;
  const belowHigh = refHigh - value;

  if (aboveLow > 0 && aboveLow <= margin) return "watch";
  if (belowHigh > 0 && belowHigh <= margin) return "watch";

  return "normal";
}

export const STATUS_LABELS: Record<LabStatus, string> = {
  normal: "Dans la norme",
  watch: "À surveiller",
  low: "Sous la norme",
  high: "Au-dessus de la norme",
  unknown: "Sans référence",
};

export const STATUS_STYLES: Record<LabStatus, string> = {
  normal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  watch: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  high: "bg-red-500/15 text-red-700 dark:text-red-300",
  unknown: "bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50",
};
