"use client";

import { useState } from "react";
import { formatDayLabel } from "@/lib/date";
import { removeBloodPanel } from "@/app/actions";
import type { BloodPanel } from "@/lib/dal";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  formatRange,
  labStatus,
} from "@/lib/lab";

/** Circle around a count: `border-current` follows the status colour set on the
 *  element itself, so one class works for red, amber and green. A fixed size
 *  keeps the circles aligned whatever the count has two digits or one. */
const FLAG_STYLES =
  "inline-flex size-6 items-center justify-center rounded-full border border-current/40 text-xs font-semibold tabular-nums";

/**
 * One count with the explanation that appears on hover. The wording stays a
 * plain comparison to the bounds: the circle says "outside" or "near a bound",
 * never anything about health. `sr-only` carries the same text for a screen
 * reader, so the tooltip is purely visual and adds nothing to announce.
 */
function Flag({
  count,
  explanation,
  colour,
}: {
  count: number;
  explanation: string;
  colour: string;
}) {
  return (
    <span className="group/flag relative inline-flex">
      <span className={`${FLAG_STYLES} ${colour}`}>
        <span className="sr-only">{explanation} : </span>
        {count}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-max max-w-[16rem] rounded-md border border-black/10 bg-background px-2 py-1 text-left text-xs text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover/flag:opacity-100 dark:border-white/15"
      >
        {explanation}
      </span>
    </span>
  );
}

/**
 * Count of results per status, computed with the same `labStatus` the table
 * uses, so a folded panel can never disagree with its rows. `watch` is kept
 * apart from `low`/`high` on purpose: a value near a bound is not the same as
 * one outside it. `rest` is what is left — the values in range, plus those with
 * no published bound, which carry no verdict either way.
 */
function countFlags(results: BloodPanel["results"]) {
  let out = 0;
  let watch = 0;
  let rest = 0;

  for (const r of results) {
    const status = labStatus(r.value, r.refLow, r.refHigh);
    if (status === "low" || status === "high") out += 1;
    else if (status === "watch") watch += 1;
    else rest += 1;
  }

  return { out, watch, rest };
}

function StatusBadge({
  value,
  refLow,
  refHigh,
}: {
  value: number;
  refLow: number | null;
  refHigh: number | null;
}) {
  const status = labStatus(value, refLow, refHigh);

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Chevron drawn from two borders, so it needs no icon font or dependency. */
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-1 h-2.5 w-2.5 shrink-0 border-b-2 border-r-2 border-current transition-transform duration-150 ${
        open ? "rotate-45" : "-rotate-45"
      }`}
    />
  );
}

/**
 * One panel with its results table, collapsible. The open state is local and
 * therefore forgotten on reload: folding a panel is a way to read the list, not
 * a preference worth a column and a migration. The header (date, count, delete)
 * always stays visible, so a folded panel is still identifiable and deletable.
 */
export function BloodPanel({ panel }: { panel: BloodPanel }) {
  const [open, setOpen] = useState(true);
  const contentId = `panel-${panel.testOn}`;
  const n = panel.results.length;
  const { out, watch, rest } = countFlags(panel.results);

  return (
    <section className="rounded-lg border border-black/10 dark:border-white/15">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={contentId}
          className="group flex min-w-0 items-start gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block font-semibold capitalize group-hover:underline">
              {formatDayLabel(panel.testOn)}
            </span>
            <span className="block text-xs text-black/50 dark:text-white/50">
              {n} {n === 1 ? "analyse" : "analyses"}
            </span>
          </span>
          <Chevron open={open} />
        </button>

        <div className="flex shrink-0 items-center gap-3">
          {/* Only while folded: an open panel already shows every status. */}
          {!open && (
            <span className="flex items-center gap-2">
              {out > 0 && (
                <Flag
                  count={out}
                  colour="text-red-600 dark:text-red-400"
                  explanation={`${out} valeur${out > 1 ? "s" : ""} hors des bornes du laboratoire`}
                />
              )}
              {watch > 0 && (
                <Flag
                  count={watch}
                  colour="text-amber-600 dark:text-amber-400"
                  explanation={`${watch} valeur${watch > 1 ? "s" : ""} à moins de 10 % d'une borne`}
                />
              )}
              {rest > 0 && (
                <Flag
                  count={rest}
                  colour="text-emerald-600 dark:text-emerald-400"
                  explanation={`${rest} valeur${rest > 1 ? "s" : ""} dans les bornes, ou sans référence`}
                />
              )}
            </span>
          )}

          <form action={removeBloodPanel}>
            <input type="hidden" name="testOn" value={panel.testOn} />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-xs text-black/60 hover:text-red-600 dark:border-white/20 dark:text-white/60 dark:hover:text-red-400"
            >
              Supprimer ce bilan
            </button>
          </form>
        </div>
      </header>

      {open && (
        <div id={contentId} className="overflow-x-auto border-t border-black/10 dark:border-white/15">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                <th className="px-4 py-2 font-medium">Analyse</th>
                <th className="py-2 font-medium">Valeur</th>
                <th className="py-2 font-medium">Référence labo</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {panel.results.map((r) => (
                <tr key={r.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-4 py-2">{r.label}</td>
                  <td className="py-2 font-medium tabular-nums">
                    {r.value} <span className="text-black/50 dark:text-white/50">{r.unit}</span>
                  </td>
                  <td className="py-2 tabular-nums text-black/60 dark:text-white/60">
                    {formatRange(r.refLow, r.refHigh)}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge value={r.value} refLow={r.refLow} refHigh={r.refHigh} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
