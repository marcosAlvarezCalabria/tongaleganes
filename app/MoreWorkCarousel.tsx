"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type MoreWorkItem = {
  src: string;
  alt: string;
  title: string;
  detail: string;
};

/**
 * En escritorio el acordeón (tarjeta estrecha que se expande) funciona con
 * :hover puro en CSS. En móvil/táctil no hay hover, así que aquí se toca
 * una tarjeta para expandirla (data-active) — mismo efecto visual, disparado
 * por un tap en vez de pasar el ratón por encima.
 */
export function MoreWorkCarousel({ items }: { items: MoreWorkItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Al activar una tarjeta en móvil (donde la tira hace scroll horizontal),
  // se centra en pantalla. Se recoloca dos veces: al empezar y cuando termina
  // la animación de ensanchado, porque su posición final depende del ancho final.
  useEffect(() => {
    const track = trackRef.current;
    if (active === null || !track) return;
    const card = track.children[active] as HTMLElement | undefined;
    if (!card) return;

    const center = () => {
      if (track.scrollWidth <= track.clientWidth + 1) return; // escritorio: no hay scroll
      const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    };
    const t1 = window.setTimeout(center, 60);
    const t2 = window.setTimeout(center, 640);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active]);

  return (
    <div className="more-work-carousel" aria-label="Más trabajos recientes" ref={trackRef}>
      {items.map((item, index) => (
        <article
          className="more-work-card"
          key={item.src}
          tabIndex={0}
          data-active={active === index ? "true" : "false"}
          onClick={() => setActive((current) => (current === index ? null : index))}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActive((current) => (current === index ? null : index));
            }
          }}
        >
          <div className="more-work-image">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 700px) 60vw, (max-width: 1100px) 22vw, 420px"
              loading="lazy"
              unoptimized
            />
          </div>
          <div className="more-work-caption">
            <h4>{item.title}</h4>
            <span>{item.detail}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
