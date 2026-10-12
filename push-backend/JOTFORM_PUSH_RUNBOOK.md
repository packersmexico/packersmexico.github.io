# PMX Quiniela · Push por cada envío válido · Operación
Estado W6 (12 OCT 2026): backend dual-push desplegado PR #36; formulario 262845110194050 ENABLED; **integración webhook de W6 PENDIENTE DE CONFIGURACIÓN/QA DE RECEPCIÓN REAL**. Rodrigo no usa Jotform.

## Capas (sin WhatsApp)
1. **Inmediata:** el formulario activo de Jotform manda POST al endpoint privado de Vercel `/api/jotform-submission`. Solo el remitente que conoce el token cifrado de Vercel `PMX_JOTFORM_WEBHOOK_TOKEN` puede enviar callbacks. Se acepta exclusivamente `capture-config.json.form_id` en estado `OPEN`, se identifica un participante de la lista canónica y se notifica una sola vez por participante por semana. El formulario exige las 14 elecciones de W6; si no existe webhook probado, no fingir que el envío llegó.
2. **Respaldo por sincronización:** `.github/workflows/quiniela-participant-push.yml` detecta respuestas nuevas en `capture-config.json` o `data.json`, después de la sincronización real del formulario, con política `FIRST_VALID_SUBMISSION_LOCKED` y sin notificar duplicados.
3. **Entrega:** Vercel Web Push a **RODRIGO** y **IBRA**; claves de deduplicación por administrador y evento. Ningún pick aparece en la alerta.

## Alta de cada nueva semana (obligatorio)
1. Crear y QA de nuevo formulario Jotform WN con partidos oficiales y control de envío.
2. Registrar en `quiniela-control/capture-config.json` la semana, `form_id`, `status:OPEN`, fecha de cierre y roster de participantes. No modificar ni reabrir W5 histórico.
3. **IBRA, no Rodrigo:** en el formulario nuevo, abrir **Settings > Integrations > Webhooks**, agregar el endpoint productivo `https://packersmexicogithubio-push-backend.vercel.app/api/jotform-submission?token=VALOR_PRIVADO` reemplazando `VALOR_PRIVADO` exclusivamente dentro de la UI segura por el secreto de Vercel `PMX_JOTFORM_WEBHOOK_TOKEN`. Nunca revelar ese valor en GitHub, chat, capturas o enlaces públicos. Confirmar que no exista otro webhook idéntico. El conector Jotform no concede desde ChatGPT permisos para completar esta integración; su edit_form únicamente devolvió las instrucciones del menú.
4. Confirmar con el **primer envío real** que el endpoint Vercel registra `ACCEPTED`, evento con `PICK_RECEIVED` y destinatarios `RODRIGO` e `IBRA` en `SENT` o, si ya se notificó, `ALREADY_SENT`. No crear respuestas ficticias en la quiniela productiva. Si un operador figura `NOT_SUBSCRIBED` o `SUBSCRIPTION_EXPIRED`, deberá activar notificaciones desde su propio teléfono; no declarar entrega verificada.
5. Confirmar después que la sincronización del pick a GitHub no envía un segundo aviso de ese mismo `submissionID` (mismo `eventKey`).

## Limitaciones / compuertas
- El conector Jotform actual no expone una acción específica para registrar su webhook. Sin el paso 3, sólo habrá push al actualizarse los datos en GitHub, **no** push instantáneo de Jotform.
- Los envíos webhook se tratan como **recibidos / pendiente validación**. La fuente canónica de picks continúa siendo el registro `FIRST_VALID` revisado por el funnel; no se aceptan ni mutan picks desde la llamada web.
- `NOT_ACTIVE_OPEN_FORM` 409 significa que el formulario no coincide con la Week activa o que la captura está cerrada. No forzar ni evadir.
- Si una suscripción caduca o falla, no declarar `SENT`; reactivar notificaciones desde el panel.
- **Matriz operativa V2:** formulario `Wn_OPEN` desde `capture-config.json` aunque `data.json` sea Week anterior; participante individual desde Jotform/primer registro; resultados `Wn_FINAL` solo tras TODOS los juegos oficiales, sin exigir imágenes; imágenes `Wn_ASSET_READY_{SLOT}` únicamente `asset-index READY` y QA; publicación `Wn_PUBLISHED_{SLOT}` solo con registro explícito de 05, no por existir PNG.
- **Deduplicación:** operador dashboard no envía pushes; el endpoint milestones genera y deduplica por operador+eventKey en Redis. `W6_OPEN` se envió antes del PR #36 a RODRIGO e IBRA y no debe repetirse.
- **Vigilancia del backend:** workflow Quiniela Milestone Push cada 10 minutos + en cambios de data/config/assets. Notificaciones de participante instantáneas SOLO si el webhook está instalado; respaldo en primer registro realmente conciliado y persistido.
- **Requisito de evidencias:** Vercel deployment READY, respuesta por operador y eventKey, run de GitHub, y readback del State Board; un PASS de pruebas no prueba entrega física al teléfono.
- AUTO_PUBLISH = NO. El webhook nunca publica resultados ni Figma.
