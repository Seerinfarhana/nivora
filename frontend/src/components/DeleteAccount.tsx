import { FormEvent, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api, setToken } from "../lib/api";
import { Button, Field } from "./ui";

/** Permanently closes the account. Needs the password and the word DELETE. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [word, setWord] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/auth/delete-account", { method: "POST", body: JSON.stringify({ password: pw, confirm: word }) });
      setToken(null);
      window.location.href = "/login";   // a full reload clears everything held in memory
    } catch (x) { setErr(x instanceof Error ? x.message : "We could not delete your account."); setBusy(false); }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-ink" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-rose-ink">Delete my account</h2>
          <p className="mt-1 text-sm text-muted">This permanently removes your profile, accounts, transactions, payees and goals. It cannot be undone. Move any money you want to keep before you continue.</p>
          {!open ? <Button className="mt-4" variant="danger" size="sm" onClick={() => setOpen(true)}>Delete my account</Button> : (
            <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
              <Field label="Your password" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
              <Field label="Type DELETE to confirm" value={word} onChange={e => setWord(e.target.value)} />
              {err && <p role="alert" className="rounded-xl bg-rose px-3 py-2 text-sm text-rose-ink">{err}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" size="sm" disabled={busy || !pw || word !== "DELETE"}>Permanently delete</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setPw(""); setWord(""); setErr(""); }}>Keep my account</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
