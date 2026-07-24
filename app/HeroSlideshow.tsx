"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const slides = [
  { src: "/images/hero/nuria-01.jpg", alt: "Tatuaje de máscara Daruma realizado por Nuria Córdoba" },
  { src: "/images/hero/nuria-02.jpg", alt: "Tatuaje realista de rostro realizado por Nuria Córdoba" },
  { src: "/images/hero/nuria-03.jpg", alt: "Tatuaje a color del gato de Cheshire realizado por Nuria Córdoba" },
  { src: "/images/hero/nuria-04.jpg", alt: "Composición de tatuaje de inspiración japonesa realizada por Nuria Córdoba" },
  { src: "/images/hero/nuria-05.jpg", alt: "Tatuaje realista en negro realizado por Nuria Córdoba" },
];

export function HeroSlideshow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);

    const root = rootRef.current;
    const observer = root
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 })
      : null;
    if (root && observer) {
      observer.observe(root);
    }

    return () => {
      media.removeEventListener("change", updateMotion);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || !visible) {
      return;
    }

    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, [paused, reducedMotion, visible]);

  return (
    <div className="hero-slideshow" data-paused={paused ? "true" : "false"} ref={rootRef}>
      {slides.map((slide, index) => (
        <div
          className="hero-slide"
          data-active={index === active ? "true" : "false"}
          aria-hidden={index !== active}
          key={slide.src}
        >
          <Image
            src={slide.src}
            alt={index === active ? slide.alt : ""}
            fill
            priority={index === 0}
            sizes="(max-width: 900px) 100vw, 56vw"
          />
        </div>
      ))}
      {!reducedMotion && (
        <button
          className="slideshow-toggle"
          type="button"
          onClick={() => setPaused((current) => !current)}
          aria-label={paused ? "Reanudar galería del héroe" : "Pausar galería del héroe"}
        >
          <span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
          <strong aria-hidden="true">{paused ? "▶" : "Ⅱ"}</strong>
        </button>
      )}
    </div>
  );
}
