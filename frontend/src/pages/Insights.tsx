import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePageEnter } from "../lib/usePageEnter";
import { insights, monthly, spendByCategory, weekly } from "../lib/mockData";
import { axis, palette, tooltipStyle } from "../lib/chart";
import { inr } from "../lib/utils";
import CountUp from "../components/reactbits/CountUp";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, PageHeader, Tabs } from "../components/ui";

export default function Insights() {
  const ref = usePageEnter();
  const [range, setRange] = useState<"3M" | "6M">("6M");
  const data = range === "3M" ? monthly.slice(-3) : monthly;
  const cur = monthly[monthly.length - 1];
  const rate = Math.round(((cur.income - cur.spend) / cur.income) * 100);
  const total = spendByCategory.reduce((s, c) => s + c.value, 0);

  const stats = [
    { label: "Income", node: <CountUp to={cur.income} prefix="₹" />, tone: "mint" as const, note: "Salary credited on 3 Nov" },
    { label: "Spent", node: <CountUp to={cur.spend} prefix="₹" />, tone: "sand" as const, note: "10% below October" },
    { label: "Saved", node: <CountUp to={cur.income - cur.spend} prefix="₹" />, tone: "sky" as const, note: "After all bills" },
    { label: "Savings rate", node: <CountUp to={rate} suffix="%" />, tone: "lav" as const, note: "Target is 30%" },
  ];

  return (
    <div ref={ref}>
      <PageHeader title="Financial insights" subtitle="See where your money goes and what to change. Figures update as transactions arrive." actions={<Tabs tabs={[{ id: "3M", label: "3 months" }, { id: "6M", label: "6 months" }]} value={range} onChange={setRange} />} />

      <div data-enter className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <SpotlightCard key={s.label} className="p-5">
            <Badge tone={s.tone}>{s.label}</Badge>
            <p className="font-display mt-3 text-3xl font-semibold">{s.node}</p>
            <p className="mt-1 text-xs text-muted">{s.note}</p>
          </SpotlightCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div data-enter className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Income and spending</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7fb89f" stopOpacity={0.4} /><stop offset="100%" stopColor="#7fb89f" stopOpacity={0} /></linearGradient>
                  <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8c86c9" stopOpacity={0.4} /><stop offset="100%" stopColor="#8c86c9" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#e9eff1" vertical={false} />
                <XAxis dataKey="m" {...axis} /><YAxis {...axis} tickFormatter={(v) => `${v / 1000}k`} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Area dataKey="income" name="Income" stroke="#5aa383" strokeWidth={2.5} fill="url(#inc)" />
                <Area dataKey="spend" name="Spent" stroke="#8c86c9" strokeWidth={2.5} fill="url(#spd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div data-enter className="card p-5">
          <h2 className="text-lg font-semibold">By category</h2>
          <div className="mx-auto mt-2 h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={spendByCategory} dataKey="value" nameKey="label" innerRadius={50} outerRadius={78} paddingAngle={3} stroke="none">{spendByCategory.map((_, i) => <Cell key={i} fill={palette[i]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} /></PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {spendByCategory.map((c, i) => <li key={c.label} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[i] }} />{c.label}</span><span className="text-muted">{Math.round(c.value / total * 100)}%</span></li>)}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div data-enter className="card p-5">
          <h2 className="text-lg font-semibold">Weekly spending</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}><CartesianGrid stroke="#e9eff1" vertical={false} /><XAxis dataKey="w" {...axis} /><YAxis {...axis} tickFormatter={(v) => `${v / 1000}k`} width={34} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} cursor={{ fill: "#f2f5f6" }} /><Bar dataKey="spend" name="Spent" fill="#6aa6ad" radius={[8, 8, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div data-enter className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {insights.map(i => (
            <div key={i.title} className="card p-5"><Badge tone={i.tone}>Insight</Badge><h3 className="mt-3 text-base font-semibold">{i.title}</h3><p className="mt-1.5 text-sm text-muted">{i.body}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
