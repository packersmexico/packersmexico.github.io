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
