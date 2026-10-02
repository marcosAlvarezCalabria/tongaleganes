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

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "logo-hero:listo") setReady(true);
    }
    window.addEventListener("message", onMessage);
    const timeout = window.setTimeout(() => setTimedOut(true), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, []);

  // El hero es "position: fixed" (se queda clavado mientras el resto hace
  // scroll por encima), así que su posición en el viewport nunca cambia: no
  // hace falta mover ni inclinar el modelo con el scroll. Lo único que se
  // sigue leyendo aquí es la altura real del viewport, para fijar en px lo
  // que separa el hero del panel que hace scroll por encima.
  useEffect(() => {
    let frameId = 0;

    const update = () => {
      frameId = 0;
      // Fija en px (medido en cada frame) lo que separa el hero fijo del panel
      // que hace scroll por encima. Con "100svh" puro, en movil la barra de
      // direccion al ocultarse/mostrarse cambia la altura dinamica a medio
      // scroll y el panel se desincroniza: el hero se queda "pegado" arriba
      // y se ve a medias. Pinarlo a window.innerHeight evita ese salto.
      document.documentElement.style.setProperty("--home-hero-vh", `${window.innerHeight}px`);
    };

    const requestUpdate = () => {
      if (frameId === 0) frameId = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();

    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
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
      <iframe
        ref={frameRef}
        src="/logo-hero-tonga/embed.html"
        title="Logo de Tonga Tattoo en 3D"
        className="hero-3d-logo"
        loading="eager"
        allow="fullscreen"
      />
    </div>
  );
}
