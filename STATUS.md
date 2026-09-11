# STATUS.md

## PROJECT

Project: `PMX DIGITAL HUB`

Partnership ID: `PMX-PART-2026-WINGSTOP-COND-001`

Repository: `packersmexico/packersmexico.github.io`

Public Hub: `https://packersmexico.github.io/`

Season Calendar route: `https://packersmexico.github.io/calendario/`

## CURRENT PHASE

`FASE 2C · HUB EXPANSION · SEASON CALENDAR 2026`

## STATUS

`CORE HUB PATCH DEPLOYED · GA4 PASS · CALENDAR 2026 IMPLEMENTED · PUBLIC GOOGLE CALENDAR COMPLETE · SOCIAL 5/5 · SPECIAL THEMES/UNIFORMS MAPPED · 03.5 PROVENANCE PASS / MATERIALIZATION + FAMILY AUTHORIZATION HOLD · CALENDAR PUBLIC BROWSER QA PENDING · FIGMA CALENDAR FAMILY HOLD · EXTERNAL FORM DEPENDENCY · PODCAST W01 HUB DESTINATION DEPLOYED / TRACKING QA HOLD`

## CORE HUB · WEEK 1

- Game ID: `PMX-WS-2026-W01`
- Matchup: `PACKERS @ VIKINGS`
- Weekly label: `WEEK 1 · SEASON OPENER`
- Date: `DOM 13 SEP 2026`
- Community arrival: `14:00 CDMX`
- Kickoff: `14:25 CDMX`
- Venue: `Wingstop Condesa · CDMX`
- Public wording LOCKED: `Casa Oficial de Packers en CDMX`
- Registration: `https://share.forms.app/form/6a96032ee64cd5f15d1688aa`
- Promo: `OFF`
- Special: `OFF`

Latest Hub UI patch:
- removed `AT`; away matchup now uses `@`
- home matchup remains `VS`
- Week/game-label language aligned with Calendar style (`WEEK 1 · SEASON OPENER`, future `HOME OPENER`, themes, etc.)
- removed redundant `REDES` navigation because social destinations already live in footer
- removed Wingstop partner logo/footer block
- venue relationship remains in hero only
- retained `CONFIRMA TU ASISTENCIA` + `CÓMO LLEGAR`
- retained `CALENDARIO 2026` + `GOPACKGO MX`
- social footer remains 5/5: Instagram, X, Facebook, TikTok, YouTube

Prior core Hub browser QA:
- `390×844 = PASS`
- `1440×900 = PASS`

Because the Hub UI was patched after those captures, a short visual recheck is required before treating the new layout as final browser PASS.

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
- Instagram
- X
- Facebook
- TikTok
- YouTube

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

Every game event:
- uses `America/Mexico_City`
- points to PMX Hub with tracked URL
- points to full Season Calendar with tracked URL
- is public and transparent/non-blocking
- carries special theme/uniform metadata when confirmed
- includes independent-brand disclaimer

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

### Opponent logos

- `14/14 SOURCE PASS`
- unique rivals covered: MIN, NYJ, ATL, TB, CHI, DAL, DET, CAR, NE, LA, NO, BUF, MIA, HOU
- official NFL club-logo endpoints identified/validated
- `0/14 MATERIALIZED BY 03.5 RUNTIME`
- restriction: no redraw, recolor, distortion, pseudo-logo or improvised vectorization

### W5 · Packers Rivalries

Provenance PASS:
- `GB-RIV-2026-FULL-01`
- `GB-RIV-2026-HELMET-01`
- `GB-RIV-2026-JERSEY-01`

No isolated pants asset validated. Do not fabricate cutout.

### W14 · 1923 Classic

Provenance PASS:
- `GB-1923-2026-FULL-01`
- `GB-1923-2026-DETAIL-01`

No isolated pants asset validated. No AI/reconstruction of leather-look helmet.

### W16 · Bears Rivalries

Provenance PASS:
- `CHI-RIV-2026-FULL-01`
- `CHI-RIV-2026-HELMET-01`
- `CHI-RIV-2026-JERSEY-01`
- `CHI-RIV-2026-PANTS-01`

LOCK:
`BEARS RIVALRIES CONFIRMED FOR CHICAGO · DO NOT INFER PACKERS RIVALRIES W16`

### Themes

- Alumni Weekend → `TEXT ONLY / WAIT`
- Packers Vs. Cancer → 2025 asset only = `REFERENCE ONLY · DO NOT USE AS 2026 MASTER`
- Bob Harlan → contextual official photo source PASS; not W8 event-photo proof
- Salute to Service → provenance PASS
- Walter Payton MOY → provenance PASS; sponsor cannot be removed/rebuilt
- Inspire Change → provenance PASS
- NFL Play 60 → provenance PASS
- Fan Appreciation → `TEXT ONLY / WAIT`

### Authorization gate

Specific family authorization is not recorded as closed:
`⚪ NO SOLICITADA · USO EDITORIAL PROVISIONAL`

Therefore:
- provenance/context may be used for planning and text metadata
- visual assets are NOT released as final public production package yet
- 04 must not treat these URLs as final authorized/materalized assets
- family must be escalated to `00 · Dirección y Gobernanza` for explicit authorization decision

This follows the current workflow: 03.5 validates source/context/rights state; Dirección governs permissions/masters; 04 does not re-investigate or improvise assets.

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

