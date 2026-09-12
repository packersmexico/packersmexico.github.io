# PMX VIDEO FACTORY V0.1

## Purpose
A reproducible video renderer for PACKERS MÉXICO that can be triggered from a phone without Codex/Work in the critical path.

Canonical editorial governance remains unchanged:

`00 → 01 → 02 → 03 → 03.5 → 04 → 05`

The Video Factory is a technical production engine under 04. It does not validate facts, rewrite locked copy, approve assets, declare READY_FOR_CLICK, or publish.

## V0.1 families
- ANALYSIS
- BREAKING
- MATCHUP

## Outputs
- HERO
- TEASER
- HOOK
- STORY

## Control plane
GitHub Actions `workflow_dispatch` is the mobile P0. It intentionally avoids a custom backend and requires no Codex session.

## Media boundary
The repository stores code, schemas and safe samples only. Unpublished media should not be committed. Media may be supplied by URL only after the asset has passed the applicable 03.5 gate.

## Figma authority
Figma remains the visual master. Code implements approved family rules; it does not redefine the design system.

## Publication boundary
A successful render is a Production Candidate only. 04 must perform visual QA and return to 05. It is never an automatic publication authorization.
