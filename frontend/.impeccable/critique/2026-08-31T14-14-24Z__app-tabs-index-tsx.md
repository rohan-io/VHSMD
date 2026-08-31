---
target: VHSMD / Health Connect frontend (worker dashboard anchor)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-31T14-14-24Z
slug: app-tabs-index-tsx
---
# Critique (re-run): VHSMD / Health Connect frontend (anchor: worker dashboard)

Mode: Operate. ANM/ASHA field worker on a cheap Android phone, outdoors, one-handed, intermittent connectivity.
Method: DEGRADED single-context re-score after same-session frontend-design + harden + polish + layout passes (each verified with before/after screenshots). Detector re-run: 19 files, exit 0, clean (weak signal on RN StyleSheet).

## Design Health Score: 30/40 (was 25) — Good

| # | Heuristic | Score | Delta | Key issue now |
|---|-----------|-------|-------|----------------|
| 1 | Visibility of System Status | 3 | 0 | 15s request timeout added; dead/slow server now shows a clear error instead of hanging (verified live). Still no skeletons; header "Online" pill green during a failed load. |
| 2 | Match System / Real World | 3 | 0 | Dashboard copy now task-language; notif timestamps locale-aware. "Alert Engine" still the Alerts tab title. |
| 3 | User Control and Freedom | 3 | +1 | Two-tap confirm on Acknowledge / Mark Administered; empty-state "Clear search & filters"; form failures fall through to offline queue. Still no Cancel on forms; no draft persistence. |
| 4 | Consistency and Standards | 4 | +1 | Shared LoadError across 7 surfaces; icon family reconciled (no glyphs/smileys); banner pattern unified worker+admin; MetricCard internals consistent. Residual: pill casing HIGH RISK vs "4 overdue". |
| 5 | Error Prevention | 3 | +1 | LMP/DOB now native date pickers with enforced min/max + strict calendar validation + inline errors; age/mobile/length constraints; confirm on irreversible clinical actions. Still no Sign-Out confirm; BP/Hb typos unvalidated. |
| 6 | Recognition Rather Than Recall | 3 | 0 | Caseload stats collapsed with a text summary. Header icon-buttons still unlabeled. |
| 7 | Flexibility and Efficiency | 2 | 0 | Untouched. Search fires only on submit; no bulk actions; no alert->record-visit path. |
| 8 | Aesthetic and Minimalist Design | 4 | +1 | Dashboard restructured: leads with alert worklist, one "Needs attention" group (was 3 sections), reference stats collapsed by default, rhythm fixed (24px between blocks / 8px within). Resting scroll ~halved. Tiles read value+label as a unit. |
| 9 | Error Recovery | 3 | +1 | LoadError + Retry everywhere; network errors mapped to human copy; detail screens distinguish network-error from genuine 404. Still: non-date form-validation failures toast-only. |
| 10 | Help and Documentation | 2 | 0 | Untouched. No onboarding, no threshold explanations, no tooltips. |

Cognitive load on the restructured dashboard: 0-1 checklist failures (was 3-4). Single focus, visual hierarchy, progressive disclosure now pass.

## Design Specificity Verdict: purposeful but still visually templated (was: category-interchangeable)

Moved: dashboard IA now shaped for the operator's job (opens on "who needs a visit today"); offline-first premise better honored (timeout + consistent error recovery + offline-queue fallback); irreversible clinical writes guarded; dates can't silently corrupt the schedule.
Didn't move: system font throughout (typeset not run); type still 9-13px, pills 9px tracked caps, trimester tiles hue-only (adapt not run); still teal+slate+rounded cards; no cached-data fallback when offline.
IA fits the task; visual identity still doesn't fit the scene (sunlight, budget phone, gloves).

Deterministic scan: 19 files, 0 findings, exit 0 (low confidence on RN).

## Overall Impression
The 5-point jump is earned: this session closed every correctness/safety-adjacent gap (infinite hang, schedule-corrupting date fields, one-tap irreversible clinical writes, error states that lied as empty states) and fixed the dashboard's structural failure. What remains is enhancement-tier, mapping to adapt (sunlight readability - the one with real user cost), typeset (visual identity), clarify (copy residue).

## What's Working
- Dashboard now passes the squint test: banner -> red alert bars -> red "11" tile -> everything else quiet.
- Error handling is now a system: one LoadError component, one 15s timeout, human copy, 404-vs-network distinction, offline-queue fallback on writes. Verified across 8 surfaces.
- Data entry is safe: native date pickers with range enforcement, strict validation, confirm-before-commit on clinical writes, bad-data guard on "delivered" status.

## Priority Issues
- [P1] Field readability (unchanged) - body 11-13px, pills 9-10px, trimester tiles hue-only. Unreadable on a budget phone in sunlight, the actual use scene. The only remaining issue with concrete user cost. Fix: raise type floor to ~14/16px body / >=12px smallest labels; >=44px touch targets; non-color cue on trimester tiles. Command: /impeccable adapt
- [P2] No typographic identity - system-font-only, no deliberate scale behind the new hierarchy. Fix: restrained two-face pairing via expo-font + real scale. Command: /impeccable typeset
- [P2] Forms lose data on interruption - OS backgrounds the app mid-registration, half-filled form gone on return; no Cancel button either. Fix: persist drafts to storage on change, restore on mount; add explicit Cancel/Discard. Command: /impeccable harden
- [P2] "Online" pill contradicts a failed load - wired to the simulated-offline toggle, not real reachability; stayed green through every dashboard timeout. Fix: drive from actual request outcomes, or remove and let the "Synced Xm ago" chip carry connectivity. Command: /impeccable clarify or /impeccable harden
- [P3] Copy residue - "Alert Engine" tab title; pill casing HIGH RISK vs "4 overdue"; "beneficiaries" govtspeak. Command: /impeccable clarify

## Persona Red Flags
Sam (low vision / outdoor glare): nothing addressed. 11-13px body, 9px tracked-caps risk labels, hue-only trimester tiles, unlabeled header icon-buttons. Still fails.
Casey (distracted mobile): improved - dashboard leads with thumb-reachable priority work, first load times out to a clear error instead of hanging. Still: search-on-submit only; form draft loss on backgrounding; FAB overlaps last card mid-scroll.
Riley (stress tester): largely resolved - "DELIVERED" at 14 weeks now shows real trimester; empty states have CTAs; failed load no longer reads as "nothing registered"; detail 404 distinct from network error.

## Minor Observations
- "Needs attention" is 7 tiles - fine as a worklist; if backend returns mostly zeros it looks noisy. Consider hiding zero-value tiles (weigh vs Operate's stable-structure preference).
- Admin KPI grid still 9 equal tiles - acceptable for a lower-frequency review surface.
- No skeleton screens; first-load spinner is a bare ActivityIndicator for 4-8s.
- Tab-bar pictograms ("woman"/"body") still read as crude.

## Questions to Consider
- Offline-first now has a good error screen but no cached data. What would it take to show the last-synced dashboard/list with a "showing offline copy" banner instead of a Retry button?
- Could "Caseload overview" and "Recent registrations" merge, or move to the Profile/stats area entirely?
- Sam still can't read this in sunlight. Is a single "large text" toggle cheaper and more honest than tuning every size?
