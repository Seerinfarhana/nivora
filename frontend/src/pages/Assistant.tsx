import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import gsap from "gsap";
import { Mic, Send, Volume2, VolumeX, ShieldCheck, Sparkles, Check, X } from "lucide-react";
import { usePageEnter } from "../lib/usePageEnter";
import { Card, Lang, Msg, askAssistant, botMsg, cancelTransfer, confirmTransfer, greeting, quickPrompts, userMsg } from "../lib/assistant";
import { inr, cn } from "../lib/utils";
import { Button, PageHeader } from "../components/ui";

const speechLang: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", ta: "ta-IN" };

function CardView({ card, onResolve }: { card: Card; onResolve: (status: "done" | "cancelled", pin?: string) => void }) {
  const [pin, setPin] = useState("");
  if (card.type === "balance") return (
    <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-mist/50">
      {card.rows.map(r => <div key={r.name} className="flex items-center justify-between px-3 py-2.5 text-sm"><span>{r.name} <span className="text-muted">{r.mask}</span></span><b>{inr(r.balance, 2)}</b></div>)}
    </div>
  );
  if (card.type === "spend") return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-line bg-mist/50 p-3">
      <p className="text-sm text-muted">Total <b className="text-ink">{inr(card.total)}</b></p>
      {card.rows.map(r => (
        <div key={r.label}><div className="mb-1 flex justify-between text-xs"><span>{r.label}</span><span>{inr(r.value)}</span></div>
          <div className="h-1.5 rounded-full bg-white"><div className="h-full rounded-full bg-brand-400" style={{ width: `${r.value / card.rows[0].value * 100}%` }} /></div></div>
      ))}
    </div>
  );
  if (card.type === "links") return <div className="mt-3 flex flex-wrap gap-2">{card.rows.map(r => <Link key={r.to} to={r.to} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">{r.label}</Link>)}</div>;
  return (
    <div className="mt-3 rounded-xl border border-line bg-mist/50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-brand-500" /> {card.title}</div>
      <p className="mt-1 text-xs text-muted">{card.detail}</p>
      {card.status === "pending" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input aria-label="Enter your PIN" className="field w-36 py-2 text-center tracking-[0.4em]" type="password" inputMode="numeric" maxLength={6} placeholder="PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
          <Button size="sm" disabled={pin.length < 4} onClick={() => onResolve("done", pin)}><Check className="h-4 w-4" /> Confirm</Button>
          <Button size="sm" variant="ghost" onClick={() => onResolve("cancelled")}><X className="h-4 w-4" /> Cancel</Button>
        </div>
      ) : <p className={cn("mt-2 text-xs font-semibold", card.status === "done" ? "text-mint-ink" : "text-muted")}>{card.status === "done" ? "Confirmed" : "Cancelled"}</p>}
    </div>
  );
}

