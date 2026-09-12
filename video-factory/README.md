# PACKERS MÉXICO · VIDEO FACTORY V0.1

Status: PILOT.

A phone-triggered, reproducible rendering engine for approved PACKERS MÉXICO video families.

## Governance
This is a technical engine under 04 · Diseño y Producción. It does not replace or modify the canonical editorial workflow:

`00 → 01 → 02 → 03 → 03.5 → 04 → 05`

A successful render is **not** READY_FOR_CLICK and is **not** publication authorization.

## V0.1
Families:
- ANALYSIS
- BREAKING
- MATCHUP

Modes:
- HERO
- TEASER
- HOOK
- STORY

Formats:
- 9:16
- 4:5
- 1:1

## Mobile operation
Use GitHub Actions → `PMX Video Factory · Render` from the Fold 7.

The workflow produces an artifact containing:
- MP4
- thumbnail
- VideoSpec
- technical QA JSON

Then 04 performs perceptual/visual QA and returns to 05.

## Assets
Never commit unpublished media or credentials. Visual assets passed into a render must already satisfy the applicable 03.5 gate.

## Logo
The workflow copies the authoritative repository SVG into the Remotion public directory at runtime. The logo is not recreated.
