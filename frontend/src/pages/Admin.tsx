import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Search } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { useApi } from "../lib/useApi";
import { axis, tooltipStyle } from "../lib/chart";
import Status from "../components/Status";
import CountUp from "../components/reactbits/CountUp";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, PageHeader, Tabs } from "../components/ui";
import { inr } from "../lib/utils";

interface Audit { t: string; user: string; intent: string; action: string; status: string }
interface Overview { customers: number; assistant_actions: number; blocked: number; needs_review: number; intents: { name: string; n: number }[]; audit: Audit[] }
interface Customer { id: string; name: string; email: string; language: string; actions: number; blocked: number; goals: number; goal_saved: number; goal_target: number }

type Tab = "overview" | "customers" | "risk";
const statusTone = { Approved: "mint", Review: "sand", Blocked: "rose" } as const;
const langName: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil" };

function AdminView({ ov, customers }: { ov: Overview; customers: Customer[] }) {
  const ref = usePageEnter();
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const rows = customers.filter(c => !q || (c.name + c.email + c.id).toLowerCase().includes(q.toLowerCase()));
  const kpis = [
    { label: "Customers", value: ov.customers, note: "Registered accounts", tone: "brand" as const },
    { label: "Assistant actions", value: ov.assistant_actions, note: "Logged by the assistant", tone: "lav" as const },
    { label: "Needs review", value: ov.needs_review, note: "Waiting for a human", tone: "sand" as const },
    { label: "Risky actions blocked", value: ov.blocked, note: "Refused by safeguards", tone: "rose" as const },
  ];
  const flagged = (s: string) => ov.audit.filter(a => a.status === s);

  const AuditList = ({ title, items, empty }: { title: string; items: Audit[]; empty: string }) => (
    <div data-enter className="card p-5"><h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 divide-y divide-line">{items.map((a, i) => (
        <li key={i} className="flex gap-3 py-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted" /><div>
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{a.intent}</p><Badge tone={statusTone[a.status as keyof typeof statusTone] ?? "neutral"}>{a.status}</Badge></div>
          <p className="mt-0.5 text-sm text-muted">{a.action}</p><p className="mt-1 text-xs text-muted">{a.user} · {a.t}</p></div></li>))}
        {items.length === 0 && <li className="py-6 text-center text-sm text-muted">{empty}</li>}</ul></div>
  );

  return (
    <div ref={ref}>
      <PageHeader title="Admin console" subtitle="Live view of customers and everything the assistant does on their behalf." actions={<Tabs<Tab> tabs={[{ id: "overview", label: "Overview" }, { id: "customers", label: "Customers" }, { id: "risk", label: "Risk & review" }]} value={tab} onChange={setTab} />} />

      {tab === "overview" && (<>
        <div data-enter className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(k => (
            <SpotlightCard key={k.label} className="p-5"><Badge tone={k.tone}>{k.label}</Badge><p className="font-display mt-3 text-3xl font-semibold"><CountUp to={k.value} /></p><p className="mt-1 text-xs text-muted">{k.note}</p></SpotlightCard>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div data-enter className="card overflow-hidden lg:col-span-2"><div className="p-5 pb-3"><h2 className="text-lg font-semibold">Assistant audit log</h2><p className="text-sm text-muted">Every action the assistant takes is recorded here.</p></div>
            <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-mist/60 text-xs text-muted"><tr>{["Time", "Customer", "Request", "What happened", "Status"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{ov.audit.slice(0, 12).map((a, i) => (
                <tr key={i} className="hover:bg-mist/40"><td className="px-4 py-3 text-muted">{a.t}</td><td className="px-4 py-3">{a.user}</td><td className="px-4 py-3 font-semibold">{a.intent}</td><td className="px-4 py-3">{a.action}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[a.status as keyof typeof statusTone] ?? "neutral"}>{a.status}</Badge></td></tr>))}
                {ov.audit.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No assistant activity yet.</td></tr>}</tbody>
            </table></div></div>
          <div data-enter className="card p-5"><h2 className="text-lg font-semibold">What customers ask</h2><p className="text-sm text-muted">Assistant actions by topic</p>
            <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={ov.intents.slice(0, 7)} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" {...axis} width={120} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f2f5f6" }} /><Bar dataKey="n" name="Actions" fill="#6aa6ad" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></div>
        </div>
      </>)}

      {tab === "customers" && (
        <div data-enter className="card overflow-hidden">
          <div className="border-b border-line p-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="field pl-9" placeholder="Search by name, email or ID" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" /></div></div>
          <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-mist/60 text-xs text-muted"><tr>{["ID", "Customer", "Email", "Language", "Goals", "Saved toward goals", "Assistant actions", "Blocked"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map(c => (
              <tr key={c.id} className="hover:bg-mist/40"><td className="px-4 py-3 text-muted">{c.id}</td><td className="px-4 py-3 font-semibold">{c.name}</td><td className="px-4 py-3">{c.email}</td><td className="px-4 py-3">{langName[c.language] ?? c.language}</td>
                <td className="px-4 py-3">{c.goals}</td><td className="px-4 py-3">{inr(c.goal_saved)} <span className="text-muted">of {inr(c.goal_target)}</span></td><td className="px-4 py-3">{c.actions}</td><td className="px-4 py-3"><Badge tone={c.blocked ? "rose" : "neutral"}>{c.blocked}</Badge></td></tr>))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No customers match your search.</td></tr>}</tbody>
          </table></div>
        </div>
      )}

      {tab === "risk" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <AuditList title="Blocked by safeguards" items={flagged("Blocked")} empty="Nothing has been blocked." />
          <AuditList title="Needs human review" items={flagged("Review")} empty="Nothing is waiting for review." />
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const ov = useApi<Overview>("/api/admin/overview");
  const cu = useApi<Customer[]>("/api/admin/customers");
  if (!ov.data || !cu.data) return <Status loading={ov.loading || cu.loading} error={ov.error || cu.error} />;
  return <AdminView ov={ov.data} customers={cu.data} />;
}
