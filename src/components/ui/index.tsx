import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Tone = "brand" | "lav" | "mint" | "sand" | "rose" | "sky" | "neutral";
const toneCls: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  lav: "bg-lav text-lav-ink",
  mint: "bg-mint text-mint-ink",
  sand: "bg-sand text-sand-ink",
  rose: "bg-rose text-rose-ink",
  sky: "bg-sky text-sky-ink",
  neutral: "bg-mist text-muted",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", toneCls[tone], className)}>{children}</span>;
}

export function IconTile({ tone = "brand", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", toneCls[tone])}>{children}</div>;
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary" | "soft" | "ghost" | "danger"; size?: "sm" | "md"; }
export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
    soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    ghost: "text-muted hover:bg-white hover:text-ink border border-line bg-white/60",
    danger: "bg-rose text-rose-ink hover:brightness-95",
  }[variant];
  const s = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  return <button {...p} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none", v, s, className)} />;
}

export function Field({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input {...p} className={cn("field", p.className)} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "mint" | "sky" | "lav" }) {
  const c = { brand: "bg-brand-500", mint: "bg-mint-ink", sky: "bg-sky-ink", lav: "bg-lav-ink" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", c)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-500" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-xl bg-white p-1 border border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("rounded-lg px-3.5 py-1.5 text-sm font-semibold transition", value === t.id ? "bg-brand-500 text-white" : "text-muted hover:text-ink")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div data-enter className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
