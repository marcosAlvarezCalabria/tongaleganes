import Image from "next/image";
import { MotionExperience } from "@/app/MotionExperience";
import { SiteHeader } from "@/app/SiteHeader";
import { BookingForm } from "./BookingForm";

export default function BookPage() {
  return (
    <main className="book-page book-page-studio">
      <MotionExperience />
      <SiteHeader ctaHref="/" ctaLabel="Volver atras" homeHref="/" ctaBehavior="back" />
      <section className="studio-booking-shell" aria-labelledby="book-title">
        <div className="studio-booking-backdrop" aria-hidden="true">
          <Image src="/images/SaveClip.App_542901394_18523073467060874_3344886948577056971_n.jpg" alt="" fill sizes="100vw" priority unoptimized />
        </div>

        <div className="studio-booking-layout">
          <aside className="booking-brief-panel">
            <p className="booking-brief-kicker">Tonga Tattoo Leganes</p>
            <h1 id="book-title">Brief privado de tatuaje</h1>
            <p className="booking-brief-copy">
              Cuentanos la pieza, la zona y el momento ideal. Revisamos tu idea y te respondemos por WhatsApp para cerrar la cita con calma.
            </p>

            <div className="booking-brief-media" data-parallax data-parallax-speed="64" aria-hidden="true">
              <Image src="/images/SaveClip.App_622408308_18051488273480109_2150560497511389574_n.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 38vw" priority unoptimized />
            </div>

            <dl className="booking-brief-facts" aria-label="Datos de reserva">
              <div>
                <dt>Respuesta</dt>
                <dd>WhatsApp</dd>
              </div>
              <div>
                <dt>Estudio</dt>
                <dd>Leganes</dd>
              </div>
              <div>
                <dt>Direccion</dt>
                <dd>C/ San Nicasio, 7</dd>
              </div>
            </dl>
          </aside>

          <div className="booking-form-stage">
            <div className="booking-form-heading">
              <span>Solicitud de cita</span>
              <p>Completa el briefing para preparar la conversacion.</p>
            </div>
            <BookingForm />
          </div>
        </div>
      </section>
    </main>
  );
}
