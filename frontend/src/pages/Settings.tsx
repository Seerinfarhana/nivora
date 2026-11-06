import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { Prefs, useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { inr } from "../lib/utils";
import { Badge, Button, Field, PageHeader, Tabs, Toggle } from "../components/ui";
import DeleteAccount from "../components/DeleteAccount";

type Tab = "profile" | "prefs" | "security";
interface Device { id: number; device: string; kind: string; os: string; browser: string; ip: string; last_active: string; current: boolean }
interface Finance { onboarded: boolean; user_type: string; monthly_income: number; monthly_revenue: number; monthly_spend: number; investments: string[] }

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-6 py-4"><div><p className="text-sm font-semibold">{title}</p><p className="text-sm text-muted">{desc}</p></div>{children}</div>;
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "Active now";
  if (m < 60) return `Active ${m} min ago`;
  if (m < 1440) return `Active ${Math.round(m / 60)} hr ago`;
  return `Last active ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
};
const deviceIcon = (k: string) => (k === "Phone" ? Smartphone : k === "Tablet" ? Tablet : Monitor);
const goodPin = (p: string) => /^\d{4,6}$/.test(p) && new Set(p).size > 1;
const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function Settings() {
  const ref = usePageEnter();
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState("");
  const [p, setP] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [profErr, setProfErr] = useState("");
  const [limit, setLimit] = useState(user?.txn_limit ?? 100000);
  const [pin, setPin] = useState({ cur: "", next: "", again: "" });
  const [pinErr, setPinErr] = useState("");
  const [pw, setPw] = useState({ cur: "", next: "", again: "" });
  const [pwErr, setPwErr] = useState("");
  const fin = useApi<Finance>("/api/profile");
  const dev = useApi<Device[]>("/api/auth/sessions");
  const prefs: Prefs = user?.prefs ?? {};
  const size = prefs.textSize ?? 16;

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);
  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (p.name.trim().length < 2) return setProfErr("Enter your full name.");
    if (p.phone && !/^\d{10}$/.test(p.phone)) return setProfErr("Enter a 10-digit mobile number.");
    try { setUser(await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name: p.name, phone: p.phone }) })); setProfErr(""); setToast("Profile saved"); }
    catch (err) { setProfErr(msg(err, "Could not save your profile.")); }
  };

  // Preferences save the moment you change them
  const savePref = async (patch: Partial<Prefs>) => {
    setUser({ ...user, prefs: { ...prefs, ...patch } });
    try { setUser(await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ prefs: patch }) })); }
    catch (err) { setToast(msg(err, "Could not save that.")); setUser(user); }
  };

  const saveLimit = async () => {
    try { setUser(await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ txn_limit: limit }) })); setToast("Daily limit updated"); }
    catch (err) { setToast(msg(err, "Could not update the limit.")); }
  };

  const savePin = async (e: FormEvent) => {
    e.preventDefault();
    if (!goodPin(pin.next)) return setPinErr("Your new PIN needs 4 to 6 digits and cannot be all the same digit, like 1111.");
    if (pin.next !== pin.again) return setPinErr("The new PIN and confirmation do not match.");
    try {
      await api("/api/auth/change-pin", { method: "POST", body: JSON.stringify({ current_pin: pin.cur, new_pin: pin.next }) });
      setPinErr(""); setPin({ cur: "", next: "", again: "" }); setToast("PIN updated");
    } catch (err) { setPinErr(msg(err, "Could not update the PIN.")); }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return setPwErr("Use 8 or more characters.");
    if (pw.next !== pw.again) return setPwErr("The new password and confirmation do not match.");
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: pw.cur, new_password: pw.next }) });
      setPwErr(""); setPw({ cur: "", next: "", again: "" }); setToast("Password updated");
    } catch (err) { setPwErr(msg(err, "Could not update the password.")); }
  };

  const signOutDevice = async (id: number) => {
    try { await api(`/api/auth/sessions/${id}`, { method: "DELETE" }); dev.reload(); setToast("Device signed out"); }
    catch (err) { setToast(msg(err, "Could not sign that device out.")); }
  };

  const T = (k: keyof Prefs, fallback: boolean) => ({ checked: (prefs[k] as boolean | undefined) ?? fallback, onChange: (v: boolean) => savePref({ [k]: v }) });
  const initials = user.name.split(" ").map(s => s[0]).slice(0, 2).join("");
  const f = fin.data;
  const income = f ? (f.user_type === "business" && f.monthly_revenue ? f.monthly_revenue : f.monthly_income) : 0;

  return (
    <div ref={ref}>
      <PageHeader title="Profile & security" subtitle="Manage your details, how NIVORA behaves, and how your account stays safe." />
      <div data-enter className="mb-5"><Tabs<Tab> tabs={[{ id: "profile", label: "Profile" }, { id: "prefs", label: "Preferences" }, { id: "security", label: "Security" }]} value={tab} onChange={setTab} /></div>

      {tab === "profile" && (
        <div data-enter className="grid gap-5 lg:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-100 font-display text-2xl font-semibold text-brand-700">{initials}</div>
            <p className="mt-3 font-semibold">{user.name}</p><p className="text-sm text-muted">Customer ID C-{String(user.id).padStart(5, "0")}</p>
            <Badge tone="neutral" className="mt-3">{user.user_type === "business" ? "Business account" : "Personal account"}</Badge>
          </div>
          <div className="space-y-5 lg:col-span-2">
            <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={saveProfile}>
              <Field label="Full name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} />
              <Field label="Email" type="email" value={user.email} readOnly hint="Your email is your sign-in ID, so it cannot be changed here." />
              <Field label="Mobile number" inputMode="numeric" maxLength={10} value={p.phone} onChange={e => setP({ ...p, phone: e.target.value.replace(/\D/g, "") })} />
              {profErr && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink sm:col-span-2">{profErr}</p>}
              <div className="sm:col-span-2"><Button type="submit">Save changes</Button></div>
            </form>
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-lg font-semibold">Your money details</h2><p className="text-sm text-muted">What you told us. Your dashboard and insights are built from this.</p></div>
                <Link to="/onboarding?edit=1"><Button size="sm" variant="soft">Update</Button></Link>
              </div>
              {f && (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted">{f.user_type === "business" ? "Monthly revenue" : "Monthly income"}</dt><dd className="font-semibold">{income ? inr(income) : "Not set"}</dd></div>
                  <div><dt className="text-muted">Monthly spending</dt><dd className="font-semibold">{f.monthly_spend ? inr(f.monthly_spend) : "Not set"}</dd></div>
                  <div><dt className="text-muted">Investments</dt><dd className="font-semibold">{f.investments.length ? f.investments.join(", ") : "None added"}</dd></div>
                </dl>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "prefs" && (
        <div data-enter className="grid gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Display and assistant</h2>
            <div className="mt-4"><span className="mb-1.5 block text-sm font-medium">Text size</span>
              <div className="inline-flex gap-2">{[[16, "Standard"], [18, "Large"], [20, "Extra large"]].map(([v, l]) => <button key={v} onClick={() => savePref({ textSize: v as number })} className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${size === v ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted"}`}>{l}</button>)}</div></div>
            <div className="divide-y divide-line"><Row title="Spoken replies" desc="The assistant reads answers aloud."><Toggle {...T("spokenReplies", false)} label="Spoken replies" /></Row></div>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Notifications and data use</h2>
            <div className="divide-y divide-line">
              <Row title="Transaction alerts" desc="Every debit and credit."><Toggle {...T("txnAlerts", true)} label="Transaction alerts" /></Row>
              <Row title="Bill reminders" desc="Three days before a due date."><Toggle {...T("billReminders", true)} label="Bill reminders" /></Row>
              <Row title="Offers" desc="Product news and offers."><Toggle {...T("offers", false)} label="Offers" /></Row>
              <Row title="Personalised suggestions" desc="Use my activity to suggest products."><Toggle {...T("personalised", true)} label="Personalised suggestions" /></Row>
              <Row title="Let the assistant use my account data" desc="Masked, and only to answer my questions."><Toggle {...T("assistantData", true)} label="Assistant data access" /></Row>
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div data-enter className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <form onSubmit={savePin} className="card space-y-4 p-6">
              <h2 className="text-lg font-semibold">Change transaction PIN</h2>
              <Field label="Current PIN" type="password" inputMode="numeric" maxLength={6} value={pin.cur} onChange={e => setPin({ ...pin, cur: e.target.value.replace(/\D/g, "") })} />
              <Field label="New PIN" type="password" inputMode="numeric" maxLength={6} value={pin.next} onChange={e => setPin({ ...pin, next: e.target.value.replace(/\D/g, "") })} hint="4 to 6 digits, not all the same." />
              <Field label="Confirm new PIN" type="password" inputMode="numeric" maxLength={6} value={pin.again} onChange={e => setPin({ ...pin, again: e.target.value.replace(/\D/g, "") })} />
              {pinErr && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{pinErr}</p>}
              <Button type="submit">Update PIN</Button>
            </form>
            <form onSubmit={savePassword} className="card space-y-4 p-6">
              <h2 className="text-lg font-semibold">Change password</h2>
              <Field label="Current password" type="password" autoComplete="current-password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} />
              <Field label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} hint="Use 8 or more characters." />
              <Field label="Confirm new password" type="password" autoComplete="new-password" value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} />
              {pwErr && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{pwErr}</p>}
              <Button type="submit">Update password</Button>
            </form>
          </div>

          <div className="space-y-5">
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Daily transfer limit</h2>
              <p className="mt-1 text-sm text-muted">The assistant refuses any transfer that would pass this amount in a day.</p>
              <label className="mt-4 block"><span className="mb-1 flex justify-between text-sm"><span className="font-medium">Limit</span><span className="text-muted">{inr(limit)}</span></span>
                <input type="range" min={10000} max={200000} step={10000} value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full accent-[#3f7f86]" /></label>
              <Button className="mt-3" size="sm" disabled={limit === user.txn_limit} onClick={saveLimit}>Save limit</Button>
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Signed-in devices</h2>
              <p className="mt-1 text-sm text-muted">Every place your account is signed in. Sign out any you do not recognise.</p>
              {dev.error && <p className="mt-3 text-sm text-rose-ink">{dev.error}</p>}
              <ul className="mt-2 divide-y divide-line">{(dev.data ?? []).map(d => { const I = deviceIcon(d.kind); return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3"><I className="h-5 w-5 shrink-0 text-muted" />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{d.device}</p><p className="truncate text-xs text-muted">{[d.os, d.browser, d.ip].filter(Boolean).join(" · ")} · {d.current ? "Active now" : ago(d.last_active)}</p></div></div>
                  {d.current ? <Badge tone="mint">This device</Badge> : <Button size="sm" variant="danger" onClick={() => signOutDevice(d.id)}>Sign out</Button>}
                </li>); })}</ul>
            </div>
            <DeleteAccount />
          </div>
        </div>
      )}

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  );
}
