# PMX Quiniela · MNF automation gate (W07–W18)

## Objective
Use the existing Orchestrator and current GitHub/Vercel/Jotform/Figma infrastructure. No second scheduler or Orchestrator. Budget $0. AUTO_PUBLISH=NO for social networks.

## Observed production blockers (2026-10-26)
- Live-score workflow executes `scripts/sync-quiniela-live.py`, which loads only `quiniela-control/data.json`; it still identifies W06 (14/14 FINAL). W07 exists separately and is CLOSED with 9/9 and 126/126 FIRST_VALID. Do not overwrite W06.
- W07 has only the PICKS PNG marked READY; RESULTS/WEEKLY/SEASON are WAITING_EVENT.
- The public scoring/handoff scripts use `capture.locked_submissions`, but the sanitized public W06 snapshot has zero such records. Canonical selections must remain in private Redis and be read via an authenticated, least-privilege bridge.
- `quiniela-control/production/week-07-figma-handoff.json` and results workfile are absent; W07 Figma frames exist. The Figma export manifest is still W05 and points at temporary asset URLs.
- The production Jotform W07 capture was reconciled by redeploy after webhook HTTP 401. That is not unattended intake.
- Weekly capture contracts exist for W06/W07 only. New weeks must derive from verified NFL schedule and correct GB locked game, not guessed fixed 14-game slates.
- `quiniela-progressive-editorial.yml` generates DATA-ONLY files, not artwork; `quiniela-asset-index.yml` only indexes already-rendered approved PNG. Existing W04 renderer is a parity test, not a certified W07–W18 renderer.

## Required staged implementation (all fail closed)
1. **Season/score resolver**: dynamically select the active scoring week from immutable weekly records and verified kickoff dates; poll live ESPN; require all games FINAL/TIE, stable double-read and complete slate. Never mutate previous weeks.
2. **Private scoring bridge**: use existing authenticated Redis FIRST_VALID records and approved scoring overlays; validate nine participant records, all game IDs, original evidence and season base. Emit only sanitized standings/results; no picks or submission IDs in public repo.
3. **Figma production**: bind sanitized results/standings to four existing master components; for picks, obtain the private matrix only inside the authorized production boundary. Export real PNG; test parity with Figma masters, footer totals, mobile readability and per-slot QA. No fabricated screenshots or blanket PASS.
4. **Panel & push**: publish assets to panel only after explicit distribution/rights approval, real PNG validation, HEAD/download and idempotent event. Preserve AUTO_PUBLISH=NO; never equate push provider SENT with device receipt.
5. **Week rollover**: generate W08–W18 contracts and real Jotform forms only from verified NFL schedule, roster, deadline and GB rule; switch current capture atomically while preserving old immutable first-valid evidence. Resolve Jotform webhook HTTP 401 with an authenticated test.
6. **E2E certification**: run synthetic fixtures only outside production; test no-final, tie/PUSH, duplicate, overlay, absent participant, stale schedule, webhook 401, race/retry, broken image, and withheld approval. Record real run IDs and file hashes.

## Initial acceptance
Week 7 must transition from 0/14 FINAL to 14/14 only on actual official final results after MNF; produce three physically verified images and rankings; notify Rodrigo/Ibra exactly once for each approved milestone. Do not prematurely close or invent Week 7 results.

## Existing references
- Issue #42: quiniela-control
- Issue #43: Figma/production
- Figma file RAoegEENwTH2L7gb3yydIq; W07 results 3510:728349, weekly 3510:733838, season 3510:737983
