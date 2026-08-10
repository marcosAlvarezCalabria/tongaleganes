import Image from "next/image";
import { MotionExperience } from "@/app/MotionExperience";
import { SiteHeader } from "@/app/SiteHeader";
import { BookingForm } from "./BookingForm";

export default async function BookPage() {
  const { env } = await import("cloudflare:workers");
  return (
    <main className="book-page">
      <MotionExperience />
      <SiteHeader ctaHref="/#inicio" ctaLabel="Volver al inicio" />
      <section className="book-contact" aria-labelledby="book-title">
        <div className="book-image-strip" aria-hidden="true">
          <figure className="book-strip-left">
            <div className="book-image-window" data-parallax data-parallax-speed="42">
              <Image src="/images/hero/nuria-04.jpg" alt="" fill sizes="48vw" priority unoptimized />
            </div>
            <figcaption>Custom tattoo direction</figcaption>
          </figure>
          <figure className="book-strip-right">
            <div className="book-image-window" data-parallax data-parallax-speed="-34">
              <Image src="/images/fine-work.jpg" alt="" fill sizes="42vw" priority unoptimized />
            </div>
            <figcaption>Design spaces</figcaption>
          </figure>
        </div>

        <div className="book-dot-rule" aria-hidden="true" />

        <div className="book-contact-grid">
          <aside className="book-contact-intro">
            <p className="book-script">Reserva privada</p>
            <h1 id="book-title">Contact</h1>
            <p className="book-handline">Déjanos tu idea. La leemos con calma y te respondemos por WhatsApp.</p>
            <div className="book-contact-details">
              <span>C/ San Nicasio, 7 · Leganés</span>
              <span>Tonga Tattoo Studio</span>
            </div>
          </aside>

          <div className="book-form-panel">
            <BookingForm turnstileSiteKey={env.TURNSTILE_SITE_KEY ?? ""} />
          </div>
        </div>
      </section>
    </main>
  );
}