Web Stream:
- Name: `PMX Digital Hub`
- URL: `https://packersmexico.github.io`
- Data collection: `ACTIVE`

Custom dimensions:
`8/8 · EVENT SCOPE`

Formal QA cutoff:
`2026-09-05T11:55:39-06:00`

Events preserved:
`HUB_VIEW · CLICK_REGISTRO · CLICK_MAPS · CLICK_PROMO · CLICK_CALENDAR · CLICK_GOPACKGO · CLICK_SOCIAL · QR_OPEN`

Integrity:
`CLICK_REGISTRO ≠ REGISTRO_CONFIRMADO ≠ ASISTENCIA_MEDIDA`

## PODCAST W01 · HUB TRACKING

PMX_ID:
`PODCAST-W01 · GoPackGoMX #167`

Direction state:
`00 · TRACKING BUILD AUTHORIZED`

Campaign:
`podcast_2026_w01`

Destination:
`https://youtu.be/BZBuRy3LHUY`

Hub implementation:
- `js/config.js` GoPackGo destination updated from generic channel to Episode #167
- commit: `8aca5d5831f9f245e1608ed7244f53f5529a9268`
- public Hub QA URL returned HTTPS `200`
- public `js/config.js` returned HTTPS `200` after deployment
- destination resolves HTTPS `200` to YouTube watch URL for video ID `BZBuRy3LHUY`
- `HUB_TRACKING_MAP` event destination for `CLICK_GOPACKGO` updated to Episode #167

Locked production entry URLs:
- X / `PODCAST_W01_X_EPISODE` → `https://packersmexico.github.io/?utm_source=x&utm_medium=social&utm_campaign=podcast_2026_w01&utm_content=episode_167`
- Facebook / `PODCAST_W01_FACEBOOK_EPISODE` → `https://packersmexico.github.io/?utm_source=facebook&utm_medium=social&utm_campaign=podcast_2026_w01&utm_content=episode_167`
- Instagram Story / `PODCAST_W01_IG_STORY_EPISODE` → `https://packersmexico.github.io/?utm_source=instagram&utm_medium=story&utm_campaign=podcast_2026_w01&utm_content=episode_167`
- Instagram Feed → `TRACK_ID N/A · FINAL HUB URL N/A · dependency PODCAST_W01_IG_STORY_EPISODE`

QA evidence:
- temporary QA navigation used the X UTM URL plus technical `pmx_test=1`; production URL remains unchanged
- GA4 Realtime observed fresh `HUB_VIEW = 1` after QA navigation
- no fresh synthetic/browser click was executed, therefore `CLICK_GOPACKGO` event verification for this build remains HOLD

Analytics blocker:
`HOLD · TRAFFIC_CLASS TAXONOMY CONFLICT`

Conflict:
- current Direction handoff for Podcast W01 requests `traffic_class = qa` during tests and `production` at release
- current Hub implementation emits `TEST_SETUP` when `pmx_test=1` and `PRODUCTION` otherwise
- current GA4 custom dimension description is `Traffic Class · TEST_SETUP / PRODUCTION`
- existing analytics control sheet also contains a previously locked traffic-class convention that is not identical to the new Podcast W01 wording

Per repository STOP CONDITION, do not silently rewrite analytics semantics. Direction/Analytics must reconcile the traffic-class vocabulary before H01 can claim full Podcast W01 tracking PASS.

Current Podcast W01 technical state:
`PARTIAL PASS · DESTINATION DEPLOYED · FINAL URL BUILD READY · HUB_VIEW VERIFIED · CLICK_GOPACKGO QA + TRAFFIC_CLASS HOLD · READY_FOR_CLICK FALSE`

## EXTERNAL FORMS.APP DEPENDENCY

State:
`EXTERNAL DEPENDENCY · NO PMX EDIT ACCESS`

Known conflicts:
- broader official-sounding wording
- 14:00 without clear 14:25 kickoff distinction
- reservation-like wording

PMX-controlled surfaces remain locked to:
`Casa Oficial de Packers en CDMX`

PMX CTA remains:
`CONFIRMA TU ASISTENCIA`

## NEXT ACTION

1. `Resolve Podcast W01 traffic_class taxonomy conflict in 00/Analytics; then execute fresh CLICK_GOPACKGO QA and close H01 return.`
2. `Public-browser recheck of patched core Hub at mobile + desktop.`
3. `Public-browser QA of /calendario/ at 390×844 and 1440×900.`
4. `Escalate PMX · SEASON CALENDAR 2026 · VISUAL FAMILY V1.0 to 00 for explicit asset-family authorization.`
5. `After authorization + materialization, hand exact 03.5 assets to 04/Figma; no substitutions.`
6. `Verify calendar HUB_VIEW + CLICK_CALENDAR + CLICK_SOCIAL in GA4 with QA traffic classified separately.`
7. `Monitor NFL/Packers flex changes and update source + Google Calendar.`

## LAST RELEVANT CHANGE

`Podcast W01: GoPackGo Hub destination now points to Episode #167 and the event-level HUB_TRACKING_MAP destination is aligned. Three locked production UTM URLs were materialized and public HTTPS + HUB_VIEW QA passed. Full H01 PASS is blocked by traffic_class taxonomy conflict and a fresh CLICK_GOPACKGO click-event verification.`
