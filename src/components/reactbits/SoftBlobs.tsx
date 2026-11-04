import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** Calm, slow-drifting colour fields (Aurora-style background) made with GSAP. */
export default function SoftBlobs() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.utils.toArray<HTMLElement>(".blob").forEach((b, i) => {
      gsap.to(b, {
        x: () => gsap.utils.random(-60, 60), y: () => gsap.utils.random(-50, 50),
        scale: () => gsap.utils.random(0.9, 1.15),
        duration: 8 + i * 2, ease: "sine.inOut", repeat: -1, yoyo: true,
      });
    });
  }, { scope: ref });
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="blob absolute -left-20 -top-24 h-[420px] w-[420px] rounded-full bg-brand-200/70 blur-3xl" />
      <div className="blob absolute -bottom-32 right-0 h-[460px] w-[460px] rounded-full bg-lav/80 blur-3xl" />
      <div className="blob absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full bg-mint/80 blur-3xl" />
    </div>
  );
}
