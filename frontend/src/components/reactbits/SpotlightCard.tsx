import { useRef, ReactNode, MouseEvent } from "react";
import { cn } from "../../lib/utils";

interface Props { children: ReactNode; className?: string; spotlight?: string; onClick?: () => void; }

/** React Bits-style SpotlightCard: a soft radial light follows the cursor. */
export default function SpotlightCard({ children, className, spotlight = "rgba(106,166,173,0.18)", onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--x", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={move}
      onClick={onClick}
      className={cn("card group relative overflow-hidden", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(260px circle at var(--x,50%) var(--y,50%), ${spotlight}, transparent 70%)` }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
