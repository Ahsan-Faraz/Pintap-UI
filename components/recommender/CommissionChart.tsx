"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import type { RecommenderDashboardDay } from "@/lib/types";

export default function CommissionChart({
  data,
  loading,
}: {
  data: RecommenderDashboardDay[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-6 h-[168px] animate-pulse rounded-input bg-white/10 sm:h-[188px]" />
    );
  }

  const peak = data.reduce(
    (max, d) => (d.commissionMinor > max ? d.commissionMinor : max),
    0,
  );

  const chartData = data.map((d) => ({
    label: d.label,
    value: d.commissionMinor / 100,
    highlight: peak > 0 && d.commissionMinor === peak,
  }));

  return (
    <div className="mt-6 h-[168px] w-full sm:h-[188px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
            dy={8}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.highlight
                    ? "#41c9fe"
                    : "rgba(255,255,255,0.22)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
