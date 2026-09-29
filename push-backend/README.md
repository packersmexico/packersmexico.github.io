# PMX · Quiniela Push Backend

Backend privado de Web Push para el panel de Quiniela. El frontend público permanece en GitHub Pages.

## Vercel

Importar este repositorio en Vercel y seleccionar **Root Directory: `push-backend`**.

Variables requeridas:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `RODRIGO_PUSH_CODE`
- `PMX_PUSH_SECRET`
- `ALLOWED_ORIGIN=https://packersmexico.github.io`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Los dos últimos se obtienen conectando un recurso Redis/Upstash al proyecto de Vercel.

## Seguridad

- No guardar secretos en GitHub Pages ni en este repositorio.
- `/api/subscribe` exige código de vinculación.
- `/api/notify` exige Bearer `PMX_PUSH_SECRET`.
- El backend deduplica cada `eventKey`.
- La suscripción de Rodrigo se guarda en Redis, no en el repositorio público.
