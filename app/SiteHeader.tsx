"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

const navigation = [
  { href: "/#trabajos", label: "Trabajos" },
  { href: "/#nuria", label: "Nuria" },
  { href: "/#conoce-el-estudio", label: "Estudio" },
  { href: "/#contacto", label: "Contacto" },
];

type SiteHeaderProps = { ctaHref?: string; ctaLabel?: string; homeHref?: string; ctaBehavior?: "link" | "back" };

export function SiteHeader({ ctaHref = "/book", ctaLabel = "Pedir cita", homeHref = "/#inicio", ctaBehavior = "link" }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let frameId = 0;
    const update = () => {
      frameId = 0;
      setScrolled(window.scrollY > 64);
    };
    const requestUpdate = () => {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(update);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  function handleCtaClick(event: MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);
    if (ctaBehavior !== "back") return;

    event.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(ctaHref);
  }
  return (
    <header
      className="site-header"
      data-scrolled={scrolled ? "true" : "false"}
      data-menu-open={menuOpen ? "true" : "false"}
    >
      <Link className="brand" href={homeHref} aria-label="Tonga Tattoo, inicio" onClick={() => setMenuOpen(false)}>
        <Image src="/images/logo.png" alt="Tonga Tattoo" width={640} height={760} priority unoptimized />
      </Link>

      <nav id="site-navigation" aria-label="Navegación principal">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <Link className="header-cta" href={ctaHref} onClick={handleCtaClick}>
          {ctaLabel}
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-controls="site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
