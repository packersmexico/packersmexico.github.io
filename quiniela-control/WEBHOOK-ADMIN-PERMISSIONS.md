# Quiniela · Webhook instantáneo Jotform · Permisos de administración

**Estado al 11-NOV-2026:** los avisos PUSH de participantes y la conciliación privada
`FIRST_VALID` siguen operativos. La única anomalía investigada es
`GET /form/{formId}/webhooks → 403` al usar la clave destinada a leer formularios.

## Arquitectura sin cambios

- **Captura:** formulario activo de `capture-config.json`.
- **Integridad:** `FIRST_VALID` con Redis y su conciliación existente.
- **Notificaciones:** push para IBRA / RODRIGO, deduplicado por evento.
- **Recuperación:** conciliación programada cada 10 minutos; *no depende del acceso a la API de webhooks*.
- **Redes:** `AUTO_PUBLISH=NO`.

## Permiso faltante y solución de menor privilegio

La credencial `PMX_JOTFORM_API_KEY` permanece destinada a lectura de formularios y respuestas.
Jotform no autoriza la inspección de webhooks con esa credencial (HTTP 403).
No se debe cambiar silenciosamente el alcance de una clave ya utilizada por producción.

1. El propietario del Jotform crea una **segunda clave API con Full Access**, dedicada
   exclusivamente a la administración de webhooks de los formularios Quiniela.
2. Configura el secreto **solo** en Vercel (proyecto actual del push-backend, entorno
   Production) con el nombre `PMX_JOTFORM_WEBHOOK_API_KEY`. Nunca guardar la clave en
   GitHub, Frontend, comentarios, logs, capturas ni el chat.
3. Realiza un **redeploy** del proyecto existente para cargar el nuevo entorno.
4. El workflow canónico `quiniela-capture-reconcile.yml` ejecuta
   `ENSURE_ACTIVE_WEBHOOK` en transiciones, push/manual y un reintento por hora.
   El endpoint inspecciona exclusivamente el formulario activo y:
   - deja intacto un webhook idéntico y ya configurado;
   - registra uno únicamente si no hay ninguno dirigido al receptor;
   - bloquea duplicados o una configuración con token discordante;
   - verifica de nuevo la lista de Jotform sin registrar la URL ni el token.
5. El diagnóstico `WEBHOOK_REGISTERED` certifica la **configuración**, no una
   entrega E2E. El primer envío nuevo *auténtico* comprobará el webhook y su
   recepción en Android, sin enviar registros de prueba ni alterar los picks.

Si Jotform sigue devolviendo 401/403 con esa clave: mantener el estado
`HOLD_JOTFORM_WEBHOOK_ADMIN_PERMISSION` y continuar con el polling existente.
Consultar permisos de Jotform con su soporte. No abrir un endpoint sin
autenticación, no reenviar/crear picks y no duplicar workflows o servicios.

### Evidencia técnica (sin secretos)

- Diagnóstico autenticado: usuario, W9, W10, sus preguntas y las respuestas de
  W10 consultables; exclusivamente `/form/W10/webhooks` responde 403.
- Los registros W10 `FIRST_VALID` y los push del operador siguen funcionando.
- Clave dedicada `PMX_JOTFORM_WEBHOOK_API_KEY`: **no configurada** durante esta auditoría.
- Jotform documenta el recurso GET/POST `/form/{id}/webhooks` y permisos
  `Full Access` para administrar integraciones.

Referencia: https://api.jotform.com/docs/
