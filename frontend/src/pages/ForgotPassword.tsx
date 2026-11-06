import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Button, Field } from "../components/ui";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return setErr("Enter a valid email address.");
    setBusy(true); setErr("");
    try { setMsg((await api<{ message: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) })).message); }
    catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Logo className="mb-8" />
      <h1 className="text-2xl font-semibold">Forgot your password?</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Enter your email and we will send you a link to choose a new one. The link works for 30 minutes.</p>
      {msg ? <p role="status" className="rounded-xl bg-mint px-3 py-3 text-sm text-mint-ink">{msg}</p> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          {err && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{err}</p>}
          <Button type="submit" className="w-full py-3" disabled={busy}>Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 text-sm font-semibold text-brand-600 hover:underline">Back to sign in</Link>
    </div>
  );
}
