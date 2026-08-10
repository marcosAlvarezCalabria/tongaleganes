"use client";

import Image from "next/image";
import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { normalizeSpanishPhone, replaceAppointmentStyle, type AppointmentStyle } from "@/studio/booking";

const STYLES_INSPIRATION = [
  { id: "fineline", title: "Fine Line & Minimalist", image: "/images/fineline.jpg", desc: "Líneas delicadas, geometría y sutileza." },
  { id: "neotrad", title: "Neo-Traditional", image: "/images/artwork.jpg", desc: "Contraste vibrante y expresividad clásica." },
  { id: "blackwork", title: "Blackwork & Ornamental", image: "/images/fine-work.jpg", desc: "Tinta negra profunda y ornamentación." },
  { id: "bodysuit", title: "Large Scale & Bodysuit", image: "/images/bodysuit.jpg", desc: "Piezas de gran formato y anatomía." },
] as const;

type Turnstile = { render(element: HTMLElement, options: Record<string, unknown>): string; remove(widgetId: string): void };

declare global {
  interface Window { turnstile?: Turnstile; }
}

export function BookingForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [selectedStyle, setSelectedStyle] = useState<AppointmentStyle>("fineline");
  const [description, setDescription] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const turnstileElement = useRef<HTMLDivElement>(null);
  const turnstileWidget = useRef<string | null>(null);

  function handleSelectStyle(style: (typeof STYLES_INSPIRATION)[number]) {
    setSelectedStyle((current) => replaceAppointmentStyle(current, style.id));
  }

  useEffect(() => {
    if (!turnstileReady || !turnstileSiteKey || !turnstileElement.current || !window.turnstile) return;
    turnstileWidget.current = window.turnstile.render(turnstileElement.current, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
      "timeout-callback": () => setTurnstileToken(""),
    });
    return () => { if (turnstileWidget.current) window.turnstile?.remove(turnstileWidget.current); };
  }, [turnstileReady, turnstileSiteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingMode: "request",
          customer: { name: form.get("name"), email: form.get("email"), phone: normalizeSpanishPhone(String(form.get("phone") ?? "")) },
          appointment: { preferredStartAt: form.get("preferredStartAt"), description, style: selectedStyle },
          artistPreference: form.get("artist") === "none" ? { kind: "none" } : { kind: "artist", artistId: form.get("artist") },
          turnstileToken,
        }),
      });
      if (response.ok) {
        setMessage({ ok: true, text: "Hemos recibido tu idea con éxito. Nos pondremos en contacto contigo muy pronto." });
      } else {
        setMessage({ ok: false, text: "No hemos podido enviar la solicitud. Revisa los datos e inténtalo de nuevo." });
      }
    } catch {
      setMessage({ ok: false, text: "Error de conexión. Inténtalo de nuevo en unos momentos." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="artistic-booking-form">
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" onLoad={() => setTurnstileReady(true)} />
      )}

      <section className="booking-module booking-module-styles" aria-labelledby="booking-style-title">
        <div className="booking-section-title">
          <span className="step-num">01</span>
          <h3 id="booking-style-title">Selecciona el estilo de referencia</h3>
          <p>Elige la dirección artística que mejor encaje con tu visión.</p>
        </div>

        <div className="style-inspiration-grid">
          {STYLES_INSPIRATION.map((style) => (
            <button
              type="button"
              key={style.id}
              className={`style-card ${selectedStyle === style.id ? "active" : ""}`}
              onClick={() => handleSelectStyle(style)}
              aria-pressed={selectedStyle === style.id}
            >
              <div className="style-card-image">
                <Image
                  src={style.image}
                  alt={style.title}
                  width={680}
                  height={840}
                  sizes="(max-width: 700px) 100vw, 25vw"
                  loading="lazy"
                  decoding="async"
                  unoptimized
                />
                <div className="style-card-overlay" />
              </div>
              <div className="style-card-content">
                <strong>{style.title}</strong>
                <span>{style.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="booking-module booking-module-project" aria-labelledby="booking-project-title">
        <div className="booking-section-title">
          <span className="step-num">02</span>
          <h3 id="booking-project-title">Cuéntanos tu proyecto</h3>
          <p>Detállanos la zona del cuerpo, tamaño aproximado y concepto.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre y Apellido</label>
            <input id="name" name="name" required maxLength={100} placeholder="Tu nombre completo" />
          </div>
          <div className="form-field">
            <label htmlFor="email">Correo Electrónico</label>
            <input id="email" name="email" type="email" required maxLength={254} placeholder="tu@email.com" />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Teléfono / WhatsApp</label>
            <input id="phone" name="phone" type="tel" required placeholder="+34 600 000 000" maxLength={32} />
          </div>
          <div className="form-field">
            <label htmlFor="artist">Artista Preferido</label>
            <select id="artist" name="artist" defaultValue="none">
              <option value="none">Sin preferencia (Cualquier artista)</option>
              <option value="nuria-cordoba">Nuria Córdoba</option>
            </select>
          </div>
          <div className="form-field full-width">
            <label htmlFor="preferredStartAt">Fecha u Ocasión Preferida</label>
            <input id="preferredStartAt" name="preferredStartAt" type="datetime-local" required />
          </div>
          <div className="form-field full-width">
            <label htmlFor="description">Tu Idea / Concepto</label>
            <textarea
              id="description"
              name="description"
              required
              maxLength={2000}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu idea, tamaño aproximado, ubicación corporal..."
            />
          </div>
          <div className="form-field full-width">
            <p id="turnstile-help">Completa la verificación de seguridad para enviar tu solicitud.</p>
            <div ref={turnstileElement} aria-describedby="turnstile-help" />
            {!turnstileSiteKey && <p className="form-status error" role="alert">La verificación no está disponible ahora. Inténtalo de nuevo más tarde.</p>}
          </div>
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={submitting || !turnstileToken}>
            {submitting ? "Enviando solicitud..." : "Enviar solicitud artística"}
          </button>
        </div>
      </section>

      {message && (
        <div className={`form-status ${message.ok ? "success" : "error"}`} role="status">
          {message.text}
        </div>
      )}
    </form>
  );
}