# STATUS.md

## PROJECT

Project: `PMX DIGITAL HUB`

Partnership ID: `PMX-PART-2026-WINGSTOP-COND-001`

Repository: `packersmexico/packersmexico.github.io`

Public Hub: `https://packersmexico.github.io/`

Season Calendar route: `https://packersmexico.github.io/calendario/`

## WEEK 3 ORCHESTRATOR · 2026-09-21

State:
`IN PROGRESS · TECHNICAL AUTOMATION ACTIVE ON REVIEW BRANCH · WEEKLY MANIFEST QA PASS · NO PUBLIC DEPLOYMENT CLAIMED`

Branch:
`automation/week-03-orchestrator`

PMX_ID:
`PMX-W3-AUTOMATION-001`

Implemented on branch:
- canonical browser-readable weekly manifest at `js/weekly-manifest.js`
- Week 2 snapshot at `quiniela-control/weeks/week-02.json` with `15/16 FINAL` and final-game hold
- Week 3 snapshot at `quiniela-control/weeks/week-03.json` with verified 16-game slate
- separate Week 3 Jotform draft created; Week 2 form preserved
- Week 3 capture config staged at `quiniela-control/capture-config-w03.json`
- GitHub Actions validator added for weekly manifest invariants and publication firewall\n- Weekly Manifest QA run #1: `PASS`\n- Week 3 Jotform build: `COMPLETE · 0 submissions · NO COMPARTIR AÚN`
- Quiniela production config reconciled to current certified Figma F05 master
- Figma Week 3 production-control clone created at node `2770:466376`

Current publication firewall:
`05 HOLD · READY FOR CLICK REQUIRED`

Current public Quiniela:
`WEEK 2 · /quiniela/w02/`

Week 3 capture:
`DRAFT_HOLD_CUTOFF_CONFIRMATION · NO COMPARTIR AÚN`

Week 2 results:
`15/16 FINAL · WAITING NYG @ LAR · NO PUBLICAR RESULTADOS FINALES`

Wingstop Week 3:
`ATL @ GB · JUE 24 SEP · 18:15 CDMX · INPUT READY · 05 HOLD`

Open blocker:
`W3 PICK CUTOFF NOT YET LOCKED`

Safe work that can continue:
`CI validation · W2 result closeout after final game · Figma production candidates · Hub remains on existing public state until 05 gate`

## CURRENT PHASE

`FASE 2C · HUB EXPANSION · WEEKLY AUTO-ROLLOVER + SEASON CALENDAR 2026`

## STATUS

`CORE HUB WEEKLY AUTO-ROLLOVER DEPLOYED + PUBLIC BROWSER QA PASS · GA4 ACTIVE · CALENDAR 2026 IMPLEMENTED · PUBLIC GOOGLE CALENDAR COMPLETE · SOCIAL 5/5 · SPECIAL THEMES/UNIFORMS MAPPED · 03.5 PROVENANCE PASS / MATERIALIZATION + FAMILY AUTHORIZATION HOLD · FIGMA CALENDAR FAMILY HOLD · EXTERNAL FORM DEPENDENCY · PODCAST W01 TRACKING QA HOLD`

## CORE HUB · CURRENT LIVE STATE

Current game resolved automatically from the season schedule using `America/Mexico_City` date.

Public browser QA on 2026-09-14:
- `WEEK 2`
- `PACKERS @ JETS`
- `DOM 20 SEP · 11:00 CDMX`
- `WINGSTOP CONDESA · CDMX`
- `Casa Oficial de Packers en CDMX`
- `CONFIRMA TU ASISTENCIA` visible
- `CÓMO LLEGAR` visible
- no `VIKINGS` residue in the rendered Hub
- no visible load/console error detected by browser QA

Current resolved game ID:
`PMX-WS-2026-W02`

Current opponent:
`New York Jets`

Current kickoff:
`DOM 20 SEP 2026 · 11:00 CDMX`

Venue:
`Wingstop Condesa · CDMX`

Public wording LOCKED:
`Casa Oficial de Packers en CDMX`

Registration:
`https://share.forms.app/form/6a96032ee64cd5f15d1688aa`

Promo:
`OFF`

Special:
`OFF`

## WEEKLY AUTO-ROLLOVER

State:
`DEPLOYED · PUBLIC BROWSER QA PASS`

Implementation:
- root Hub now loads the existing season schedule from `calendario/config.js` before `js/config.js`
- `js/config.js` resolves the first game whose `dateISO >= current CDMX date`
- after a game date passes, the visible Hub advances automatically to the next dated game
- if no dated future game remains, the first undated game (Week 18 TBD) is used as fallback
- analytics `id_juego` now inherits the automatically resolved weekly game ID before `analytics.js` initializes
- no page-layout rebuild is required for ordinary weekly rollover

Current Hub implementation version:
`p0-weekly-auto-v1`

