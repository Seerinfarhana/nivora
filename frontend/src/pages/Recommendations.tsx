import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Landmark } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { useApi } from "../lib/useApi";
import Status from "../components/Status";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { Badge, Button, PageHeader } from "../components/ui";
import { cn } from "../lib/utils";

interface Loan { id: string; lender: string; product: string; type: string; rate: string; max_amount?: string; tenure?: string; notes?: string; source_url: string; last_checked: string }

const day = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };

function LoansView({ loans }: { loans: Loan[] }) {
  const ref = usePageEnter();
  const [kind, setKind] = useState("All");
  const kinds = ["All", ...Array.from(new Set(loans.map(l => l.type)))];
  const shown = loans.filter(l => kind === "All" || l.type === kind);

  return (
    <div ref={ref}>
      <PageHeader title="Smart recommendations" subtitle="Loan products currently offered by banks, copied from their official pages with the date we last checked."
        actions={<Link to="/assistant" state={{ prompt: "Am I eligible for a loan?" }}><Button variant="soft">Check my eligibility</Button></Link>} />

      {loans.length === 0 ? (
        <div data-enter className="card p-10 text-center">
          <Landmark className="mx-auto h-8 w-8 text-brand-400" />
          <p className="mt-3 font-semibold">Loan offers are being updated</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">We only show rates that come from a bank&apos;s own website. Please check back soon, or ask the assistant whether you are eligible.</p>
        </div>
      ) : (<>
        <div data-enter className="mb-5 flex flex-wrap items-center gap-2">
          {kinds.map(k => <button key={k} onClick={() => setKind(k)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", kind === k ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted hover:text-ink")}>{k}</button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(l => (
            <SpotlightCard key={l.id} className="p-5">
              <div data-enter className="flex h-full flex-col">
                <div className="flex items-start justify-between"><Badge tone="brand">{l.type}</Badge><span className="text-xs text-muted">Checked {day(l.last_checked)}</span></div>
                <h3 className="mt-3 text-lg font-semibold">{l.product}</h3>
                <p className="text-sm text-muted">{l.lender}</p>
                <p className="mt-3 text-sm font-semibold text-brand-600">{l.rate}</p>
                <dl className="mt-3 flex-1 space-y-1 text-sm text-muted">
                  {l.max_amount && <div className="flex justify-between gap-3"><dt>Amount</dt><dd className="text-right font-medium text-ink">{l.max_amount}</dd></div>}
                  {l.tenure && <div className="flex justify-between gap-3"><dt>Tenure</dt><dd className="text-right font-medium text-ink">{l.tenure}</dd></div>}
                  {l.notes && <p className="pt-2 text-xs">{l.notes}</p>}
                </dl>
                <a href={l.source_url} target="_blank" rel="noopener noreferrer" className="mt-4"><Button size="sm" variant="ghost" className="w-full">See it on the bank&apos;s site <ExternalLink className="h-3.5 w-3.5" /></Button></a>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </>)}
      <p data-enter className="mt-6 text-xs text-muted">Rates and terms change and depend on your profile. This is information, not financial advice. Always confirm with the lender.</p>
    </div>
  );
}

export default function Recommendations() {
  const { data, error, loading } = useApi<Loan[]>("/api/external/loans");
  if (!data) return <Status loading={loading} error={error} />;
  return <LoansView loans={data} />;
}
