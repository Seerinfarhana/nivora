import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface Props { text: string; className?: string; delay?: number; }

/** React Bits-style BlurText: words sharpen from a blur one after another. */
export default function BlurText({ text, className, delay = 0 }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(".bt-word", { filter: "blur(10px)", opacity: 0, y: 8, duration: 0.7, ease: "power2.out", stagger: 0.06, delay });
  }, { scope: ref });

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="bt-word inline-block">{w}&nbsp;</span>
      ))}
    </p>
  );
}
