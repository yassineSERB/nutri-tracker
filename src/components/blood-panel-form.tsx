"use client";

import { useActionState, useState } from "react";
import { saveBloodPanel, type ActionState } from "@/app/actions";
import { ANALYTES, formatRange } from "@/lib/lab";
import { todayKey } from "@/lib/date";

type Row = { value: string; refLow: string; refHigh: string };

/** Prefill the lab's default bounds so a first panel needs only the values. */
function rowsFromDefaults(): Record<string, Row> {
  return Object.fromEntries(
    ANALYTES.map((a) => [
      a.code,
      {
        value: "",
        refLow: a.refLow === null ? "" : String(a.refLow),
        refHigh: a.refHigh === null ? "" : String(a.refHigh),
      },
    ]),
  );
}

const input =
  "w-full rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-white/20";

export function BloodPanelForm({ editing }: { editing?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveBloodPanel,
    undefined,
  );
  const [rows, setRows] = useState<Record<string, Row>>(() => rowsFromDefaults());
  const [testOn, setTestOn] = useState(editing ?? todayKey());

  const set = (code: string, key: keyof Row, v: string) =>
    setRows((prev) => ({ ...prev, [code]: { ...prev[code], [key]: v } }));

  /**
   * The payload is held in a controlled hidden input rather than written during
   * `onSubmit`: React serialises the form before the submit handler runs, so a
   * field mutated in the handler is still read as its old value.
   */
  const results = ANALYTES.flatMap((a) => {
    const row = rows[a.code];
    if (!row || row.value.trim() === "") return [];
    return [
      {
        analyte: a.code,
        value: Number(row.value),
        unit: a.unit,
        refLow: row.refLow.trim() === "" ? null : Number(row.refLow),
        refHigh: row.refHigh.trim() === "" ? null : Number(row.refHigh),
        note: null,
      },
    ];
  });

  const payload = JSON.stringify({ testOn, results });

  const editingLabel = editing ? `Modifier le bilan du ${editing}` : "Nouveau bilan sanguin";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="panel" value={payload} readOnly />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Date du prélèvement</span>
          <input
            type="date"
            value={testOn}
            onChange={(e) => setTestOn(e.target.value)}
            required
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </label>
        <p className="text-xs text-black/50 dark:text-white/50">{editingLabel}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/50 dark:border-white/40">
              <th className="py-2 pr-2 font-medium">Analyse</th>
              <th className="py-2 pr-2 font-medium">Valeur</th>
              <th className="py-2 pr-2 font-medium">Unité</th>
              <th className="py-2 pr-2 font-medium">Réf. min</th>
              <th className="py-2 font-medium">Réf. max</th>
            </tr>
          </thead>
          <tbody>
            {ANALYTES.map((a) => (
              <tr key={a.code} className="border-b border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-2">
                  <div>{a.label}</div>
                  <div className="text-xs text-black/45 dark:text-white/45">
                    Réf. {formatRange(a.refLow, a.refHigh)}
                  </div>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className={input}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder={a.example}
                    value={rows[a.code]?.value ?? ""}
                    onChange={(e) => set(a.code, "value", e.target.value)}
                    aria-label={`${a.label}, valeur`}
                  />
                </td>
                <td className="py-1.5 pr-2 text-black/60 dark:text-white/60">{a.unit}</td>
                <td className="py-1.5 pr-2">
                  <input
                    className={input}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={rows[a.code]?.refLow ?? ""}
                    onChange={(e) => set(a.code, "refLow", e.target.value)}
                    aria-label={`${a.label}, référence minimale`}
                  />
                </td>
                <td className="py-1.5">
                  <input
                    className={input}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={rows[a.code]?.refHigh ?? ""}
                    onChange={(e) => set(a.code, "refHigh", e.target.value)}
                    aria-label={`${a.label}, référence maximale`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || results.length === 0}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending
            ? "Enregistrement…"
            : results.length === 0
              ? "Renseigne au moins une valeur"
              : editing
                ? "Mettre à jour"
                : "Enregistrer"}
        </button>
        {state?.error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
        {state?.message && (
          <span className="text-sm text-black/60 dark:text-white/60">{state.message}</span>
        )}
      </div>

      <p className="text-xs text-black/45 dark:text-white/45">
        Renseigne au moins une valeur. Les bornes du labo sont enregistrées avec le
        bilan&nbsp;: si tu les changes, la saisie de cette date les remplacera. Enregistrer
        une date déjà présente remplace le bilan de cette date.
      </p>
    </form>
  );
}
