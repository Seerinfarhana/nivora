import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import Logo from "../components/Logo";
import { Button, Field } from "../components/ui";
import { usePageEnter } from "../lib/usePageEnter";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

const CATS = ["Food", "Shopping", "Bills", "Transport", "Health", "Leisure"];
const INVEST = ["SIP / mutual funds", "Fixed deposit", "Recurring deposit", "Stocks", "Gold", "PPF / NPS", "Insurance", "Nothing yet"];
const num = (v: string) => Number(v.replace(/,/g, "")) || 0;
const digits = (v: string) => v.replace(/\D/g, "");

interface Profile { user_type: string; monthly_income: number; monthly_revenue: number; monthly_spend: number; spend_split: Record<string, number>; investments: string[] }

export default function Onboarding() {
  const ref = usePageEnter();
  const go = useNavigate();
  const { user, refresh } = useAuth();
  const [params] = useSearchParams();
  const edit = params.get("edit") === "1" || !!user?.onboarded;   // already onboarded: this is "update my details"
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [type, setType] = useState<"individual" | "business">("individual");
  const [income, setIncome] = useState("");
  const [revenue, setRevenue] = useState("");
  const [spend, setSpend] = useState("");
  const [split, setSplit] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState("");
  const [goals, setGoals] = useState<{ name: string; target: string; saved: string }[]>([]);
  const [invest, setInvest] = useState<string[]>([]);

  useEffect(() => {
    if (!edit) return;
    api<Profile>("/api/profile").then(p => {
      setType(p.user_type === "business" ? "business" : "individual");
      setIncome(p.monthly_income ? String(p.monthly_income) : ""); setRevenue(p.monthly_revenue ? String(p.monthly_revenue) : "");
      setSpend(p.monthly_spend ? String(p.monthly_spend) : "");
      setSplit(Object.fromEntries(Object.entries(p.spend_split).map(([k, v]) => [k, String(v)])));
      setInvest(p.investments);
    }).catch(() => {});
  }, [edit]);

  const last = 2;
  const validate = () => {
    if (step === 0 && num(income) <= 0 && !(type === "business" && num(revenue) > 0)) return type === "business" ? "Enter your monthly income or your business revenue." : "Enter your monthly income.";
    if (step === 1) {
      if (num(spend) <= 0 && Object.values(split).every(v => num(v) <= 0)) return "Enter roughly how much you spend each month.";
      const parts = Object.values(split).reduce((s, v) => s + num(v), 0);
      if (num(spend) > 0 && parts > num(spend)) return "Your category amounts add up to more than your total spending.";
    }
    return "";
  };
  const next = () => { const e = validate(); setErr(e); if (!e) setStep(step + 1); };

  const finish = async () => {
    setBusy(true); setErr("");
    try {
      await api("/api/profile/onboarding", { method: "POST", body: JSON.stringify({
        user_type: type, monthly_income: num(income), monthly_revenue: type === "business" ? num(revenue) : 0,
        monthly_spend: num(spend),
        spend_split: Object.fromEntries(Object.entries(split).map(([k, v]) => [k, num(v)]).filter(([, v]) => (v as number) > 0)),
        opening_balance: edit ? undefined : num(balance),
        goals: edit ? [] : goals.filter(g => g.name.trim() && num(g.target) > 0).map(g => ({ name: g.name.trim(), target: num(g.target), saved: num(g.saved) })),
        investments: invest.filter(i => i !== "Nothing yet"),
      }) });
      await refresh();
      go(edit ? "/settings" : "/dashboard");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save. Please try again."); }
    finally { setBusy(false); }
  };

  const toggle = (i: string) => setInvest(p => (i === "Nothing yet" ? (p.includes(i) ? [] : [i]) : p.includes(i) ? p.filter(x => x !== i) : [...p.filter(x => x !== "Nothing yet"), i]));
  const money = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(digits(e.target.value));

  return (
    <div ref={ref} className="mx-auto max-w-xl px-5 py-10">
      <div data-enter><Logo /></div>
      <h1 data-enter className="mt-8 text-3xl font-semibold">{edit ? "Update your money details" : `Welcome, ${user?.name.split(" ")[0]}. Tell us about your money`}</h1>
      <p data-enter className="mt-2 text-sm text-muted">We use this to build your dashboard and insights. Nothing here is shared, and you can change it later in Profile &amp; security.</p>
      <div data-enter className="mt-6 flex gap-2" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map(i => <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-brand-500" : "bg-line")} />)}</div>

      <div data-enter className="card mt-6 space-y-5 p-6">
        {step === 0 && (<>
          <div>
            <span className="mb-1.5 block text-sm font-medium">I am</span>
            <div className="grid grid-cols-2 gap-3">
              {([["individual", "An individual"], ["business", "A business owner"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setType(k)} className={cn("rounded-xl border px-4 py-3 text-sm font-semibold transition", type === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white text-muted")}>{l}</button>
              ))}
            </div>
          </div>
          <Field label="Monthly income (₹)" inputMode="numeric" value={income} onChange={money(setIncome)} hint={type === "business" ? "Your own take-home from the business or a job. Leave blank if none." : "Salary or other money you receive each month."} />
          {type === "business" && <Field label="Monthly business revenue (₹)" inputMode="numeric" value={revenue} onChange={money(setRevenue)} hint="Total sales you bring in each month." />}
        </>)}

        {step === 1 && (<>
          <Field label="How much do you spend in a month? (₹)" inputMode="numeric" value={spend} onChange={money(setSpend)} hint="A rough total is fine." />
          <div>
            <span className="mb-2 block text-sm font-medium">Where does it go? <span className="font-normal text-muted">(optional)</span></span>
            <div className="grid grid-cols-2 gap-3">
              {CATS.map(c => <Field key={c} label={c} inputMode="numeric" value={split[c] ?? ""} onChange={e => setSplit({ ...split, [c]: digits(e.target.value) })} />)}
            </div>
          </div>
          {!edit && <Field label="Money in your savings account now (₹)" inputMode="numeric" value={balance} onChange={money(setBalance)} hint="This becomes your opening balance." />}
        </>)}

        {step === 2 && (<>
          {!edit && (
            <div>
              <span className="mb-2 block text-sm font-medium">What are you saving for? <span className="font-normal text-muted">(optional)</span></span>
              <div className="space-y-3">
                {goals.map((g, i) => (
                  <div key={i} className="grid grid-cols-[1fr_7rem_2.5rem] gap-2">
                    <input className="field" placeholder="Goal, e.g. New phone" aria-label="Goal name" value={g.name} onChange={e => setGoals(goals.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input className="field" placeholder="Target ₹" aria-label="Target amount" inputMode="numeric" value={g.target} onChange={e => setGoals(goals.map((x, j) => j === i ? { ...x, target: digits(e.target.value) } : x))} />
                    <button type="button" aria-label="Remove goal" onClick={() => setGoals(goals.filter((_, j) => j !== i))} className="grid place-items-center rounded-xl border border-line text-muted hover:text-rose-ink"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button type="button" variant="soft" size="sm" onClick={() => setGoals([...goals, { name: "", target: "", saved: "0" }])}><Plus className="h-4 w-4" /> Add a goal</Button>
              </div>
            </div>
          )}
          <div>
            <span className="mb-2 block text-sm font-medium">Where do you invest?</span>
            <div className="flex flex-wrap gap-2">
              {INVEST.map(i => <button key={i} type="button" aria-pressed={invest.includes(i)} onClick={() => toggle(i)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", invest.includes(i) ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted hover:text-ink")}>{i}</button>)}
            </div>
          </div>
        </>)}

        {err && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{err}</p>}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }}>Back</Button>
          {step < last ? <Button type="button" onClick={next}>Continue</Button> : <Button type="button" disabled={busy} onClick={finish}>{edit ? "Save changes" : "Open my dashboard"}</Button>}
        </div>
      </div>
    </div>
  );
}
