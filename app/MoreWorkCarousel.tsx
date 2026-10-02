"use client";

import Image from "next/image";
import { useState } from "react";

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

  return (
    <div className="more-work-carousel" aria-label="Más trabajos recientes">
      {items.map((item, index) => (
        <article
          className="more-work-card"
          key={item.src}
          tabIndex={0}
          data-active={active === index ? "true" : "false"}
          onClick={() => setActive((current) => (current === index ? null : index))}
          onFocus={() => setActive(index)}
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
