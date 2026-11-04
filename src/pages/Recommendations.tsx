import { useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, X } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { recommendations as seed } from "../lib/mockData";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, Button, PageHeader, Progress } from "../components/ui";
import { cn } from "../lib/utils";

export default function Recommendations() {
  const ref = usePageEnter();
  const [items, setItems] = useState(seed);
  const [kind, setKind] = useState("All");
  const kinds = ["All", ...Array.from(new Set(seed.map(s => s.kind)))];
  const shown = items.filter(i => kind === "All" || i.kind === kind);

  return (
    <div ref={ref}>
      <PageHeader title="Smart recommendations" subtitle="Suggestions based on how you save and spend. Each one explains why it fits you." />
      <div data-enter className="mb-5 flex flex-wrap items-center gap-2">
        {kinds.map(k => <button key={k} onClick={() => setKind(k)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", kind === k ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted hover:text-ink")}>{k}</button>)}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center"><Lightbulb className="mx-auto h-8 w-8 text-brand-400" /><p className="mt-3 font-semibold">You are all caught up</p><p className="text-sm text-muted">New suggestions appear as your activity changes.</p><Button className="mt-4" variant="soft" onClick={() => setItems(seed)}>Show dismissed suggestions</Button></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(r => (
            <SpotlightCard key={r.id} className="p-5">
              <div data-enter className="flex h-full flex-col">
                <div className="flex items-start justify-between"><Badge tone={r.tone}>{r.kind}</Badge><button aria-label="Dismiss suggestion" onClick={() => setItems(p => p.filter(x => x.id !== r.id))} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></div>
                <h3 className="mt-3 text-lg font-semibold">{r.title}</h3>
                <p className="text-sm font-semibold text-brand-600">{r.rate}</p>
                <p className="mt-3 flex-1 text-sm text-muted"><span className="font-semibold text-ink">Why this fits: </span>{r.why}</p>
                <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted"><span>Match</span><span>{r.match}%</span></div><Progress value={r.match} tone={r.tone === "brand" ? "brand" : r.tone === "mint" ? "mint" : r.tone === "sky" ? "sky" : "lav"} /></div>
                <div className="mt-4 flex gap-2"><Button size="sm" className="flex-1">{r.cta}</Button><Link to="/assistant" state={{ prompt: "Am I eligible for a loan?" }}><Button size="sm" variant="ghost">Ask NIVORA</Button></Link></div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
      <p data-enter className="mt-6 text-xs text-muted">Recommendations are informational, not financial advice. You can turn personalisation off in Profile &amp; security.</p>
    </div>
  );
}
