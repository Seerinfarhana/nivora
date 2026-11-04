import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, Smartphone, Monitor } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { useAuth } from "../context/AuthContext";
import { devices } from "../lib/mockData";
import { inr } from "../lib/utils";
import { Badge, Button, Field, PageHeader, Tabs, Toggle } from "../components/ui";

type Tab = "profile" | "prefs" | "security";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-6 py-4"><div><p className="text-sm font-semibold">{title}</p><p className="text-sm text-muted">{desc}</p></div>{children}</div>;
}

export default function Settings() {
  const ref = usePageEnter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState("");
  const [size, setSize] = useState(16);
  const [limit, setLimit] = useState(100000);
  const [p, setP] = useState({ name: user?.name || "", email: user?.email || "", phone: "9840012345", city: "Chennai" });
  const [pref, setPref] = useState({ lang: "en", voice: false, txn: true, bills: true, offers: false, personal: true, ai: true });
  const [sec, setSec] = useState({ twofa: true, bio: false });
  const [pin, setPin] = useState({ cur: "", next: "", again: "" });
  const [pinErr, setPinErr] = useState("");

  useEffect(() => { document.documentElement.style.fontSize = `${size}px`; return () => { document.documentElement.style.fontSize = ""; }; }, [size]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  const savePin = (e: FormEvent) => {
    e.preventDefault();
    if (pin.next.length < 4) return setPinErr("Your new PIN needs at least 4 digits.");
    if (pin.next !== pin.again) return setPinErr("The new PIN and confirmation do not match.");
    setPinErr(""); setPin({ cur: "", next: "", again: "" }); setToast("PIN updated");
  };
  const P = (k: keyof typeof pref) => (v: boolean) => setPref(s => ({ ...s, [k]: v }));

  return (
    <div ref={ref}>
      <PageHeader title="Profile & security" subtitle="Manage your details, how NIVORA behaves, and how your account stays safe." />
      <div data-enter className="mb-5"><Tabs<Tab> tabs={[{ id: "profile", label: "Profile" }, { id: "prefs", label: "Preferences" }, { id: "security", label: "Security" }]} value={tab} onChange={setTab} /></div>

      {tab === "profile" && (
        <div data-enter className="grid gap-5 lg:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-100 font-display text-2xl font-semibold text-brand-700">{p.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</div>
            <p className="mt-3 font-semibold">{p.name}</p><p className="text-sm text-muted">Customer ID C-10482</p>
            <Badge tone="mint" className="mt-3"><BadgeCheck className="h-3.5 w-3.5" /> KYC verified</Badge>
          </div>
          <form className="card grid gap-4 p-6 sm:grid-cols-2 lg:col-span-2" onSubmit={e => { e.preventDefault(); setToast("Profile saved"); }}>
            <Field label="Full name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} />
            <Field label="Email" type="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} />
            <Field label="Mobile number" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} />
            <Field label="City" value={p.city} onChange={e => setP({ ...p, city: e.target.value })} />
            <Field label="PAN" value="ABCDE••••F" readOnly hint="Masked for your safety." />
            <Field label="Aadhaar" value="•••• •••• 4821" readOnly hint="Masked for your safety." />
            <div className="sm:col-span-2"><Button type="submit">Save changes</Button></div>
          </form>
        </div>
      )}

      {tab === "prefs" && (
        <div data-enter className="grid gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Language and accessibility</h2>
            <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">App language</span>
              <select className="field" value={pref.lang} onChange={e => setPref({ ...pref, lang: e.target.value })}><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option></select></label>
            <div className="mt-4"><span className="mb-1.5 block text-sm font-medium">Text size</span>
              <div className="inline-flex gap-2">{[[16, "Standard"], [18, "Large"], [20, "Extra large"]].map(([v, l]) => <button key={v} onClick={() => setSize(v as number)} className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${size === v ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted"}`}>{l}</button>)}</div></div>
            <div className="divide-y divide-line"><Row title="Spoken replies" desc="The assistant reads answers aloud."><Toggle checked={pref.voice} onChange={P("voice")} label="Spoken replies" /></Row></div>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Notifications and data use</h2>
            <div className="divide-y divide-line">
              <Row title="Transaction alerts" desc="Every debit and credit."><Toggle checked={pref.txn} onChange={P("txn")} label="Transaction alerts" /></Row>
              <Row title="Bill reminders" desc="Three days before a due date."><Toggle checked={pref.bills} onChange={P("bills")} label="Bill reminders" /></Row>
              <Row title="Offers" desc="Product news and offers."><Toggle checked={pref.offers} onChange={P("offers")} label="Offers" /></Row>
              <Row title="Personalised suggestions" desc="Use my activity to suggest products."><Toggle checked={pref.personal} onChange={P("personal")} label="Personalised suggestions" /></Row>
              <Row title="Let the assistant use my account data" desc="Masked, and only to answer my questions."><Toggle checked={pref.ai} onChange={P("ai")} label="Assistant data access" /></Row>
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div data-enter className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={savePin} className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Change transaction PIN</h2>
            <Field label="Current PIN" type="password" inputMode="numeric" maxLength={6} value={pin.cur} onChange={e => setPin({ ...pin, cur: e.target.value.replace(/\D/g, "") })} />
            <Field label="New PIN" type="password" inputMode="numeric" maxLength={6} value={pin.next} onChange={e => setPin({ ...pin, next: e.target.value.replace(/\D/g, "") })} />
            <Field label="Confirm new PIN" type="password" inputMode="numeric" maxLength={6} value={pin.again} onChange={e => setPin({ ...pin, again: e.target.value.replace(/\D/g, "") })} />
            {pinErr && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{pinErr}</p>}
            <Button type="submit">Update PIN</Button>
          </form>

          <div className="space-y-5">
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Protection</h2>
              <div className="divide-y divide-line">
                <Row title="Two-step verification" desc="Ask for an OTP on new devices."><Toggle checked={sec.twofa} onChange={v => setSec({ ...sec, twofa: v })} label="Two-step verification" /></Row>
                <Row title="Fingerprint sign-in" desc="Use your phone sensor."><Toggle checked={sec.bio} onChange={v => setSec({ ...sec, bio: v })} label="Fingerprint sign-in" /></Row>
              </div>
              <label className="mt-2 block"><span className="mb-1 flex justify-between text-sm"><span className="font-medium">Daily transfer limit</span><span className="text-muted">{inr(limit)}</span></span>
                <input type="range" min={10000} max={200000} step={10000} value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full accent-[#3f7f86]" /></label>
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Signed-in devices</h2>
              <ul className="mt-2 divide-y divide-line">{devices.map(d => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-3">{d.name.includes("app") ? <Smartphone className="h-5 w-5 text-muted" /> : <Monitor className="h-5 w-5 text-muted" />}<div><p className="text-sm font-semibold">{d.name}</p><p className="text-xs text-muted">{d.place} · {d.when}</p></div></div>{d.current ? <Badge tone="mint">This device</Badge> : <Button size="sm" variant="danger" onClick={() => setToast("Device signed out")}>Sign out</Button>}</li>
              ))}</ul>
            </div>
          </div>
        </div>
      )}

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  );
}
