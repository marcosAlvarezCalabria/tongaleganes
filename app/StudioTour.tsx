"use client";

import { useEffect, useRef, useState } from "react";

export function StudioTour() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const startTour = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setStarted(true);
    setError("");

    try {
      await video.play();
    } catch {
      setStarted(false);
      setError("No se pudo iniciar el vídeo. Pulsa de nuevo para reintentarlo.");
    }
  };

  return (
    <div className="studio-player" data-started={started ? "true" : "false"}>
      <video
        ref={videoRef}
        controls={started}
        preload="none"
        poster="/images/conoce-el-estudio.jpg"
        playsInline
        onEnded={() => setStarted(false)}
        aria-label="Recorrido en vídeo por el estudio Tonga Tattoo"
      >
        <source src="/media/conoce-el-estudio.mp4" type="video/mp4" />
        Tu navegador no puede reproducir este vídeo.
      </video>
      {!started && (
        <button className="studio-play" type="button" onClick={startTour}>
          <span aria-hidden="true">▶</span>
          <span>
            <small>Recorrido en vídeo</small>
            Entrar al estudio
          </span>
        </button>
      )}
      {error && <p className="studio-video-error" role="alert">{error}</p>}
    </div>
  );
}
