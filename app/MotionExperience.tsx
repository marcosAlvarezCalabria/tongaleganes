"use client";

import { useEffect } from "react";

export function MotionExperience() {
  // Secciones marcadas con data-reveal: la primera vez que entran en pantalla
  // se les marca data-revealed="true" (una sola vez) y el CSS de cada una
  // decide qué animar con eso — p. ej. el manifiesto muestra la foto limpia
  // y retrasa el velo oscuro + el texto, igual que las tarjetas de "Más trabajos".
  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (revealItems.length === 0) return;

    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealItems.forEach((item) => { item.dataset.revealed = "true"; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 },
    );
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const parallaxItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    let animationFrameId = 0;

    const update = () => {
      animationFrameId = 0;

      if (reducedMotion.matches) {
        parallaxItems.forEach((item) => item.style.setProperty("--parallax-y", "0px"));
        return;
      }

      const viewportHeight = window.innerHeight;
      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) {
          return;
        }

        const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
        const speed = Number(item.dataset.parallaxSpeed ?? 54);
        const offset = (progress - 0.5) * speed;
        item.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);
    requestUpdate();

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, []);

  return null;
}
