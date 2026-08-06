import { SiteHeader } from "@/app/SiteHeader";
import { BookingForm } from "./BookingForm";

export default async function BookPage() {
  const { env } = await import("cloudflare:workers");
  return (
    <main>
      <SiteHeader />
      <section className="contact">
        <div className="contact-main">
          <p className="eyebrow">Tu próxima pieza</p>
          <h1>Cuéntanos<br /><em>tu idea.</em></h1>
          <p>Envíanos una solicitud y prepararemos la conversación contigo.</p>
          <BookingForm turnstileSiteKey={env.TURNSTILE_SITE_KEY ?? ""} />
        </div>
      </section>
    </main>
  );
}
