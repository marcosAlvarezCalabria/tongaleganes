"use client";

import { useEffect, useRef } from "react";
import Typed from "typed.js";

const THANKS_TEXT =
  "Quiero dar las GRACIAS a cada uno de los que os ponéis a diario en mis manos… Gracias a vosotros sigo mejorando cada día. Muchos ya sois más que clientes: amigos. Y hacéis que trabajar sea un placer… Vamos a por el 2026 con ganas de más. Siempre, siempre, ¡GRACIAS! 🖤";

const THANKS_HTML =
  "Quiero dar las <strong>GRACIAS</strong> a cada uno de los que os ponéis a diario en mis manos… Gracias a vosotros sigo mejorando cada día. Muchos ya sois más que clientes: amigos. Y hacéis que trabajar sea un placer… Vamos a por el 2026 con ganas de más. Siempre, siempre, <strong>¡GRACIAS!</strong> 🖤";

export function HandwrittenThanks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const writingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const writing = writingRef.current;
    if (!container || !writing) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    let typed: Typed | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || typed) {
          return;
        }

        container.dataset.writing = "true";
        typed = new Typed(writing, {
          strings: [THANKS_HTML],
          typeSpeed: 18,
          startDelay: 260,
          showCursor: true,
          cursorChar: "│",
          contentType: "html",
          onComplete: () => {
            container.dataset.complete = "true";
          },
        });
        observer.disconnect();
      },
      { threshold: 0.28 },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      typed?.destroy();
    };
  }, []);

  return (
    <div className="thanks-note" ref={containerRef} role="note" aria-label={THANKS_TEXT}>
      <p className="thanks-fallback" aria-hidden="true">{THANKS_TEXT}</p>
      <p className="thanks-writing" aria-hidden="true">
        <span ref={writingRef} />
      </p>
    </div>
  );
}
