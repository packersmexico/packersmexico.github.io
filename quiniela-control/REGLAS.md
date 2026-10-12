# Quiniela PACKERS MÉXICO · reglas operativas

**Dirección · decisión vigente 12/oct/2026 · propietario: QUINIELA_CONTROLLER (GitHub Actions)**

## 1 · Empates NFL = PUSH (sin ganador ni penalización)

- Si una fuente deportiva confirma el empate final, el juego conserva `status: TIE`, `winner: null` y el marcador oficial.
- Para **cada participante**: ese partido otorga **0 aciertos y 0 errores**. No existe un ganador que pueda pronosticarse.
- El partido sí cuenta como **decidido** (`results.final`); **no** cuenta en el denominador de partidos **puntuables** (`results.scored`).
- `results.pushes` identifica los encuentros nulos; `results.ties` sigue mostrando los empates reales.
- Para una selección válida: `correct + wrong = results.scored` (sin incluir juegos programados/en vivo ni empates PUSH). La puntuación de temporada suma la base previa más cada clasificación semanal, sin alterar picks históricos.
- Ningún ajuste a resultados ocurre por localía, overtime sin ganador, orden del formulario o desempates inventados. La regla es uniforme y prospectiva, e incluye la corrección W5 G09.

**Caso de regresión Week 5 2026:** `G09 · NYG @ WAS · NYG 27–27 WAS`, 1 PUSH, 13 juegos puntuables y 14/15 decididos (con G15 programado al momento de la decisión). El ajuste correcto quita un **error** semanal y uno acumulado a **cada uno de los nueve** participantes sin cambiar aciertos.

## 2 · Captura, registro inicial vinculante

- Para cada participante solo cuenta el **primer envío válido** recibido dentro de la ventana autorizada: identidad reconocible, totalidad de elecciones requeridas y vínculo verificable entre `question_id` y `Gxx` (no confiar en orden visual).
- Envíos duplicados posteriores **no sustituyen** ese registro, aunque la captura siga abierta. Conservar evidencia de envíos ignorados sin sumar entradas al ranking.
- **REGLA EXPLÍCITA DE DIRECCIÓN: TODOS VAMOS CON GREEN BAY POR DEFECTO.** Cuando Green Bay participe en la semana, el formulario debe mostrar seleccionado inicialmente `GREEN BAY PACKERS` para los nueve participantes; esta preferencia predeterminada no es una obligación y **cualquiera puede cambiarla** por el rival antes de enviar la quiniela. El sistema debe respetar la elección finalmente enviada y nunca reemplazar por GB un pick contrario ya registrado o bloqueado. Para el resto de partidos, sin preselección automática. La elección inicial no sustituye la obligación de completar y enviar una quiniela válida.
- Correcciones documentadas por error técnico de formulario/mapeo requieren validación del propietario; no autorizan cambios tácticos de picks.

## 3 · Integridad y publicación

- Nunca modificar `capture.locked_submissions` ni `weeks/week-05.json:locked_picks` para corregir resultados o standings.
- Week 5: **9/9 participantes · 135/135 picks** preservados; empates y rankings rederivados del mismo cierre de captura.
- `public_picks_authorized=false` heredado no autoriza repetir publicaciones confirmadas ni activa publicación automática.
- Week 6 sólo puede abrir captura cuando existan dataset validado, Jotform único con nueve participantes y 14 Game IDs, default editable GB verificado, y enlace estable funcionando; no alterar resultados W5.
- **AUTO_PUBLISH=NO.** Los cambios de puntuación y assets deben tener readback y no generan por sí solos publicaciones en redes.

**Implementación:** `scripts/quiniela_scoring.py`, `scripts/sync-quiniela-live.py`, regresiones `scripts/test_quiniela_scoring.py`, datasets `quiniela-control/data.json` y `quiniela-control/weeks/week-05.json`.

**Trazabilidad:** [Issue 33](https://github.com/packersmexico/packersmexico.github.io/issues/33). No insertar capturas privadas de WhatsApp en el repositorio público.

## 4 · Alertas push obligatorias para Rodrigo e Ibra

**Dirección · decisión vigente 12/oct/2026:** RODRIGO no dispone de acceso a Jotform. **RODRIGO e IBRA deben recibir, cada uno en su dispositivo, los mismos eventos operativos relevantes mediante Web Push** desde el panel de Quiniela. Suscripciones independientes y claves por persona/evento. Tener el formulario en Jotform NO es condición para consultar los avisos.

| Hito | Condición canónica | Mensaje / siguiente acción |
|---|---|---|
| Formulario WN abierto | Nuevo `capture-config.json` con semana, formulario único verificable y `status: OPEN` | WN ABIERTA, 0/9, fecha de cierre y URL estable `/quiniela-control/captura/` |
| Nuevo participante | **Primer envío válido** del roster, con ID único de Jotform y 14 respuestas G01–G14 (W6). Nunca emitir por duplicado o mero cambio de picks. | Nombre y avance de participantes, no revelar los picks; acceso a panel, no a Jotform |
| Semana finalizada | Resultados oficiales de **todos los partidos decididos después del MNF**, incluidos empates PUSH con ganador nulo; `results.final = results.total` y `status: FINAL` | Cierre de la Week y tabla de resultados actualizada. **No esperar imágenes** |
| Archivo disponible para descargar / preparar publicación | PNG real válido, index `assets[slot].state: READY`, evidencia de QA Figma y PASS de Dirección | Identificar slot PICKS, RESULTADOS, RANKING SEMANAL o TEMPORADA, enlazar panel de descargas. **READY ≠ publicado** |
| Publicación confirmada | Registro explícito de 05 en `figma-week-NN.json:asset_approvals[slot].distribution` = `PUBLISHED_USER_CONFIRMED` o `PUBLISHED_VERIFIED`, con `figma_qa:PASS`, `direction_review:PASS`, `export_verified:true` y evidencia no vacía; archivo READY | Aviso distinto de publicación efectivamente realizada, sin repetir posts |

- EventKeys estables e idempotencia Redis por **RODRIGO** y **IBRA**. No repetir mensajes ya consumidos al recalcular resultados o regenerar un asset index.
- El backend de milestones hace lectura de `data.json`, `capture-config.json` y `asset-index.json` en producción. Puede coexistir WN como captura OPEN con WN−1 aún en resultados MNF.
- Alertas de cada participante: integración Jotform **Webhooks** de nuevo formulario → backend Vercel, y respaldo GitHub `quiniela-participant-push.yml` cuando las capturas válidas ya se hayan conciliado. **Debe verificarse el webhook de cada Week nueva.**
- RODRIGO no necesita acceso a Jotform; IBRA, como operador con acceso, configura el webhook seguro. Nunca exponer `PMX_JOTFORM_WEBHOOK_TOKEN`, secretos de Push ni picks personales en GitHub Pages o notificaciones.
- **NO** envío automático de publicaciones sociales. `AUTO_PUBLISH=NO`. La preparación de imágenes y las alertas no sustituyen el gate 00 → 05.
