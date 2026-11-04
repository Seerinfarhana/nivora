import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface Props { text: string; className?: string; delay?: number; stagger?: number; }

/** React Bits-style SplitText: characters rise in with a stagger. */
export default function SplitText({ text, className, delay = 0, stagger = 0.025 }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(".sp-char", { yPercent: 110, opacity: 0, duration: 0.8, ease: "power4.out", stagger, delay });
  }, { scope: ref });

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden align-bottom pb-1" aria-hidden>
          {word.split("").map((c, ci) => (
            <span key={ci} className="sp-char inline-block">{c}</span>
          ))}
          {"\u00A0"}
        </span>
      ))}
    </h1>
  );
}
