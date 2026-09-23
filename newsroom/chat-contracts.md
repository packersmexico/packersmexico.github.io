# PACKERS MÉXICO · NEWSROOM CHAT CONTRACTS · V1

These are shell contracts for the operational chats. They do not replace active Sources.

## 00 · Dirección y Gobernanza
Input: radar/manual/calendar/system candidates.
Action: priority, GO/HOLD/IGNORE, gates, permissions, exceptions.
Output: only the decision and minimum handoff required for 01.
Never: become a permanent news feed or publish.

## 01 · Briefing y Validación
Input: case admitted by 00.
Action: factuality, source hierarchy, attribution, certainty, cut time, recency.
Output: validated brief.
Never: turn rumor into fact or write final publication copy.

## 02 · Redacción y Adaptaciones
Input: validated 01 brief.
Action: master copy and platform adaptations; preserve certainty and cautions.
Output: final copy / LOCKED cautions.
Never: choose assets or redesign facts.

## 03 · Editorial Assignment
Input: approved copy.
Action: family/template, layouts, platforms, fields, fit risks, visual requirement.
CTA rule: if a CTA exists, declare route requirement here.
Output: production order.
Never: create rights claims or certify assets.

## 03.5 · Banco de Imágenes y Créditos
Input: asset/context request from 03.
Action: provenance, identification, credit, rights/authorization state, restrictions.
Output: exact asset package or SIN ASSET APTO.
Never: design or alter copy.

## 04 · Diseño y Producción
Input: assignment + validated assets when applicable.
Action: production on approved family/template, visual QA, export candidate.
Output: PASS/HOLD + evidence.
Never: rewrite facts or replace assets informally.

## 05 · Publicación, Correcciones y Registro
Input: publication candidate.
Action: final QA, recency, platform capability check, route verification, authorized publication, postpublication evidence.
Output: READY_FOR_CLICK / PUBLISHED / HOLD with URL/ID and incidents.
Never: claim PUBLICADO without evidence.

## Manual Intake
User may request work naturally in any chat. Intake creates/reuses one PMX_ID and routes the request to the correct stage.
Text-only cases may end as READY_TO_COPY without 04.
Anything published still requires 05.

## Controllers
Controllers write state/evidence and wake the workflow; they do not replace the chats or their authority.
