import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { Button, Field } from "../components/ui";
import { api } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use 8 or more characters.");
    if (pw !== again) return setErr("The two passwords do not match.");
    setBusy(true); setErr("");
    try { await api("/api/auth/reset", { method: "POST", body: JSON.stringify({ token: params.get("token") || "", new_password: pw }) }); setDone(true); }
    catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Logo className="mb-8" />
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      {done ? (
        <>
          <p role="status" className="mt-6 rounded-xl bg-mint px-3 py-3 text-sm text-mint-ink">Your password is updated and every device was signed out. You can sign in now.</p>
          <Link to="/login" className="mt-6"><Button className="w-full py-3">Go to sign in</Button></Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="New password" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} hint="Use 8 or more characters." />
          <Field label="Confirm new password" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} />
          {err && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{err}</p>}
          <Button type="submit" className="w-full py-3" disabled={busy}>Save new password</Button>
          <Link to="/forgot" className="block text-center text-sm font-semibold text-brand-600 hover:underline">Send me a new link</Link>
        </form>
      )}
    </div>
  );
}
