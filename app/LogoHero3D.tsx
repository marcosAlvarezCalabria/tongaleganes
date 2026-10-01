"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero 3D: la firma real de Nuria Córdoba extruida en tres.js y animada
 * en turntable. Vive en un iframe estático (public/logo-hero/embed.html)
 * porque usa un import map + three.js desde CDN; aislarlo así evita
 * mezclar ese mundo con el bundler de Next.js.
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
  // scroll por encima), así que su posición en el viewport nunca cambia:
  // no vale el --parallax-y normal. Aquí se lee scrollY a pelo y se mueve
  // tanto el contenedor (CSS) como el propio modelo 3D (vía postMessage).
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;

    const update = () => {
      frameId = 0;
      const progress = reducedMotion.matches
        ? 0
        : Math.min(window.scrollY / (window.innerHeight * 0.9), 1);
      wrapRef.current?.style.setProperty("--hero-scroll", progress.toFixed(3));
      frameRef.current?.contentWindow?.postMessage(
        { type: "logo-hero:scroll", progress },
        window.location.origin,
      );
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
    const THRESHOLD = 8;
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
        decided = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
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
      {!ready && !timedOut && <div className="hero-3d-loading" aria-hidden="true" />}
      <iframe
        ref={frameRef}
        src="/logo-hero/embed.html"
        title="Firma de Nuria Córdoba en 3D"
        className="hero-3d-logo"
        loading="eager"
        allow="fullscreen"
      />
    </div>
  );
}
