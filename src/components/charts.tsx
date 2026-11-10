"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useI18n } from "./providers";
type Point = { name: string; value: number; color?: string };
export function ActivityChart({ points }: { points: Point[] }) {
  const { t } = useI18n();
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={points} barSize={26}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--soft)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
            formatter={(v) => [`${v} ${t("minutes")}`, t("studyTime")]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.color ?? "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Donut({ points }: { points: Point[] }) {
  const { t } = useI18n();
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={points}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={83}
            paddingAngle={3}
            stroke="none"
          >
            {points.map((p, i) => (
              <Cell key={i} fill={p.color ?? "#6366f1"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {points.map((p, i) => (
          <span key={i}>
            <i style={{ background: p.color }} />
            {p.name}: <b>{p.value}</b>
          </span>
        ))}
      </div>
      {!points.some((p) => p.value > 0) && (
        <p className="muted center">{t("noData")}</p>
      )}
    </div>
  );
}
export function TrendChart({ points }: { points: Point[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <YAxis
            width={25}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
