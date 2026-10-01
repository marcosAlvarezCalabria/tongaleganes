# Contexto del proyecto: Tonga Tattoo Leganes

Fecha de contexto: 18 de agosto de 2026

## Resumen

Tonga Tattoo Leganes es una web publica para presentar el estudio, captar solicitudes de tatuajes y mostrar el trabajo artistico de Nuria Cordoba, junto con un CRM privado para gestionar solicitudes, citas, disponibilidad, archivos e integraciones.

El proyecto esta pensado como una propuesta comercial para estudios de tatuaje: una web visual de marca mas un panel interno preparado para convertir solicitudes en citas reales.

## Repositorio

- Repositorio: `https://github.com/marcosAlvarezCalabria/tongaleganes.git`
- Ruta local: `C:\Users\Marcos\Documents\tongaleganes`
- Rama actual: `main`
- Ultimo commit subido: `d5a78d2 fix: strengthen desktop parallax motion`
- Estado actual esperado: sin cambios tracked pendientes; `.codegraph/` y `.codex/` quedan sin trackear y no deben incluirse.

## Web publica

La parte publica esta enfocada en una identidad visual negra, dorada y editorial, con imagenes reales del estudio y del trabajo de tatuaje.

Superficies principales:

- Landing en `/`.
- Formulario publico de reserva en `/book`.
- Enlaces sociales a Instagram y Facebook.
- Seccion dedicada a Nuria Cordoba.
- Seccion de contacto y llamada a reserva.
- Seccion de agradecimiento con efecto de escritura manual.

Elementos destacados de la landing:

- Hero con slideshow automatico de imagenes de tatuajes.
- Boton para pausar o reanudar la galeria del hero.
- Cabecera flotante que aparece y queda fija al hacer scroll.
- Navegacion responsive con menu accesible en movil.
- Efecto de profundidad: el hero queda por detras y el resto de secciones pasan por encima.
- Parallax en fondos, galeria, retrato de Nuria, testimonial y contacto.
- Seccion "Conoce el estudio" con video que solo empieza al pulsar el boton.
- Galeria principal de trabajos.
- Carrusel horizontal "Mas trabajos del estudio" usando las imagenes nuevas subidas al proyecto.
- Parallax interno reforzado en desktop para que el movimiento sea mas visible.
- Soporte de `prefers-reduced-motion` para reducir movimiento cuando el usuario lo tenga configurado.

## Formulario publico `/book`

El formulario se redisenyo con una estetica editorial inspirada en la referencia visual aportada: fondo claro, imagenes superiores, textos con estilo manuscrito, modulos separados y detalles de color dentro de la paleta Tonga.

Caracteristicas:

- Seleccion visual de estilos de tatuaje mediante tarjetas.
- Campos para datos de contacto, idea, tamano, zona del cuerpo, fecha preferida y detalles del proyecto.
- Proteccion Turnstile cuando existe `TURNSTILE_SITE_KEY`.
- El script de Turnstile carga solo cuando hay site key y de forma diferida.
- Imagenes superiores con parallax interno.
- Cabecera con salida clara de vuelta a la landing.

## CRM privado

El CRM vive bajo `/crm` y esta pensado para uso del personal del estudio.

Funciones principales:

- Listado de solicitudes y citas.
- Dashboard operativo con metricas.
- Pipeline de trabajo: entrada web, diseno/presupuesto, sesiones cerradas y trabajos finalizados.
- Detalle de cita.
- Gestion de clientes, estados e historial.
- Programacion y reasignacion de citas.
- Bloques de disponibilidad.
- Rechazo de solapamientos de citas.
- Gestion y moderacion de archivos multimedia.
- Integracion con Google Calendar mediante outbox/proyeccion/reconciliacion.
- Contacto asistido mediante WhatsApp como siguiente paso comercial.

## Demo local del CRM

Para poder ensenar el producto con la minima friccion, el CRM tiene un modo demo local.

Comportamiento:

- En local, `/crm` entra directamente como propietario demo.
- No hace falta introducir email, token ni pasar por Cloudflare Access.
- Este modo solo funciona en `localhost`, `127.0.0.1` o `[::1]`.
- Fuera de local, si no hay Cloudflare Access configurado, el CRM no se abre.

Archivo principal:

- `studio/dev-crm.ts`

Este helper crea tablas locales si hace falta y siembra datos ficticios:

- Staff demo propietario y artista.
- Clientes ficticios.
- Citas en distintos estados.
- Bloque de disponibilidad.
- Proyeccion de Calendar demo.

## Seguridad y produccion

El CRM esta preparado para produccion mediante Cloudflare:

- Cloudflare Workers como runtime.
- Cloudflare D1 como persistencia.
- Cloudflare R2 para archivos multimedia.
- Cloudflare Access para autenticar al personal.
- Turnstile para proteger la captura publica.

Puntos importantes:

- No hardcodear credenciales.
- No activar un modo demo abierto en produccion.
- El bypass de demo esta limitado a local.
- En Netlify el CRM puede fallar porque no existen los bindings nativos de Cloudflare.
- Para probar el CRM correctamente se debe usar Wrangler/Cloudflare runtime.
- Una visita sin autenticacion valida a `/crm` puede devolver 404 de forma deliberada.

## Migraciones

Migraciones actuales:

- `drizzle/0000_studio_crm.sql`
- `drizzle/0001_public_intake.sql`
- `drizzle/0002_booking_style.sql`
- `drizzle/0003_calendar_projection_status.sql`

## Archivos clave

Web publica:

- `app/page.tsx`
- `app/HeroSlideshow.tsx`
- `app/SiteHeader.tsx`
- `app/StudioTour.tsx`
- `app/HandwrittenThanks.tsx`
- `app/(public)/book/page.tsx`
- `app/(public)/book/BookingForm.tsx`
- `app/globals.css`

CRM:

- `app/(crm)/crm/page.tsx`
- `app/(crm)/crm/view-model.ts`
- `app/(crm)/crm/appointments/[id]/page.tsx`
- `app/api/crm/_auth.ts`
- `app/api/crm/`
- `app/api/public/requests/route.ts`

Dominio e infraestructura:

- `studio/domain.ts`
- `studio/use-cases.ts`
- `studio/adapters/d1.ts`
- `studio/adapters/google-calendar.ts`
- `studio/calendar-drain.ts`
- `studio/booking.ts`
- `studio/dev-crm.ts`
- `worker/index.ts`
- `worker/assets.ts`
- `db/schema.ts`
- `vite.config.ts`

Tests:

- `tests/`
- `tests/crm-view-model.test.ts`
- `tests/crm-workerd.test.ts`

## Ultimos commits importantes

- `d5a78d2 fix: strengthen desktop parallax motion`
- `8160e93 feat: add more work carousel and hero depth`
- `3acee04 chore: add studio image assets`
- `acfeb43 feat: polish booking page and local crm demo`
- `0f880d5 Merge pull request #2 from marcosAlvarezCalabria/feature/studio-appointment-crm-14-calendar-reconciliation`
- `abb3b6b fix(crm): complete calendar reconciliation`
- `5c63661 fix(booking): harden public appointment intake`
- `e5181cb fix(worker): handle missing assets binding in local development`

## Validaciones realizadas recientemente

Tras los cambios de landing, carrusel, formulario y CRM demo se han ejecutado:

- `npm run lint`
- `npm run build`
- `npm run test:crm`
- comprobaciones HTTP locales de `/`, `/book`, `/crm` y /api/crm/appointments`
- detector Impeccable sobre las superficies visuales modificadas

Resultado: los checks principales pasaron en el momento de los cambios.

## Guia breve para ensenar en local

1. Levantar el proyecto:

```powershell
npm run dev
```

2. Abrir la web publica:

```text
http://localhost:3000/
```

3. Abrir el formulario:

```text
http://localhost:3000/book
```

4. Abrir el CRM demo:

```text
http://localhost:3000/crm
```

En local, el CRM entra sin pedir email gracias al modo demo.

## Guia breve para dejarlo listo en Cloudflare

Pasos previstos:

1. Crear recursos en Cloudflare:
   - Worker
   - D1
   - R2
   - Turnstile
   - Cloudflare Access

2. Configurar variables y secretos:
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET`
   - `CF_ACCESS_TEAM_DOMAIN`
   - `CF_ACCESS_AUD`
   - `GOOGLE_CALENDAR_ID`
   - secretos OAuth de Google Calendar si se activa la integracion real

3. Aplicar migraciones D1 remotas:

```powershell
npx wrangler d1 migrations apply <nombre-db> --remote
```

4. Crear staff inicial en D1 con el email que vaya a entrar por Cloudflare Access.

5. Proteger `/crm*` con Cloudflare Access.

6. Compilar y desplegar:

```powershell
npm run build
npx wrangler deploy
```

## Pendientes recomendados

- Crear una guia `DEPLOY_CLOUDFLARE.md` con comandos exactos.
- Crear `wrangler.jsonc` de produccion con bindings reales.
- Crear un seed SQL de demo/produccion controlado.
- Revisar cron de Calendar para que drain y reconciliacion queden alineados.
- Preparar una version demo online con Access opcional o credenciales demo controladas, sin abrir el CRM real.
- Optimizar nombres de imagenes nuevas si se quiere una libreria de assets mas limpia.