Important limit:
The weekly rollover is automatic, but factual NFL flex changes still require source/recency maintenance in the season schedule. Automation must not invent updated dates/times.

## WEEK 1 HUB CLOSEOUT

Week 1 Hub game:
`PMX-WS-2026-W01 · PACKERS @ VIKINGS`

Historical Week 1 visible configuration has rolled forward automatically and is no longer the current hero state.

Week 1 tracking/history remains meaningful through historical campaign URLs and State Board records; the visible Hub no longer needs a manual weekly opponent edit.

## SEASON CALENDAR 2026 EXTENSION

Implementation state:
`SOURCE IMPLEMENTED · PUBLIC BROWSER QA PENDING`

Route:
`/calendario/`

Source of truth:
`Green Bay Packers · Packers announce 2026 schedule`

Official-source facts represented:
- `17` regular-season games
- `9` home
- `8` road
- `6` primetime, subject to flex scheduling
- `Week 11 = BYE`
- `Week 18 vs Detroit = Saturday Jan 9 or Sunday Jan 10, 2027 · day/time/network TBD after Week 17`
- displayed kickoff times converted to `America/Mexico_City / CDMX`

Calendar capabilities:
- next-game detection using CDMX date
- full Week 1–18 list
- `TODOS / CASA / VISITA / PRIMETIME` filters
- mobile-first responsive layout
- share control
- public Google Calendar CTA
- return-to-Hub CTA
- canonical / OG / X metadata
- sitemap / robots
- independent-brand disclaimer

Social footer:
`PASS · 5/5 DESTINATIONS`

Social click tracking:
`CLICK_SOCIAL · PRESERVED TAXONOMY`

## SPECIAL THEMES / UNIFORM METADATA

Mapped in calendar source:
- W3 · Alumni Weekend / Home Opener
- W5 · NFL Rivalries · Packers Rivalries uniform CONFIRMED
- W6 · Packers Vs. Cancer
- W8 · Bob Harlan Tribute
- W10 · Salute to Service
- W12 · Thanksgiving Eve
- W14 · 1923 Classic + Walter Payton Man of the Year · Packers 1923 Classic uniform CONFIRMED
- W15 · Inspire Change
- W16 · Christmas Day · Bears Rivalries uniform CONFIRMED; no Packers special uniform inferred
- W17 · NFL Play 60
- W18 · Fan Appreciation · day/time TBD

## PUBLIC GOOGLE CALENDAR

Calendar:
`PACKERS MÉXICO · Game Days 2026–27`

Calendar ID:
`e3c36567e14e670e73ac31b8e324075e9cc858f916b114d8dfd58d0245424692@group.calendar.google.com`

State:
`PASS · COMPLETE SEASON AGENDA CREATED`

Coverage:
- Week 1 retained
- Weeks 2–10 created
- Week 11 BYE marker created
- Weeks 12–17 created
- Week 18 created as Jan 9–10 TBD window marker

Tracking convention:
- `utm_source=google_calendar`
- `utm_medium=calendar_event`
- `utm_campaign=pmx_2026_schedule`
- `utm_content=w##_rival`

## CALENDAR ANALYTICS

Existing taxonomy preserved. No new event name introduced.

Calendar page:
- `gameId = PMX-SEASON-2026`
- `hubVersion = calendar-v1`
- Measurement ID: `G-QEN5F5YY14`

Existing event usage:
- page load → `HUB_VIEW`
- Google Calendar CTA → `CLICK_CALENDAR`
- footer social clicks → `CLICK_SOCIAL`

Share URL:
- `utm_source=calendar`
- `utm_medium=share`
- `utm_campaign=pmx_2026_schedule`
- `utm_content=season_calendar`

No `REGISTRO_CONFIRMADO` event is fired.

## 03.5 · SEASON CALENDAR ASSET QA RETURN

Family:
`PMX · SEASON CALENDAR 2026 · VISUAL FAMILY V1.0`

03.5 state:
`HOLD PARCIAL · PROVENANCE PASS / MATERIALIZATION + AUTHORIZATION PENDING`

Opponent logos:
- `14/14 SOURCE PASS`
- `0/14 MATERIALIZED BY 03.5 RUNTIME`
- no redraw, recolor, distortion, pseudo-logo or improvised vectorization

Theme/uniform asset notes remain governed by the 03.5 return. Specific family authorization is not recorded as closed:
`⚪ NO SOLICITADA · USO EDITORIAL PROVISIONAL`

Therefore visual assets are not released as a final public production package yet.

## FIGMA · SEASON CALENDAR VISUAL FAMILY

Planned family:
`PMX · SEASON CALENDAR 2026 · VISUAL FAMILY V1.0`

Scope:
- Feed `1080×1350`
- Story `1080×1920`
- CTA to Season Calendar route

