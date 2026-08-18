"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type AppointmentStyle = "fineline" | "neotrad" | "blackwork" | "bodysuit";

const STYLES_INSPIRATION: ReadonlyArray<{ id: AppointmentStyle; title: string; image: string; desc: string }> = [
  { id: "fineline", title: "Fine Line & Minimalist", image: "/images/fineline.jpg", desc: "Lineas delicadas, geometria y sutileza." },
  { id: "neotrad", title: "Neo-Traditional", image: "/images/artwork.jpg", desc: "Contraste vibrante y expresividad clasica." },
  { id: "blackwork", title: "Blackwork & Ornamental", image: "/images/fine-work.jpg", desc: "Tinta negra profunda y ornamentacion." },
  { id: "bodysuit", title: "Large Scale & Bodysuit", image: "/images/bodysuit.jpg", desc: "Piezas de gran formato y anatomia." },
];

const STYLE_LABELS: Record<AppointmentStyle, string> = {
  fineline: "Fine Line & Minimalist",
  neotrad: "Neo-Traditional",
  blackwork: "Blackwork & Ornamental",
  bodysuit: "Large Scale & Bodysuit",
};

function normalizeSpanishPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("34") && digits.length === 11) return `+${digits}`;
  if (digits.length === 9) return `+34${digits}`;
  return value.trim();
}

function formatDate(value: FormDataEntryValue | null) {
  if (!value) return "Sin preferencia cerrada";
  const raw = String(value);
  if (!raw) return "Sin preferencia cerrada";
  return raw.replace("T", " ");
}

export function BookingForm() {
  const [selectedStyle, setSelectedStyle] = useState<AppointmentStyle>("fineline");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = normalizeSpanishPhone(String(form.get("phone") ?? ""));
    const artist = form.get("artist") === "nuria-cordoba" ? "Nuria Cordoba" : "Sin preferencia";
    const preferredStartAt = formatDate(form.get("preferredStartAt"));

    const text = [
      "Hola Tonga Tattoo, quiero pedir cita.",
      "",
      `Nombre: ${name}`,
      `Telefono: ${phone}`,
      email ? `Email: ${email}` : "Email: No indicado",
      `Estilo: ${STYLE_LABELS[selectedStyle]}`,
      `Artista: ${artist}`,
      `Fecha orientativa: ${preferredStartAt}`,
      "",
      "Idea:",
      description.trim(),
    ].join("\n");

    const whatsappUrl = `https://wa.me/34600037560?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setMessage({ ok: true, text: "Te abrimos WhatsApp con la solicitud preparada. Si no se abre, escribenos al 600 037 560." });
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="artistic-booking-form">
      <section className="booking-module booking-module-styles" aria-labelledby="booking-style-title">
        <div className="booking-section-title">
          <span className="step-num">01</span>
          <h3 id="booking-style-title">Selecciona el estilo de referencia</h3>
          <p>Elige la direccion artistica que mejor encaje con tu vision.</p>
        </div>

        <div className="style-inspiration-grid">
          {STYLES_INSPIRATION.map((style) => (
            <button
              type="button"
              key={style.id}
              className={`style-card ${selectedStyle === style.id ? "active" : ""}`}
              onClick={() => setSelectedStyle(style.id)}
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
          <h3 id="booking-project-title">Cuentanos tu proyecto</h3>
          <p>Detallanos la zona del cuerpo, tamano aproximado y concepto.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nombre y Apellido</label>
            <input id="name" name="name" required maxLength={100} placeholder="Tu nombre completo" />
          </div>
          <div className="form-field">
            <label htmlFor="email">Correo Electronico</label>
            <input id="email" name="email" type="email" maxLength={254} placeholder="tu@email.com" />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Telefono / WhatsApp</label>
            <input id="phone" name="phone" type="tel" required placeholder="+34 600 000 000" maxLength={32} />
          </div>
          <div className="form-field">
            <label htmlFor="artist">Artista Preferido</label>
            <select id="artist" name="artist" defaultValue="none">
              <option value="none">Sin preferencia</option>
              <option value="nuria-cordoba">Nuria Cordoba</option>
            </select>
          </div>
          <div className="form-field full-width">
            <label htmlFor="preferredStartAt">Fecha u Ocasion Preferida</label>
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
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe tu idea, tamano aproximado, ubicacion corporal..."
            />
          </div>
          <div className="form-field full-width booking-whatsapp-note">
            Al enviar se abrira WhatsApp con el briefing preparado. Asi la demo no pide login ni depende del CRM.
          </div>
        </div>

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Preparando WhatsApp..." : "Preparar solicitud por WhatsApp"}
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
