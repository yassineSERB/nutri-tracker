"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyGoals } from "@/lib/goals";

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

export function MacrosChart({ data, goals }: { data: ChartPoint[]; goals: DailyGoals }) {
  if (data.length === 0) {
    return <EmptyChart message="Aucune entrée sur la période." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="currentColor" opacity={0.1} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            formatter={(value, name) => [`${Math.round(Number(value))} g`, String(name)]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid currentColor",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="protein"
            name="Protéines"
            stackId="macros"
            fill={MACRO_COLORS.protein}
            isAnimationActive={false}
          />
          <Bar
            dataKey="carbs"
            name="Glucides"
            stackId="macros"
            fill={MACRO_COLORS.carbs}
            isAnimationActive={false}
          />
          <Bar
            dataKey="fat"
            name="Lipides"
            stackId="macros"
            fill={MACRO_COLORS.fat}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          {goals.protein ? (
            <ReferenceLine
              y={goals.protein}
              stroke={MACRO_COLORS.protein}
              strokeDasharray="4 4"
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
