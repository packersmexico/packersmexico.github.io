# PMX Quiniela · Push por cada envío válido · Operación
Estado: BACKEND READY; JOTFORM WEBHOOK EN FUTURA WEEK PENDING.

## Capas (sin WhatsApp)
1. **Inmediata:** el formulario activo de Jotform manda POST al endpoint privado de Vercel `/api/jotform-submission`. Solo el remitente que conoce el token cifrado de Vercel `PMX_JOTFORM_WEBHOOK_TOKEN` puede enviar callbacks. Se acepta exclusivamente `capture-config.json.form_id` en estado `OPEN`, se identifica un participante de la lista canónica y se notifica una sola vez por participante por semana.
2. **Respaldo por sincronización:** `.github/workflows/quiniela-participant-push.yml` detecta respuestas nuevas en `capture-config.json` o `data.json`, después de la sincronización real del formulario, con política `FIRST_VALID_SUBMISSION_LOCKED` y sin notificar duplicados.
3. **Entrega:** Vercel Web Push a **RODRIGO** y **IBRA**; claves de deduplicación por administrador y evento. Ningún pick aparece en la alerta.

## Alta de cada nueva semana (obligatorio)
1. Crear y QA de nuevo formulario Jotform WN con partidos oficiales y control de envío.
2. Registrar en `quiniela-control/capture-config.json` la semana, `form_id`, `status:OPEN`, fecha de cierre y roster de participantes. No modificar ni reabrir W5 histórico.
3. En el nuevo formulario: **Settings > Integrations > Webhooks**. Insertar la URL del endpoint productivo con `?token=` y **el valor privado** de `PMX_JOTFORM_WEBHOOK_TOKEN` recuperado desde Vercel (nunca guardar valor en GitHub/chat). Completar integración.
4. Confirmar con la primera respuesta **real** que Vercel registra `ACCEPTED` y entrega `SENT` para Rodrigo e Ibra. No crear respuestas de prueba ficticias en quiniela productiva.
5. Confirmar después que la sincronización del pick a GitHub no envía un segundo aviso de ese mismo `submissionID` (mismo `eventKey`).

## Limitaciones / compuertas
- El conector Jotform actual no expone una acción específica para registrar su webhook. Sin el paso 3, sólo habrá push al actualizarse los datos en GitHub, **no** push instantáneo de Jotform.
- Los envíos webhook se tratan como **recibidos / pendiente validación**. La fuente canónica de picks continúa siendo el registro `FIRST_VALID` revisado por el funnel; no se aceptan ni mutan picks desde la llamada web.
- `NOT_ACTIVE_OPEN_FORM` 409 significa que el formulario no coincide con la Week activa o que la captura está cerrada. No forzar ni evadir.
- Si una suscripción caduca o falla, no declarar `SENT`; reactivar notificaciones desde el panel.
- AUTO_PUBLISH = NO. El webhook nunca publica resultados ni Figma.
