import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { formatKrw } from "../../lib/format";
import type { ChartDatum } from "./useDashboardData";

type DashboardChartsProps = {
  trend: ChartDatum[];
  categoryBreakdown: ChartDatum[];
  topMerchants: ChartDatum[];
  topCategories: ChartDatum[];
  installmentTrend: ChartDatum[];
  coffeeTrend: ChartDatum[];
  coupangTrend: ChartDatum[];
};

export function DashboardCharts(props: DashboardChartsProps) {
  return (
    <section className="flex flex-col gap-4">
      <ChartCard title="Monthly spending trend">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={props.trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="spending" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2F8F6B" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#2F8F6B" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatKrw(Number(value))} />
            <Area type="monotone" dataKey="amount" stroke="#2F8F6B" strokeWidth={3} fill="url(#spending)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category pie chart">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={props.categoryBreakdown} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
              {props.categoryBreakdown.map((entry) => (
                <Cell key={entry.name} fill={entry.color ?? "#71717A"} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatKrw(Number(value))} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top merchants">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={props.topMerchants} layout="vertical" margin={{ left: 18, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip formatter={(value) => formatKrw(Number(value))} />
            <Bar dataKey="amount" fill="#4D8BC8" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top categories">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={props.topCategories} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatKrw(Number(value))} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {props.topCategories.map((entry) => (
                <Cell key={entry.name} fill={entry.color ?? "#D7A83F"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Installment trend">
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={props.installmentTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatKrw(Number(value))} />
            <Line type="monotone" dataKey="amount" stroke="#E56B5D" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Coffee trend">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={props.coffeeTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value) => formatKrw(Number(value))} />
              <Line type="monotone" dataKey="amount" stroke="#8B5E3C" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Coupang trend">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={props.coupangTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value) => formatKrw(Number(value))} />
              <Line type="monotone" dataKey="amount" stroke="#D7A83F" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-base font-bold tracking-normal">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}
