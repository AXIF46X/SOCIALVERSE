"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

export type DayPoint = { day: string; views: number; hours: number };

const tooltipStyle: React.CSSProperties = {
  background: "rgba(16,16,23,0.94)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#f2f2f8",
  boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
};

export function ViewsChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(128,128,160,0.18)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} tickLine={false} axisLine={false} width={42} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(167,139,250,0.4)" }} />
        <Area type="monotone" dataKey="views" name="Views" stroke="#a78bfa" strokeWidth={2.4} fill="url(#viewsGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WatchHoursChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(128,128,160,0.15)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--text-3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={36} />
        <YAxis tick={{ fontSize: 9, fill: "var(--text-3)" }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(34,211,238,0.08)" }} />
        <Bar dataKey="hours" name="Watch hours" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueSourceChart({ data }: { data: { source: string; amount: number }[] }) {
  const COLORS = ["#a78bfa", "#e879f9", "#22d3ee", "#34d399", "#fbbf24"];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="source" width={86} tick={{ fontSize: 10, fill: "var(--text-2)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(167,139,250,0.08)" }} formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Revenue"]} />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((entry, i) => <Cell key={entry.source} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
