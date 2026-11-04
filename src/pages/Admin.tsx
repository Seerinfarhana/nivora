import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { adminDaily, adminIntents, adminKpis, customersTable, kycQueue, riskAlerts } from "../lib/mockData";
import { axis, tooltipStyle } from "../lib/chart";
import CountUp from "../components/reactbits/CountUp";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, Button, PageHeader, Tabs } from "../components/ui";

type Tab = "overview" | "customers" | "risk";
const sevTone = { High: "rose", Medium: "sand", Low: "sky" } as const;
const kycTone = { Verified: "mint", Pending: "sand", Review: "rose" } as const;

export default function Admin() {
  const ref = usePageEnter();
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState(kycQueue);
  const [done, setDone] = useState<Record<string, "approved" | "rejected">>({});
  const rows = customersTable.filter(c => !q || (c.name + c.city + c.segment + c.id).toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref}>
      <PageHeader title="Admin console" subtitle="Live view of customers, assistant activity, risk and KYC for the operations team." actions={<Tabs<Tab> tabs={[{ id: "overview", label: "Overview" }, { id: "customers", label: "Customers" }, { id: "risk", label: "Risk & KYC" }]} value={tab} onChange={setTab} />} />

      {tab === "overview" && (<>
        <div data-enter className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {adminKpis.map(k => (
            <SpotlightCard key={k.label} className="p-5"><Badge tone={k.tone}>{k.label}</Badge><p className="font-display mt-3 text-3xl font-semibold"><CountUp to={k.value} /></p><p className="mt-1 text-xs text-muted">{k.delta} vs last week</p></SpotlightCard>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div data-enter className="card p-5 lg:col-span-2"><h2 className="text-lg font-semibold">Assistant conversations</h2><p className="text-sm text-muted">Total chats and chats resolved without a human.</p>
            <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={adminDaily}><CartesianGrid stroke="#e9eff1" vertical={false} /><XAxis dataKey="d" {...axis} /><YAxis {...axis} width={40} tickFormatter={v => `${v / 1000}k`} /><Tooltip contentStyle={tooltipStyle} /><Line dataKey="chats" name="Chats" stroke="#3f7f86" strokeWidth={2.5} dot={false} /><Line dataKey="resolved" name="Resolved" stroke="#8c86c9" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></div>
          <div data-enter className="card p-5"><h2 className="text-lg font-semibold">What customers ask</h2><p className="text-sm text-muted">Share of chats by topic (%)</p>
            <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={adminIntents} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="label" {...axis} width={120} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f2f5f6" }} /><Bar dataKey="value" name="Share %" fill="#6aa6ad" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></div>
        </div>
      </>)}

      {tab === "customers" && (
        <div data-enter className="card overflow-hidden">
          <div className="border-b border-line p-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="field pl-9" placeholder="Search by name, city or ID" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" /></div></div>
          <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-mist/60 text-xs text-muted"><tr>{["ID", "Customer", "City", "Segment", "KYC", "Risk"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map(c => (
              <tr key={c.id} className="hover:bg-mist/40"><td className="px-4 py-3 text-muted">{c.id}</td><td className="px-4 py-3 font-semibold">{c.name}</td><td className="px-4 py-3">{c.city}</td><td className="px-4 py-3">{c.segment}</td>
                <td className="px-4 py-3"><Badge tone={kycTone[c.kyc as keyof typeof kycTone]}>{c.kyc}</Badge></td><td className="px-4 py-3"><Badge tone={sevTone[c.risk as keyof typeof sevTone]}>{c.risk}</Badge></td></tr>))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No customers match your search.</td></tr>}</tbody>
          </table></div>
        </div>
      )}

      {tab === "risk" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div data-enter className="card p-5"><h2 className="text-lg font-semibold">Risk alerts</h2>
            <ul className="mt-3 divide-y divide-line">{riskAlerts.map(a => (
              <li key={a.id} className="flex gap-3 py-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted" /><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{a.title}</p><Badge tone={sevTone[a.sev as keyof typeof sevTone]}>{a.sev}</Badge></div><p className="mt-0.5 text-sm text-muted">{a.detail}</p><p className="mt-1 text-xs text-muted">{a.when}</p></div></li>))}</ul></div>
          <div data-enter className="card p-5"><h2 className="text-lg font-semibold">KYC review queue</h2>
            <ul className="mt-3 divide-y divide-line">{queue.map(k => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{k.name}</p><p className="text-xs text-muted">{k.doc} · waiting {k.wait}</p></div>
                {done[k.id] ? <Badge tone={done[k.id] === "approved" ? "mint" : "rose"}>{done[k.id] === "approved" ? "Approved" : "Rejected"}</Badge> : <div className="flex gap-2"><Button size="sm" onClick={() => setDone(d => ({ ...d, [k.id]: "approved" }))}><Check className="h-4 w-4" /> Approve</Button><Button size="sm" variant="danger" onClick={() => setDone(d => ({ ...d, [k.id]: "rejected" }))}><X className="h-4 w-4" /> Reject</Button></div>}</li>))}
              {queue.length === 0 && <li className="py-6 text-center text-sm text-muted">The queue is empty.</li>}</ul>
            {Object.keys(done).length > 0 && <Button className="mt-2" variant="ghost" size="sm" onClick={() => { setQueue(q => q.filter(k => !done[k.id])); setDone({}); }}>Clear reviewed</Button>}</div>
        </div>
      )}
    </div>
  );
}
