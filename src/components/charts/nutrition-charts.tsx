"use client";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayTotals } from "@/lib/dal";

export type ChartPoint = {
  /** `YYYY-MM-DD`, shown as `DD/MM` on the axis. */
  dayKey: string;
  label: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const AXIS = { stroke: "currentColor", fontSize: 11, opacity: 0.6 } as const;

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-black/15 text-sm text-black/50 dark:border-white/20 dark:text-white/50">
      {message}
    </div>
  );
}

export function CaloriesChart({
  data,
  goalKcal,
}: {
  data: ChartPoint[];
  goalKcal: number | null;
}) {
  if (data.length === 0) {
    return <EmptyChart message="Aucune entrée sur la période." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="currentColor" opacity={0.1} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))} kcal`, "Calories"]}
            labelFormatter={(label) => label}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid currentColor",
            }}
          />
          {goalKcal ? (
            <ReferenceLine
              y={goalKcal}
              stroke="currentColor"
              strokeDasharray="4 4"
              label={{ value: `Objectif ${goalKcal}`, position: "insideTopRight", fontSize: 11 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="kcal"
            name="Calories"
            stroke="var(--color-foreground)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const MACRO_COLORS = {
  protein: "#2563eb",
  carbs: "#d97706",
  fat: "#db2777",
} as const;

/** Grams to kcal so the donut slices show the true energy share of the day. */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

type MacroSlice = { name: string; grams: number; kcal: number; color: string };

function DonutLegend({ slices, totalKcal }: { slices: MacroSlice[]; totalKcal: number }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
      {slices.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-black/70 dark:text-white/70">{s.name}</span>
          <span className="tabular-nums">
            {Math.round(s.grams)} g · {Math.round(s.kcal)} kcal
          </span>
          <span className="tabular-nums text-black/50 dark:text-white/50">
            ({Math.round((s.kcal / totalKcal) * 100)} %)
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MacrosChart({ totals }: { totals: DayTotals }) {
  if (totals.kcal <= 0 || totals.itemCount === 0) {
    return <EmptyChart message="Aucune entrée aujourd’hui." />;
  }

  const slices: MacroSlice[] = (
    [
      { key: "protein", name: "Protéines", color: MACRO_COLORS.protein },
      { key: "carbs", name: "Glucides", color: MACRO_COLORS.carbs },
      { key: "fat", name: "Lipides", color: MACRO_COLORS.fat },
    ] as const
  )
    .map(({ key, name, color }) => ({
      name,
      grams: totals[key],
      kcal: totals[key] * KCAL_PER_G[key],
      color,
    }))
    .filter((s) => s.grams > 0);

  if (slices.length === 0) {
    return <EmptyChart message="Aucune entrée aujourd’hui." />;
  }

  const totalKcal = slices.reduce((sum, s) => sum + s.kcal, 0);

  return (
    <div>
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="kcal"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${Math.round(Number(value))} kcal`, String(name)]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid currentColor",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{Math.round(totals.kcal)}</span>
          <span className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
            kcal
          </span>
        </div>
      </div>
      <DonutLegend slices={slices} totalKcal={totalKcal} />
    </div>
  );
}
