import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Send, Receipt, CreditCard, Sparkles, Landmark, PiggyBank, Wallet, TrendingUp } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { usePageEnter } from "../lib/usePageEnter";
import { useAuth } from "../context/AuthContext";
import { accounts, transactions, spendByCategory, monthly, goals } from "../lib/mockData";
import { inr } from "../lib/utils";
import { palette, tooltipStyle } from "../lib/chart";
import CountUp from "../components/reactbits/CountUp";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, Button, IconTile, PageHeader, Progress } from "../components/ui";

const quick = [
  { label: "Send money", icon: Send, prompt: "Send ₹500 to Ravi", tone: "brand" as const },
  { label: "Pay a bill", icon: Receipt, prompt: "How much did I spend this month?", tone: "sky" as const },
  { label: "Block card", icon: CreditCard, prompt: "Block my debit card", tone: "rose" as const },
  { label: "Ask NIVORA", icon: Sparkles, prompt: "What is my balance?", tone: "lav" as const },
];
const accIcon = { savings: Wallet, rd: PiggyBank, fd: Landmark } as const;

export default function Dashboard() {
  const ref = usePageEnter();
  const { user } = useAuth();
  const go = useNavigate();
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const spendTotal = spendByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div ref={ref}>
      <PageHeader title={`${hello}, ${user?.name.split(" ")[0]}`} subtitle="Here is where your money stands today." actions={<Link to="/assistant"><Button><Sparkles className="h-4 w-4" /> Ask NIVORA</Button></Link>} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Balance hero */}
        <div data-enter className="card relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 via-brand-50 to-lav p-6 sm:p-8 lg:col-span-2">
          <p className="text-sm font-medium text-brand-700">Total balance across 3 accounts</p>
          <p className="font-display mt-2 text-4xl font-semibold sm:text-5xl"><CountUp to={total} prefix="₹" decimals={2} /></p>
          <div className="mt-3 flex items-center gap-2 text-sm text-brand-700"><Badge tone="mint"><TrendingUp className="h-3 w-3" /> +₹3,980</Badge> since last month</div>
          <div className="mt-4 h-28 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly.map(m => ({ ...m, saved: m.income - m.spend }))}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3f7f86" stopOpacity={0.35} /><stop offset="100%" stopColor="#3f7f86" stopOpacity={0} /></linearGradient></defs>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} labelFormatter={(l) => `Saved in ${l}`} />
                <Area dataKey="saved" stroke="#3f7f86" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div data-enter className="grid grid-cols-2 gap-3">
          {quick.map(({ label, icon: Icon, prompt, tone }) => (
            <SpotlightCard key={label} className="cursor-pointer p-4" onClick={() => go("/assistant", { state: { prompt } })}>
              <IconTile tone={tone}><Icon className="h-5 w-5" /></IconTile>
              <p className="mt-3 text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted">Via assistant</p>
            </SpotlightCard>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div data-enter className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent transactions</h2><Link to="/insights" className="flex items-center gap-1 text-sm font-semibold text-brand-600">See analytics <ArrowUpRight className="h-4 w-4" /></Link></div>
          <ul className="divide-y divide-line">
            {transactions.slice(0, 6).map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mist text-sm font-semibold text-brand-700">{t.merchant[0]}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{t.merchant}</p><p className="text-xs text-muted">{t.date} · {t.category} · {t.channel}</p></div>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${t.amount > 0 ? "text-mint-ink" : ""}`}>{t.amount > 0 ? "+" : "-"}{inr(t.amount)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <div data-enter className="card p-5">
            <h2 className="text-lg font-semibold">Spent this month</h2>
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={spendByCategory} dataKey="value" nameKey="label" innerRadius={56} outerRadius={80} paddingAngle={3} stroke="none">{spendByCategory.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} /></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="font-display text-xl font-semibold">{inr(spendTotal)}</p><p className="text-xs text-muted">this month</p></div></div>
            </div>
          </div>
          <div data-enter className="card p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Goals</h2><Link to="/goals" className="text-sm font-semibold text-brand-600">Manage</Link></div>
            <div className="space-y-4">{goals.map(g => (
              <div key={g.id}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{g.name}</span><span className="text-muted">{Math.round(g.saved / g.target * 100)}%</span></div><Progress value={g.saved / g.target * 100} tone={g.tone} /></div>
            ))}</div>
          </div>
        </div>
      </div>

      <div data-enter className="mt-5 grid gap-3 sm:grid-cols-3">
        {accounts.map(a => { const I = accIcon[a.type as keyof typeof accIcon]; return (
          <SpotlightCard key={a.id} className="p-5">
            <div className="flex items-center gap-3"><IconTile tone="brand"><I className="h-5 w-5" /></IconTile><div><p className="text-sm font-semibold">{a.name}</p><p className="text-xs text-muted">{a.mask}</p></div></div>
            <p className="font-display mt-4 text-2xl font-semibold">{inr(a.balance, 2)}</p>
          </SpotlightCard>); })}
      </div>
    </div>
  );
}
