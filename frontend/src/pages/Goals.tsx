import { FormEvent, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, Target, Trash2 } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import Status from "../components/Status";
import { inr } from "../lib/utils";
import { axis, tooltipStyle } from "../lib/chart";
import { Badge, Button, Field, IconTile, PageHeader, Progress } from "../components/ui";

const tones = ["brand", "sky", "lav"] as const;
interface Raw { id: number; name: string; target: number; saved: number; due: string }
interface Goal extends Raw { tone: (typeof tones)[number] }

function GoalsView({ initial }: { initial: Raw[] }) {
  const ref = usePageEnter();
  const [goals, setGoals] = useState<Goal[]>(() => initial.map((g, i) => ({ ...g, tone: tones[i % 3] })));
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", target: "", months: "12" });
  const [plan, setPlan] = useState({ target: 100000, current: 15000, months: 10 });

  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : "Something went wrong.");

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const target = Number(form.target);
    if (!form.name.trim() || !target) return;
    const due = new Date(); due.setMonth(due.getMonth() + Number(form.months));
    try {
      const g = await api<Raw>("/api/goals", { method: "POST", body: JSON.stringify({ name: form.name.trim(), target, saved: 0, due: due.toLocaleDateString("en-IN", { month: "short", year: "numeric" }) }) });
      setGoals(list => [...list, { ...g, tone: tones[list.length % 3] }]);
      setForm({ name: "", target: "", months: "12" }); setErr("");
    } catch (e) { fail(e); }
  };
  const topUp = async (g: Goal) => {
    const saved = Math.min(g.target, g.saved + 1000);
    try {
      await api(`/api/goals/${g.id}`, { method: "PATCH", body: JSON.stringify({ saved }) });
      setGoals(list => list.map(x => x.id === g.id ? { ...x, saved } : x)); setErr("");
    } catch (e) { fail(e); }
  };
  const remove = async (id: number) => {
    try {
      await api(`/api/goals/${id}`, { method: "DELETE" });
      setGoals(list => list.filter(x => x.id !== id)); setErr("");
    } catch (e) { fail(e); }
  };

  const monthly = Math.max(0, Math.ceil((plan.target - plan.current) / plan.months));
  const proj = useMemo(() => Array.from({ length: plan.months + 1 }, (_, i) => ({ m: i, saved: Math.min(plan.target, plan.current + monthly * i) })), [plan, monthly]);

  return (
    <div ref={ref}>
      <PageHeader title="Savings goals" subtitle="Set a target, see what to put aside each month, and watch it grow." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {goals.map(g => { const pct = g.saved / g.target * 100; return (
            <div key={g.id} data-enter className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><IconTile tone={g.tone === "brand" ? "brand" : g.tone}><Target className="h-5 w-5" /></IconTile><div><p className="font-semibold">{g.name}</p><p className="text-xs text-muted">Target by {g.due}</p></div></div>
                <Badge tone={pct >= 100 ? "mint" : "neutral"}>{pct >= 100 ? "Reached" : `${Math.round(pct)}%`}</Badge>
              </div>
              <div className="mt-4"><Progress value={pct} tone={g.tone} /></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span><b>{inr(g.saved)}</b> <span className="text-muted">of {inr(g.target)}</span></span><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => remove(g.id)} aria-label={`Remove ${g.name}`}><Trash2 className="h-4 w-4" /></Button><Button size="sm" variant="soft" onClick={() => topUp(g)} disabled={pct >= 100}><Plus className="h-4 w-4" /> Add ₹1,000</Button></div></div>
            </div>); })}

          <form data-enter onSubmit={add} className="card grid gap-3 p-5 sm:grid-cols-[1.4fr_1fr_.8fr_auto] sm:items-end">
            <Field label="New goal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wedding gift" />
            <Field label="Target (₹)" inputMode="numeric" value={form.target} onChange={e => setForm({ ...form, target: e.target.value.replace(/\D/g, "") })} />
            <Field label="Months" inputMode="numeric" value={form.months} onChange={e => setForm({ ...form, months: e.target.value.replace(/\D/g, "") })} />
            <Button type="submit"><Plus className="h-4 w-4" /> Add goal</Button>
          </form>
          {err && <p className="text-sm text-rose-ink" role="alert">{err}</p>}
        </div>

        <div data-enter className="card h-fit p-5">
          <h2 className="text-lg font-semibold">Plan a goal</h2>
          <p className="mt-1 text-sm text-muted">Move the sliders to see the monthly amount you need.</p>
          {([["Target", "target", 10000, 500000, 5000], ["Already saved", "current", 0, 500000, 1000], ["Months", "months", 3, 60, 1]] as const).map(([label, key, min, max, step]) => (
            <label key={key} className="mt-4 block">
              <span className="mb-1 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted">{key === "months" ? `${plan[key]} months` : inr(plan[key])}</span></span>
              <input type="range" min={min} max={max} step={step} value={plan[key]} onChange={e => setPlan({ ...plan, [key]: Number(e.target.value) })} className="w-full accent-[#3f7f86]" />
            </label>
          ))}
          <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-center"><p className="text-sm text-brand-700">Save each month</p><p className="font-display text-3xl font-semibold text-brand-700">{inr(monthly)}</p></div>
          <div className="mt-4 h-36"><ResponsiveContainer width="100%" height="100%"><LineChart data={proj}><CartesianGrid stroke="#e9eff1" vertical={false} /><XAxis dataKey="m" {...axis} /><YAxis {...axis} width={0} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} labelFormatter={(l) => `Month ${l}`} /><Line dataKey="saved" stroke="#3f7f86" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const { data, error, loading } = useApi<Raw[]>("/api/goals");
  if (!data) return <Status loading={loading} error={error} />;
  return <GoalsView initial={data} />;
}

