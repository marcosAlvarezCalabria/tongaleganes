import Image from "next/image";
import { HandwrittenThanks } from "./HandwrittenThanks";
import { HeroSlideshow } from "./HeroSlideshow";
import { MotionExperience } from "./MotionExperience";
import { SiteHeader } from "./SiteHeader";
import { StudioTour } from "./StudioTour";

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
const moreWork = [
  {
    src: "/images/SaveClip.App_542901394_18523073467060874_3344886948577056971_n.jpg",
    alt: "Tatuaje reciente realizado en Tonga Tattoo Leganés",
    title: "Pieza reciente",
    detail: "Trabajo de estudio",
  },
  {
    src: "/images/SaveClip.App_550359196_18524711494060874_6285919954784475764_n.jpg",
    alt: "Detalle de tatuaje realizado en Tonga Tattoo Leganés",
    title: "Detalle y sombra",
    detail: "Nueva selección",
  },
  {
    src: "/images/SaveClip.App_622045242_17986406357929220_6411781094818921976_n.jpg",
    alt: "Trabajo de tatuaje de Tonga Tattoo Leganés",
    title: "Composición",
    detail: "Línea y volumen",
  },
  {
    src: "/images/SaveClip.App_622408308_18051488273480109_2150560497511389574_n.jpg",
    alt: "Tatuaje artístico realizado en Tonga Tattoo Leganés",
    title: "Más trabajos",
    detail: "Archivo reciente",
  },
];
export default function Home() {
  return (
    <main className="home-page">
      <MotionExperience />
      <SiteHeader />

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Estudio de tatuajes · Leganés</p>
          <h1>Tu historia,<br /><em>en la piel.</em></h1>
          <p className="hero-intro">
            Tatuajes únicos, diseñados contigo y ejecutados con precisión. Especialistas en
            realismo, fine line y proyectos de gran formato.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/book">
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
          <HeroSlideshow />
          <div className="image-badge">
            <span>Obra de</span>
            <strong>Nuria Córdoba</strong>
          </div>
        </div>
      </section>

      <div className="home-scroll-panel">
      <section className="manifesto" id="estudio">
        <div className="parallax-backdrop manifesto-backdrop" data-parallax data-parallax-speed="190" aria-hidden="true">
          <Image src="/images/artwork.jpg" alt="" fill sizes="100vw" loading="lazy" unoptimized />
        </div>
        <div className="section-content">
          <p className="eyebrow">Tonga Tattoo</p>
          <h2>No hacemos tatuajes.<br /><em>Contamos historias.</em></h2>
          <p>
            Cada pieza nace de una conversación. Escuchamos tu idea, la transformamos en un
            diseño exclusivo y cuidamos cada detalle, desde el primer boceto hasta la curación.
          </p>
        </div>
      </section>

      <section className="studio-tour" id="conoce-el-estudio">
        <div className="studio-tour-stage">
          <div className="studio-tour-copy">
            <p className="studio-tour-kicker">Puertas abiertas</p>
            <h2>Conoce<br /><em>el estudio.</em></h2>
            <p>
              Un espacio pensado para escuchar tu idea, crear con calma y cuidar
              cada detalle del proceso.
            </p>
            <span className="studio-tour-scroll" aria-hidden="true">Desliza para recorrer</span>
          </div>
          <div className="studio-media" data-parallax data-parallax-speed="72">
            <StudioTour />
          </div>
        </div>
      </section>

      <section className="work-section" id="trabajos">
        <div className="parallax-backdrop work-backdrop" data-parallax data-parallax-speed="150" aria-hidden="true">
          <Image src="/images/fine-work.jpg" alt="" fill sizes="45vw" loading="lazy" unoptimized />
        </div>
        <div className="section-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selección del estudio</p>
              <h2>Trabajos que<br />hablan por sí solos.</h2>
            </div>
            <p>Una mirada al trazo, la composición y los proyectos que toman forma en el estudio.</p>
          </div>
          <div className="gallery">
            {gallery.map((item, index) => (
              <article className={item.featured ? "gallery-card gallery-card-featured" : "gallery-card"} key={item.src}>
                <div className="gallery-image" data-parallax data-parallax-speed={index % 2 === 0 ? "112" : "78"}>
                  <Image src={item.src} alt={item.alt} fill sizes="(max-width: 700px) 100vw, 33vw" loading="lazy" unoptimized />
                </div>
                <div className="gallery-caption">
                  <h3>{item.title}</h3>
                  <span>{item.detail}</span>
                </div>
              </article>
            ))}
          </div>
          <section className="more-work" aria-labelledby="more-work-title">
            <div className="more-work-heading">
              <p className="eyebrow">Archivo reciente</p>
              <h3 id="more-work-title">Más trabajos del estudio.</h3>
            </div>
            <div className="more-work-carousel" aria-label="Más trabajos recientes">
              {moreWork.map((item, index) => (
                <article className="more-work-card" key={item.src}>
                  <div className="more-work-image" data-parallax data-parallax-speed={index % 2 === 0 ? "108" : "-86"}>
                    <Image src={item.src} alt={item.alt} fill sizes="(max-width: 700px) 78vw, 34vw" loading="lazy" unoptimized />
                  </div>
                  <div className="more-work-caption">
                    <h4>{item.title}</h4>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <a className="button button-outline" href="https://www.instagram.com/tongaleganes/" target="_blank" rel="noreferrer">
            Ver más en Instagram
          </a>
        </div>
      </section>

      <section className="artist-feature" id="nuria">
        <div className="artist-portrait" data-parallax data-parallax-speed="150">
          <Image
            src="/images/nuria-cordoba.jpg"
            alt="Retrato de Nuria Córdoba"
            fill
            sizes="(max-width: 900px) 100vw, 52vw"
            loading="lazy"
            unoptimized
          />
          <span className="artist-studio-line">Tonga Tattoo · Leganés</span>
          <span className="artist-portrait-name" aria-hidden="true">Nuria</span>
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
          <a className="button button-artist" href="/book">
            Pedir cita con Nuria
          </a>
        </div>
      </section>

      <section className="reviews-section" aria-labelledby="reviews-title">
        <div className="parallax-backdrop reviews-backdrop" data-parallax data-parallax-speed="178" aria-hidden="true">
          <Image src="/images/memories.jpg" alt="" fill sizes="100vw" loading="lazy" unoptimized />
        </div>
        <div className="reviews-shell">
          <div className="reviews-score" aria-label="Valoración media aproximada en listados públicos">
            <span>4,8</span>
            <strong>/5</strong>
            <p>Más de 240 opiniones públicas</p>
          </div>
          <div className="reviews-copy">
            <p className="eyebrow">Reseñas de clientes</p>
            <h2 id="reviews-title">La confianza también se nota antes de tatuar.</h2>
            <p>
              En las opiniones públicas sobre Tonga Tattoo Leganés se repiten tres ideas: trato cercano, explicación clara del proceso y un estudio cuidado para vivir el tatuaje con calma.
            </p>
            <div className="review-themes" aria-label="Temas destacados en las reseñas">
              <span>Trato profesional</span>
              <span>Primera experiencia cuidada</span>
              <span>Higiene y confianza</span>
            </div>
            <a className="button button-outline review-link" href="https://www.google.com/search?q=Tonga+Tattoo+Legan%C3%A9s+rese%C3%B1as" target="_blank" rel="noreferrer">
              Ver reseñas en Google
            </a>
          </div>
        </div>
      </section>
      <section className="contact" id="contacto">
        <div className="parallax-backdrop contact-backdrop" data-parallax data-parallax-speed="165" aria-hidden="true">
          <Image src="/images/healed-birds.jpg" alt="" fill sizes="65vw" loading="lazy" unoptimized />
        </div>
        <div className="contact-main">
          <p className="eyebrow">¿Tienes una idea?</p>
          <h2>Vamos a hacerla<br /><em>inolvidable.</em></h2>
          <a className="button button-dark" href="/book">
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

      <section className="thanks-section" aria-labelledby="thanks-title">
        <div className="thanks-heading">
          <span>Una nota de Nuria</span>
          <h2 id="thanks-title">Siempre,<br /><em>gracias.</em></h2>
        </div>
        <HandwrittenThanks />
        <div className="thanks-signature" aria-hidden="true">
          Nuria Córdoba
          <span />
        </div>
      </section>

      <footer>
        <Image src="/images/logo.png" alt="Tonga Tattoo" width={180} height={214} loading="lazy" unoptimized />
        <p>Arte que se queda contigo.</p>
        <span>© {new Date().getFullYear()} Tonga Tattoo</span>
      </footer>
      </div>
    </main>
  );
}
