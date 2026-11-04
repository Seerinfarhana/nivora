import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Props {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** React Bits-style CountUp (same props idea), animated with GSAP and started when scrolled into view. */
export default function CountUp({ to, from = 0, duration = 1.4, decimals = 0, prefix = "", suffix = "", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      prefix + v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    el.textContent = fmt(from);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
    const state = { v: from };
    let tween: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      tween = gsap.to(state, { v: to, duration, ease: "power2.out", onUpdate: () => { el.textContent = fmt(state.v); } });
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); tween?.kill(); };
  }, [to, from, duration, decimals, prefix, suffix]);

  return <span ref={ref} className={className} />;
}
