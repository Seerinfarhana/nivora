import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Clock, Search, X, Sparkles } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { articles, faqs } from "../lib/mockData";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, Button, PageHeader } from "../components/ui";
import { cn } from "../lib/utils";

export default function Knowledge() {
  const ref = usePageEnter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(0);
  const [reading, setReading] = useState<(typeof articles)[number] | null>(null);
  const cats = ["All", ...Array.from(new Set(articles.map(a => a.cat)))];
  const s = q.trim().toLowerCase();
  const list = articles.filter(a => (cat === "All" || a.cat === cat) && (!s || (a.title + a.body).toLowerCase().includes(s)));
  const fq = faqs.filter(f => !s || (f.q + f.a).toLowerCase().includes(s));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setReading(null);
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, []);

  return (
    <div ref={ref}>
      <PageHeader title="Knowledge centre" subtitle="Plain-language guides on payments, safety, savings and loans." />
      <div data-enter className="card flex flex-col gap-4 bg-gradient-to-r from-brand-50 to-lav p-5 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="field pl-9" placeholder="Search guides and answers" value={q} onChange={e => setQ(e.target.value)} aria-label="Search the knowledge centre" /></div>
        <Link to="/assistant"><Button variant="soft"><Sparkles className="h-4 w-4" /> Ask the assistant instead</Button></Link>
      </div>

      <div data-enter className="mt-5 flex flex-wrap gap-2">
        {cats.map(c => <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", cat === c ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted hover:text-ink")}>{c}</button>)}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map(a => (
          <SpotlightCard key={a.id} className="cursor-pointer p-5" onClick={() => setReading(a)}>
            <div data-enter><Badge tone="brand">{a.cat}</Badge><h3 className="mt-3 text-base font-semibold">{a.title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{a.body}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> {a.mins} min read</p></div>
          </SpotlightCard>
        ))}
        {list.length === 0 && <p className="text-sm text-muted md:col-span-2">No guides match your search. Try a shorter word, or ask the assistant.</p>}
      </div>

      <h2 data-enter className="mb-3 mt-10 text-xl font-semibold">Common questions</h2>
      <div data-enter className="card divide-y divide-line">
        {fq.map((f, i) => (
          <div key={f.q}>
            <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{f.q}<ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open === i && "rotate-180")} /></button>
            <div className={cn("grid transition-[grid-template-rows] duration-300", open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}><div className="overflow-hidden"><p className="px-5 pb-4 text-sm text-muted">{f.a}</p></div></div>
          </div>
        ))}
        {fq.length === 0 && <p className="p-5 text-sm text-muted">No questions match your search.</p>}
      </div>

      {reading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setReading(null)} role="dialog" aria-modal="true" aria-label={reading.title}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6" data-lenis-prevent onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><Badge tone="brand">{reading.cat}</Badge><h2 className="mt-3 text-2xl font-semibold">{reading.title}</h2></div><button onClick={() => setReading(null)} aria-label="Close"><X className="h-5 w-5 text-muted" /></button></div>
            <p className="mt-4 leading-relaxed text-muted">{reading.body}</p>
            <div className="mt-6 flex gap-2"><Link to="/assistant"><Button size="sm">Ask a follow-up</Button></Link><Button size="sm" variant="ghost" onClick={() => setReading(null)}>Close</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
