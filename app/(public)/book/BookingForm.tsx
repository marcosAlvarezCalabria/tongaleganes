"use client";

import { FormEvent, useState } from "react";

export function BookingForm() {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/public/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bookingMode: "request",
        customer: { name: form.get("name"), email: form.get("email"), phone: form.get("phone") },
        appointment: { preferredStartAt: form.get("preferredStartAt"), description: form.get("description") },
        artistPreference: form.get("artist") === "none" ? { kind: "none" } : { kind: "artist", artistId: form.get("artist") },
        turnstileToken: form.get("turnstileToken"),
      }),
    });
    setMessage(response.ok ? "Hemos recibido tu idea. Te responderemos pronto." : "No hemos podido enviar la solicitud. Revísala e inténtalo de nuevo.");
  }

  return (
    <form onSubmit={submit}>
      <p><label>Nombre <input name="name" required maxLength={100} /></label></p>
      <p><label>Email <input name="email" type="email" required maxLength={254} /></label></p>
      <p><label>Teléfono <input name="phone" type="tel" required placeholder="+34600037560" maxLength={32} /></label></p>
      <p><label>Artista <select name="artist" defaultValue="none"><option value="none">Sin preferencia</option><option value="nuria-cordoba">Nuria Córdoba</option></select></label></p>
      <p><label>Fecha preferida <input name="preferredStartAt" type="datetime-local" required /></label></p>
      <p><label>Cuéntanos tu idea <textarea name="description" required maxLength={2000} /></label></p>
      <p><label>Código Turnstile <input name="turnstileToken" required /></label></p>
      <button className="button button-dark" type="submit">Enviar solicitud</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
