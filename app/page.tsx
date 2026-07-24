import Image from "next/image";
import { MotionExperience } from "./MotionExperience";

const gallery = [
  {
    src: "/images/featured.jpg",
    alt: "Tatuaje realista de una mujer con flores realizado por Tonga Tattoo",
    title: "Realismo",
    detail: "Pieza de convención",
    featured: true,
  },
  {
    src: "/images/bodysuit.jpg",
    alt: "Trabajo de tatuaje de gran formato realizado por Tonga Tattoo",
    title: "Gran formato",
    detail: "Proyecto bodysuit",
  },
  {
    src: "/images/healed-work.jpg",
    alt: "Trabajo de tatuaje curado realizado por Tonga Tattoo",
    title: "Trabajo curado",
    detail: "Resultado consolidado",
  },
  {
    src: "/images/healed-birds.jpg",
    alt: "Tatuaje curado de pájaros realizado por Tonga Tattoo",
    title: "Color y detalle",
    detail: "Trabajo curado",
  },
  {
    src: "/images/fineline.jpg",
    alt: "Tatuaje de línea fina realizado por Tonga Tattoo",
    title: "Fine line",
    detail: "Trazo delicado",
  },
  {
    src: "/images/fine-lines.jpg",
    alt: "Composición de tatuajes de línea fina de Tonga Tattoo",
    title: "Línea fina",
    detail: "Selección de estudio",
  },
];

export default function Home() {
  return (
    <main>
      <MotionExperience />
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Tonga Tattoo, inicio">
          <Image src="/images/logo.png" alt="Tonga Tattoo" width={640} height={760} priority />
        </a>
        <nav aria-label="Navegación principal">
          <a href="#trabajos">Trabajos</a>
          <a href="#nuria">Nuria</a>
          <a href="#estudio">Estudio</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <a className="header-cta" href="https://wa.me/34600037560" target="_blank" rel="noreferrer">
          Pedir cita
        </a>
      </header>

      <section className="hero" id="inicio" data-scroll-hero>
        <div className="hero-copy">
          <p className="eyebrow">Estudio de tatuajes · Leganés</p>
          <h1>Tu historia,<br /><em>en la piel.</em></h1>
          <p className="hero-intro">
            Tatuajes únicos, diseñados contigo y ejecutados con precisión. Especialistas en
            realismo, fine line y proyectos de gran formato.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://wa.me/34600037560" target="_blank" rel="noreferrer">
              Cuéntanos tu idea
            </a>
            <a className="text-link" href="#trabajos">Ver trabajos <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof" aria-label="Datos destacados">
            <div><strong>3.8K</strong><span>Comunidad en Instagram</span></div>
            <div><strong>100%</strong><span>Diseños personalizados</span></div>
          </div>
        </div>
        <div className="hero-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-scroll-frame
            className="hero-frame"
            src="/frames/hero/frame-001.webp"
            alt="Proceso creativo de Tonga Tattoo controlado por el desplazamiento"
            width="720"
            height="1280"
            decoding="async"
            fetchPriority="high"
          />
          <div className="hero-video-shade" aria-hidden="true" />
          <span
            className="frame-loader"
            data-frame-loader
            role="status"
            aria-label="Cargando secuencia visual"
          >
            <span>Cargando secuencia</span>
          </span>
          <div className="image-badge">
            <span>Desliza para descubrir</span>
            <strong>El proceso</strong>
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <span />
            Scroll
          </div>
        </div>
      </section>

      <section className="manifesto" id="estudio">
        <p className="eyebrow">Tonga Tattoo</p>
        <h2>No hacemos tatuajes.<br /><em>Contamos historias.</em></h2>
        <p>
          Cada pieza nace de una conversación. Escuchamos tu idea, la transformamos en un
          diseño exclusivo y cuidamos cada detalle, desde el primer boceto hasta la curación.
        </p>
      </section>

      <section className="work-section" id="trabajos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selección del estudio</p>
            <h2>Trabajos que<br />hablan por sí solos.</h2>
          </div>
          <p>Una mirada al trazo, la composición y los proyectos que toman forma en el estudio.</p>
        </div>
        <div className="gallery">
          {gallery.map((item) => (
            <article className={item.featured ? "gallery-card gallery-card-featured" : "gallery-card"} key={item.src}>
              <div className="gallery-image" data-parallax>
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 700px) 100vw, 33vw" />
              </div>
              <div className="gallery-caption">
                <h3>{item.title}</h3>
                <span>{item.detail}</span>
              </div>
            </article>
          ))}
        </div>
        <a className="button button-outline" href="https://www.instagram.com/tongaleganes/" target="_blank" rel="noreferrer">
          Ver más en Instagram
        </a>
      </section>

      <section className="artist-feature" id="nuria">
        <div className="artist-signature" aria-hidden="true">
          <span className="artist-studio-line">Tonga Tattoo · Leganés</span>
          <strong>N</strong>
          <strong>C</strong>
          <span className="artist-signature-line" />
        </div>
        <div className="artist-story">
          <p className="artist-kicker">La artista</p>
          <h2>Nuria<br /><em>Córdoba.</em></h2>
          <p className="artist-lead">
            Una mirada propia dentro de Tonga Tattoo. Descubre su universo creativo,
            sus piezas y el trabajo que comparte detrás de cada proyecto.
          </p>
          <div className="artist-links" aria-label="Perfiles de Nuria Córdoba">
            <a href="https://www.instagram.com/_nuria_cordoba/" target="_blank" rel="noreferrer">
              <span>Instagram</span>
              <strong>@_nuria_cordoba</strong>
            </a>
            <a href="https://www.facebook.com/NuriaCordobaTorrente" target="_blank" rel="noreferrer">
              <span>Facebook</span>
              <strong>Nuria Córdoba Torrente</strong>
            </a>
          </div>
          <a className="button button-artist" href="https://wa.me/34600037560?text=Hola%2C%20quiero%20pedir%20una%20cita%20con%20Nuria" target="_blank" rel="noreferrer">
            Pedir cita con Nuria
          </a>
        </div>
      </section>

      <section className="testimonial">
        <span className="quote-mark" aria-hidden="true">“</span>
        <blockquote>
          Pero buenoooooo… ¡grande mi gran amiga!
        </blockquote>
        <p><strong>@nekane2025</strong> · Comentario en Instagram</p>
      </section>

      <section className="contact" id="contacto">
        <div className="contact-main">
          <p className="eyebrow">¿Tienes una idea?</p>
          <h2>Vamos a hacerla<br /><em>inolvidable.</em></h2>
          <a className="button button-dark" href="https://wa.me/34600037560" target="_blank" rel="noreferrer">
            Escríbenos por WhatsApp
          </a>
        </div>
        <address>
          <div>
            <span>Visítanos</span>
            <strong>C/ San Nicasio, 7<br />Leganés, Madrid</strong>
          </div>
          <div>
            <span>Llámanos</span>
            <a href="tel:+34916898644">916 898 644</a>
            <a href="tel:+34600037560">600 037 560</a>
          </div>
          <div>
            <span>Síguenos</span>
            <a href="https://www.instagram.com/tongaleganes/" target="_blank" rel="noreferrer">@tongaleganes</a>
          </div>
        </address>
      </section>

      <footer>
        <Image src="/images/logo.png" alt="Tonga Tattoo" width={180} height={214} />
        <p>Arte que se queda contigo.</p>
        <span>© {new Date().getFullYear()} Tonga Tattoo</span>
      </footer>
    </main>
  );
}
