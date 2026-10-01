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

  return (
    <div className="hero-3d-wrap" data-ready={ready ? "true" : "false"}>
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