export default function Assistant() {
  const ref = usePageEnter();
  const { state } = useLocation() as { state?: { prompt?: string } };
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>(() => [greeting("en")]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const last = el.lastElementChild as HTMLElement | null;
    if (last) gsap.from(last, { y: 12, opacity: 0, duration: 0.35, ease: "power2.out" });
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing]);

  const say = (m: Msg) => {
    setMsgs(p => [...p, m]);
    if (speak && "speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(m.text); u.lang = speechLang[lang]; window.speechSynthesis.speak(u); }
  };

  const send = async (raw: string) => {
    const q = raw.trim(); if (!q) return;
    setMsgs(p => [...p, userMsg(q)]); setText(""); setTyping(true);
    try { say(await askAssistant(q, lang)); }
    catch (e) { say(botMsg(e instanceof Error ? e.message : "I could not reach the server. Please try again.")); }
    finally { setTyping(false); }
  };

  useEffect(() => { if (state?.prompt && !started.current) { started.current = true; send(state.prompt); } /* eslint-disable-next-line */ }, []);

  const resolve = async (id: string, status: "done" | "cancelled", pin?: string) => {
    const mark = (st: "pending" | "done" | "cancelled") =>
      setMsgs(p => p.map(m => {
        if (m.id !== id || m.card?.type !== "confirm") return m;
        const c = m.card;
        return { ...m, card: { ...c, status: st } };
      }));
    try {
      if (status === "cancelled") { const r = await cancelTransfer(); mark("cancelled"); say(botMsg(r.reply)); return; }
      const r = await confirmTransfer(pin ?? "");
      if (r.status === "done") mark("done");   // wrong PIN leaves the card open so the user can retry
      say(botMsg(r.reply));
    } catch (e) { say(botMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.")); }
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice input needs Chrome or Edge. You can still type your question.");
    const r = new SR(); r.lang = speechLang[lang];
    r.onstart = () => setListening(true); r.onend = () => setListening(false); r.onerror = () => setListening(false);
    r.onresult = (e: any) => send(e.results[0][0].transcript);
    r.start();
  };

  return (
    <div ref={ref}>
      <PageHeader title="AI banking assistant" subtitle="Ask in plain words. I read your data through secure actions and ask before anything moves." />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div data-enter className="card flex h-[calc(100vh-13rem)] min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-semibold">NIVORA assistant</p><p className="text-xs text-mint-ink">Online</p></div></div>
            <div className="flex items-center gap-2">
              <select aria-label="Language" className="field w-auto py-1.5 text-sm" value={lang} onChange={e => { const l = e.target.value as Lang; setLang(l); setMsgs([greeting(l)]); }}>
                <option value="en">English</option><option value="hi">हिन्दी</option><option value="ta">தமிழ்</option>
              </select>
              <button aria-label={speak ? "Turn off spoken replies" : "Turn on spoken replies"} onClick={() => setSpeak(s => !s)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-ink">{speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
            </div>
          </div>

          <div ref={listRef} data-lenis-prevent className="scroll-thin flex-1 space-y-4 overflow-y-auto bg-mist/40 p-4">
            {msgs.map(m => (
              <div key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "rounded-br-md bg-brand-500 text-white" : "rounded-bl-md border border-line bg-white")}>
                  <p>{m.text}</p>
                  {m.card && <CardView card={m.card} onResolve={(s, pin) => resolve(m.id, s, pin)} />}
                  <p className={cn("mt-1.5 text-[11px]", m.role === "user" ? "text-white/70" : "text-muted")}>{m.time}</p>
                </div>
              </div>
            ))}
            {typing && <div className="flex"><div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3" aria-label="Assistant is typing">{[0, 1, 2].map(i => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
          </div>

          <div className="border-t border-line p-3">
            <div className="scroll-thin mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map(p => <button key={p} onClick={() => send(p)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">{p}</button>)}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(text); }} className="flex gap-2">
              <button type="button" onClick={listen} aria-label="Speak your question" className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line", listening ? "bg-rose text-rose-ink animate-pulse" : "bg-white text-brand-600 hover:bg-brand-50")}><Mic className="h-5 w-5" /></button>
              <input className="field" value={text} onChange={e => setText(e.target.value)} placeholder={listening ? "Listening..." : "Ask about balance, spending, transfers..."} aria-label="Message" />
              <Button type="submit" className="px-4" aria-label="Send"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>

        <aside data-enter className="space-y-4">
          <div className="card p-5"><h2 className="text-base font-semibold">What I can do</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">{["Check balances and statements", "Summarise your spending", "Send money to saved payees", "Block or unblock your card", "Explain loans and deposits"].map(s => <li key={s} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{s}</li>)}</ul></div>
          <div className="card bg-brand-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-brand-700"><ShieldCheck className="h-4 w-4" /> Safety built in</div>
            <p className="mt-2 text-sm text-brand-700/80">Account numbers are masked before the AI sees them. Payments need your PIN. Every action is logged for audit.</p></div>
        </aside>
      </div>
    </div>
  );
}
