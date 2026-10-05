"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero 3D: el logo de Tonga Tattoo (TT dorada + firma) extruido en tres.js
 * y animado en turntable. Vive en un iframe estático
 * (public/logo-hero-tonga/embed.html) porque usa un import map + three.js
 * desde CDN; aislarlo así evita mezclar ese mundo con el bundler de Next.js.
 *
 * El logo anterior de Nuria Córdoba sigue en public/logo-hero/ sin tocar,
 * por si se quiere volver a usar.
 */
export function LogoHero3D() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [armed, setArmed] = useState(false);

  // El trazado/extrusión del logo es una tarea pesada de CPU (canvas +
  // marching squares). Si arranca en el mismo instante que el resto de la
  // página, compite por el hilo principal justo cuando el navegador está
  // pintando el primer frame y dispara el TBT/LCP. Esperamos a que el
  // navegador esté libre (o, como mucho, 1.2s) antes de montar el iframe:
  // mientras tanto se ve el loader de siempre, así que visualmente no cambia.
  useEffect(() => {
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setArmed(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setArmed(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "logo-hero:listo") setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Cuenta atrás del fallback: solo empieza cuando el iframe realmente se
  // monta, no desde el renderizado inicial (si no, se nos comería el margen
  // con la espera a estar "idle" de arriba).
  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setTimedOut(true), 6000);
    return () => window.clearTimeout(timeout);
  }, [armed]);

  // El hero es "position: fixed" (se queda clavado mientras el resto hace
  // scroll por encima). Aquí se fija en px lo que separa el hero del panel
  // que hace scroll por encima (--home-hero-vh).
  //
  // Se mide UNA vez al montar y solo se vuelve a medir si cambia el ANCHO
  // (girar el móvil o redimensionar la ventana). Antes se actualizaba en cada
  // scroll con window.innerHeight: en móvil la barra de direcciones se
  // oculta al empezar a hacer scroll, innerHeight cambia, el margen del panel
  // cambia a media animación y el navegador (scroll anchoring) lo compensa
  // saltando de posición — el panel "subía" tapando el héroe de golpe.
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty("--home-hero-vh", `${window.innerHeight}px`);
    };
    apply();

    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return; // solo cambió la altura (barra del navegador): ignorar
      lastWidth = window.innerWidth;
      apply();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Arrastrar hacia los lados gira el logo; arrastrar hacia arriba/abajo
  // tiene que seguir haciendo scroll de la página con total normalidad.
  // "touch-action: pan-y" en el CSS deja el scroll vertical al navegador
  // (sin que JS tenga que tocarlo) y solo interceptamos el gesto cuando,
  // tras unos px, queda claro que es horizontal.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let active = false;
    let decided: "none" | "horizontal" | "vertical" = "none";
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    const THRESHOLD = 12;
    const SENSITIVITY = 0.012;

    function spin(deltaYaw: number) {
      frameRef.current?.contentWindow?.postMessage(
        { type: "logo-hero:spin", deltaYaw },
        window.location.origin,
      );
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      active = true;
      decided = "none";
      startX = lastX = e.clientX;
      startY = e.clientY;
    }

    function onPointerMove(e: PointerEvent) {
      if (!active) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (decided === "none") {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        // Le damos ventaja al scroll vertical: solo se decide "horizontal"
        // si el gesto es claramente mas lateral que vertical, para no robar
        // nunca un intento de scroll (sobre todo al volver a subir).
        decided = Math.abs(dx) > Math.abs(dy) * 1.4 ? "horizontal" : "vertical";
        if (decided === "horizontal") {
          el?.setPointerCapture?.(e.pointerId);
        } else {
          active = false; // gesto vertical: lo soltamos, que haga scroll el navegador
          return;
        }
      }

      if (decided === "horizontal") {
        e.preventDefault();
        const stepX = e.clientX - lastX;
        lastX = e.clientX;
        spin(stepX * SENSITIVITY);
      }
    }

    function onPointerUp() {
      active = false;
      decided = "none";
    }

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerUp, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div className="hero-3d-wrap" data-ready={ready ? "true" : "false"} ref={wrapRef}>
      {!ready && !timedOut && (
        <div className="hero-3d-loading" aria-hidden="true">
          <div className="hero-3d-loading-stage">
            <div className="hero-3d-loading-glow" />
            <Image
              src="/images/logo.png"
              alt=""
              width={200}
              height={238}
              priority
              unoptimized
              className="hero-3d-loading-logo"
            />
          </div>
        </div>
      )}
      {armed && (
        <iframe
          ref={frameRef}
          src="/logo-hero-tonga/embed.html"
          title="Logo de Tonga Tattoo en 3D"
          className="hero-3d-logo"
          loading="eager"
          allow="fullscreen"
        />
      )}
    </div>
  );
}
