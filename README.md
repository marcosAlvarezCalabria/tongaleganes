# Tonga Tattoo Leganes

Web publica de Tonga Tattoo Leganes: landing editorial, galeria de trabajos, reseñas, seccion de estudio y formulario de cita orientado a WhatsApp.

## Requisitos

- Node.js `>=22.13.0`

## Comandos

```bash
npm install
npm run dev
npm run build
npm run build:netlify
npm test
```

## Estructura

- `app/(public)/`: paginas publicas de la web.
- `app/(public)/book/`: formulario publico de reserva sin backend CRM.
- `public/images/`: imagenes y trabajos del estudio.
- `public/media/`: video publico del estudio.
- `tests/rendered-html.test.mjs`: prueba de render publico.

## CRM

El CRM privado se ha separado del proyecto publico. La copia de trabajo esta en:

`C:\Users\Marcos\Documents\tattoo-crm`

Este repositorio queda dedicado a la web publica para reducir friccion en demos y despliegues.