Design-system discovery completed:
- Brand Book V5.1 library available
- PMX Horizontal V1.1 component resolved
- Field Dark / Lambeau Green / Cheese Gold / Cream variables resolved
- Bebas Neue + Montserrat PMX styles resolved

Write state:
`HOLD · FIGMA MCP NETWORK CONNECTION FAILED`

No Figma canvas PASS is claimed.

## IDENTITY / ASSETS

PMX Horizontal V1.1:
`PASS · AUTHORITATIVE SVG COMMITTED AND ACTIVE`

Repository path:
`assets/PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg`

Wingstop logo:
`REPOSITORY ASSET RETAINED · NO LONGER DISPLAYED IN CORE HUB FOOTER`

Opponent identities:
`PROVENANCE PASS · MATERIALIZATION + FAMILY AUTHORIZATION HOLD · NOT YET USED VISUALLY`

## ANALYTICS CORE

GA4:
`ACTIVE · LIVE CORE QA PASS · CUSTOM DIMENSIONS PASS · STREAM METADATA PASS`

Measurement ID:
`G-QEN5F5YY14`

Custom dimensions:
`8/8 · EVENT SCOPE`

Events preserved:
`HUB_VIEW · CLICK_REGISTRO · CLICK_MAPS · CLICK_PROMO · CLICK_CALENDAR · CLICK_GOPACKGO · CLICK_SOCIAL · QR_OPEN`

Integrity:
`CLICK_REGISTRO ≠ REGISTRO_CONFIRMADO ≠ ASISTENCIA_MEDIDA`

Weekly auto-rollover consequence:
`id_juego` now resolves from the current season game before analytics initialization.

## PODCAST W01 · HUB TRACKING

PMX_ID:
`PODCAST-W01 · GoPackGoMX #167`

Destination:
`https://youtu.be/BZBuRy3LHUY`

Current technical state:
`PARTIAL PASS · DESTINATION DEPLOYED · FINAL URL BUILD READY · HUB_VIEW VERIFIED · CLICK_GOPACKGO QA + TRAFFIC_CLASS HOLD · READY_FOR_CLICK FALSE`

Analytics blocker:
`HOLD · TRAFFIC_CLASS TAXONOMY CONFLICT`

Conflict remains:
- current Hub emits `TEST_SETUP` when `pmx_test=1` and `PRODUCTION` otherwise
- another handoff requested `qa` / `production`
- current GA4 custom-dimension description uses `TEST_SETUP / PRODUCTION`

Do not silently rewrite analytics semantics; Direction/Analytics must reconcile vocabulary first.

## EXTERNAL FORMS.APP DEPENDENCY

State:
`EXTERNAL DEPENDENCY · NO PMX EDIT ACCESS`

Known conflicts:
- broader official-sounding wording
- 14:00 without clear 14:25 kickoff distinction in historical Week 1 material
- reservation-like wording

PMX-controlled surfaces remain locked to:
`Casa Oficial de Packers en CDMX`

PMX CTA remains:
`CONFIRMA TU ASISTENCIA`

## DEPLOYMENT QA · 2026-09-14

Commits:
- `cbfcc39bfdb5423fbc79f51604094664a6963726` · load season schedule before Hub config
- `8512f0b4ebe5c39dd0d9ca490b5d28bfc78be83b` · derive weekly Hub game from season calendar

Public live-browser verification:
`PASS`

Verified rendered hero:
`WEEK 2 · PACKERS @ JETS · DOM 20 SEP · 11:00 CDMX · WINGSTOP CONDESA · CDMX`

Verified:
- primary CTA present
- Maps CTA present
- no Week 1/Vikings residue in hero
- no visible load/console error detected

## NEXT ACTION

1. `Open PMX-WS-2026-W02 in State Board with Tuesday ASSET CHECK and PMX fallback if Wingstop does not deliver images.`
2. `Rebuild clean Week 2 operational chats from Sources + State Board; do not migrate obsolete conversation history as authority.`
3. `Create WEEK 2 CONTROL BOARD / 20 publication slots and reserve the Wingstop partnership cadence inside those 20.`
4. `Resolve Podcast W01 traffic_class taxonomy conflict in 00/Analytics; then execute fresh CLICK_GOPACKGO QA.`
5. `Complete public-browser QA of /calendario/ at mobile + desktop.`
6. `Escalate PMX · SEASON CALENDAR 2026 · VISUAL FAMILY V1.0 for explicit asset-family authorization.`
7. `Monitor NFL/Packers flex changes and update the season schedule source when materially required.`

## LAST RELEVANT CHANGE

`2026-09-14 · Core Hub weekly rollover is now systemized. The root Hub consumes the existing 2026 season schedule and automatically advances the visible matchup by CDMX date. Public browser QA confirmed Week 2 Packers @ Jets at 11:00 CDMX and no Vikings residue. Ordinary weekly opponent/date/time rollover no longer requires a manual Hub edit; factual flex changes remain a recency-controlled maintenance task.`
