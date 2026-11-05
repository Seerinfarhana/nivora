import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mic, Languages, Lock } from "lucide-react";
import Logo from "../components/Logo";
import SplitText from "../components/reactbits/SplitText";
import BlurText from "../components/reactbits/BlurText";
import SoftBlobs from "../components/reactbits/SoftBlobs";
import { Button, Field } from "../components/ui";
import { useAuth, User } from "../context/AuthContext";
import { cn } from "../lib/utils";

type Mode = "signin" | "register";

export default function Login() {
  const { login, register } = useAuth();
  const go = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<1 | 2>(1);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", lang: "en", consent: false });
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  const run = async (fn: () => Promise<User>) => {
    setBusy(true); setErr("");
    try {
      const u = await fn();
      go(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setBusy(false); }
  };

  const submitSignin = (e: FormEvent) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(f.email)) return setErr("Enter a valid email address.");
    if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
    run(() => login(f.email, f.password));
  };

  const submitRegister = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (f.name.trim().length < 2) return setErr("Enter your full name.");
      if (!/\S+@\S+\.\S+/.test(f.email)) return setErr("Enter a valid email address.");
      if (!/^\d{10}$/.test(f.phone)) return setErr("Enter a 10-digit mobile number.");
      if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
      if (!f.consent) return setErr("Please accept the terms and privacy notice to continue.");
      setErr(""); return setStep(2);
    }
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit code we sent to your mobile.");
    run(() => register({ name: f.name, email: f.email, password: f.password, phone: f.phone, language: f.lang }));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-brand-50 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <SoftBlobs />
        <Logo className="relative" />
        <div className="relative max-w-lg">
          <SplitText text="Banking that talks your language." className="font-display text-5xl font-semibold leading-[1.08]" delay={0.2} />
          <BlurText text="Ask in English, Hindi or Tamil. NIVORA checks balances, explains spending and sends money, with your approval at every step." className="mt-6 text-lg text-brand-700/80" delay={0.9} />
        </div>
        <ul className="relative grid gap-3 text-sm text-brand-700">
          {[
            [Mic, "Speak or type. The assistant understands both."],
            [Languages, "Built for first-time, rural and senior users."],
            [ShieldCheck, "Every payment needs your confirmation and PIN."],
          ].map(([Icon, text], i) => {
            const I = Icon as typeof Mic;
            return <li key={i} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/80"><I className="h-4 w-4" /></span>{text as string}</li>;
          })}
        </ul>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />
          <div className="mb-6 inline-flex rounded-xl border border-line bg-white p-1" role="tablist">
            {(["signin", "register"] as Mode[]).map(m => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setStep(1); setErr(""); }}
                className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition", mode === m ? "bg-brand-500 text-white" : "text-muted hover:text-ink")}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-semibold">{mode === "signin" ? "Welcome back" : step === 1 ? "Open your account" : "Verify your mobile number"}</h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            {mode === "signin" ? "Sign in to see your accounts and talk to your assistant." : step === 1 ? "It takes about two minutes. You can finish KYC after signing up." : `We sent a 6-digit code to +91 ${f.phone}. For this demo, any 6 digits work.`}
          </p>

          <form onSubmit={mode === "signin" ? submitSignin : submitRegister} className="space-y-4" noValidate>
            {mode === "signin" && (<>
              <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
              <Field label="Password" type="password" autoComplete="current-password" value={f.password} onChange={e => set("password", e.target.value)} placeholder="At least 6 characters" />
            </>)}

            {mode === "register" && step === 1 && (<>
              <Field label="Full name" autoComplete="name" value={f.name} onChange={e => set("name", e.target.value)} />
              <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={e => set("email", e.target.value)} />
              <Field label="Mobile number" inputMode="numeric" maxLength={10} value={f.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} />
              <Field label="Password" type="password" autoComplete="new-password" value={f.password} onChange={e => set("password", e.target.value)} hint="Use 8 or more characters." />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Preferred language</span>
                <select className="field" value={f.lang} onChange={e => set("lang", e.target.value)}>
                  <option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option>
                </select>
              </label>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#3f7f86]" checked={f.consent} onChange={e => set("consent", e.target.checked)} />
                I agree to the terms and understand how NIVORA uses my data to run the assistant.
              </label>
            </>)}

            {mode === "register" && step === 2 && (
              <Field label="6-digit code" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" />
            )}

            {err && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{err}</p>}

            <Button type="submit" className="w-full py-3" disabled={busy}>
              {mode === "signin" ? "Sign in" : step === 1 ? "Send verification code" : "Create my account"}
            </Button>
          </form>

          {mode === "signin" && (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4">
              <p className="mb-3 text-xs font-semibold text-muted">Demo access for judges</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="soft" size="sm" disabled={busy} onClick={() => run(() => login("demo@nivora.in", "demo1234"))}>Customer demo</Button>
                <Button variant="soft" size="sm" disabled={busy} onClick={() => run(() => login("admin@nivora.in", "admin1234"))}>Admin demo</Button>
              </div>
            </div>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> Your details are encrypted and never shown to the AI.</p>
        </div>
      </section>
    </div>
  );
}
