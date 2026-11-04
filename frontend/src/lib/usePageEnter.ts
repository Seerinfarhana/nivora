import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** One orchestrated entrance per page: any element with data-enter rises in sequence. */
export function usePageEnter<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-enter]", {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
        clearProps: "transform,opacity",
      });
    },
    { scope: ref }
  );
  return ref;
}
