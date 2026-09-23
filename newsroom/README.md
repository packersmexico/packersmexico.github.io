# PACKERS MÉXICO · NEWSROOM ORCHESTRATOR · V1

Status: `SHADOW · NO PUBLICATION AUTHORITY`

This directory defines the technical orchestration layer around the canonical Sistema Lambeau editorial workflow.

Canonical workflow:
`00 → 01 → 02 → 03 → 03.5 → 04 → 05`

Auxiliary radars:
`R01 / R02 → 00 → 01` only when Dirección admits the topic.

## Purpose

The orchestrator does not replace any editorial stage. It standardizes case state, manual intake, controller routing, Hub route requirements, publication-platform state, and postpublication evidence.

## Core rules

- One persistent `PMX_ID` per case.
- Each case has one current stage and auditable stage history.
- Publication is blocked until 05 records `READY_FOR_CLICK`.
- Platform publication state is tracked independently.
- Manual requests can enter through `MANUAL_INTAKE` and still retain traceability.
- Hub/CTA routes are declared as requirements before publication and verified before click.
- GitHub production code remains separate from Ibrahim's academic/personal analytics repositories.
- `PMX-ANA-*` is reserved for future Sports Analytics Lab integration only.
- No Python, SQL, model, notebook, or sports-analytics pipeline is introduced by V1.

## Controllers

V1 reserves four controller roles:

- `SIGNAL_CONTROLLER`: R01/R02 detection and deduplication.
- `QUINIELA_CONTROLLER`: season/capture/results state.
- `WEEK_CONTROLLER`: calendar, recurring weekly requirements, partnership/Hub route preparation.
- `DATA_CONTROLLER`: publication evidence and analytics handoff.

Recurring controllers do not bypass 00–05.

## Manual intake

A manual request such as “hazme un hilo con esto” may be opened as a case with `intake.mode=MANUAL`.

Text-only output can finish as `READY_TO_COPY`.
Visual/video output continues through the required production and publication gates.

## Hub routes

When a case has a CTA, 03 declares a route requirement. The technical route layer creates/maintains the short path and 05 verifies the live destination before publication.

Example Week 3 routes:
- `/go/w03-x/`
- `/go/w03-ig/`
- `/go/w03-fb/`
- `/go/w03-tt/`
- `/go/w03-wa/`

The route is infrastructure. It does not itself authorize publication.

## State persistence

Controllers must update one file per case under `newsroom/cases/<PMX_ID>.json`.

`newsroom/state-board.json` is a generated index. It is not the write target for concurrent controllers.

Rebuild locally/CI with:

`node scripts/build-state-board.mjs --write`

Validate without mutation with:

`node scripts/build-state-board.mjs`

This separation reduces write collisions between Signal, Quiniela, Week and Data controllers.

## Evidence rule

A platform may be `USER_CONFIRMED` while its URL/ID has not yet been captured, but global `POSTPUBLICATION QA PASS` requires verifiable platform evidence. This preserves the 05 rule that PUBLICADO/PASS cannot be claimed without real confirmation.

## Chat shells

`newsroom/chat-contracts.md` contains the operational shell contract for 00, 01, 02, 03, 03.5, 04 and 05. The actual Project chats still need to be created in the ChatGPT UI when Direction authorizes that migration.
