---
target: VHSMD / Health Connect frontend (worker dashboard anchor)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-31T12-13-28Z
slug: app-tabs-index-tsx
---
# Critique: VHSMD / Health Connect frontend (anchor: worker dashboard)

Mode: Operate. ANM/ASHA field worker completing tasks on a cheap Android phone, outdoors, one-handed, intermittent connectivity.
Method: DEGRADED single-context. Full design-director audit of all 15 screens + empty/error states completed earlier this session (screenshots + full source review + fixes applied and re-verified). Mandatory detector run (detect.mjs, 15 targets, exit 0 / clean; weak signal on RN StyleSheet).

## Design Health Score: 25/40 — Acceptable (significant improvements needed)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 4-8s waits show only a centered spinner; NO request timeout so unreachable backend hangs forever; "Online" pill reflects simulated-offline toggle not real reachability |
| 2 | Match System / Real World | 3 | Domain language right (ANC/EDD/LMP/Gravida-Para/W-o); "Alert Engine" still the Alerts tab title = system-speak |
| 3 | User Control and Freedom | 2 | No Cancel on any form (only header back); Mark Administered / Acknowledge are one-tap irreversible, no confirm, no undo; half-filled forms lose data on navigate-away |
| 4 | Consistency and Standards | 3 | Palette now coherent; pill casing diverges (HIGH RISK caps vs "4 overdue" lowercase); two Register Child entry points, different icons; crude tab-bar pictograms |
| 5 | Error Prevention | 2 | LMP and DOB are free-text YYYY-MM-DD fields (high miskey rate, wrong LMP silently corrupts the whole schedule); no confirm on Sign Out or irreversible clinical actions; no visible BP/Hb range validation |
| 6 | Recognition Rather Than Recall | 3 | Tabs and most icons labeled; header sync/bell icon-only |
| 7 | Flexibility and Efficiency | 2 | Search only fires on submit (no as-you-type on touch kbd); no bulk actions; no path from an alert into recording that visit; everything one-at-a-time |
| 8 | Aesthetic and Minimalist Design | 3 | Worker dashboard = ~13 equal-weight KPI tiles + quick actions + alerts + recent in one scroll; CRITICAL alerts sit below a full screen of tiles; name shown twice (header + banner) |
| 9 | Error Recovery | 2 | Network error copy now good + Retry; register-form failures just toast, no inline field errors; no-timeout hang leaves no error to recover from |
| 10 | Help and Documentation | 2 | Sync explainer + inline form hints are good; no onboarding, no explanation of "High Risk" / "ANC Overdue" thresholds, no tooltips |

## Design Specificity Verdict: category-interchangeable

After the palette cleanup it is a competent generic health-admin app. Teal + slate + rounded white cards is the most common "AI healthcare" look. Swap labels and this is a dermatology clinic app / school-attendance app / microfinance field-officer app unchanged. Three tells:
1. Zero typographic identity - platform system font (Roboto) only, no scale with intent. Loudest templated signal.
2. Usage scene absent from the design - bright sun, low-DPI budget phone, one-handed, 2G/no-signal, interruption. Nothing in type size, contrast, target sizing, or the loading/offline model reflects it. Offline-first premise undercut by infinite spinners with no cached fallback.
3. Grab-bag Ionicons (smiley for Register Child, dumbbell/pulse for 2nd trimester, crude tab-bar pictograms).
Restraint is correct for Operate; the gap is fitness for the operator's real conditions, not flashiness.

Deterministic scan: detect.mjs 15 files, 0 findings, exit 0. Low confidence (web-idiom detector vs RN StyleSheet).
Visual overlays: n/a (RN Web, no injection). 17 screenshots in .audit-screenshots/ are the visual evidence.

## Overall Impression
This session fixed the embarrassing problems (DEMO badges, rainbow colors, leaked "Failed to fetch" / "Mock FCM panel", a clipped tile). What remains is the harder layer: the app is shaped like a generic admin dashboard when it should be shaped like a field instrument. Biggest opportunity: rebuild the worker dashboard around "what do I need to do today," not "here are 13 numbers."

## What's Working
- Alerts screen is genuinely good: severity bar -> bold title -> context -> two correctly-sized actions. The pattern the rest of the app should borrow.
- Forms (ANC record, both register screens) are calm and correct: clear labels, sectioning, required marks, scaffolding, sticky primary button, one decision at a time.
- Post-fix color discipline holds: teal=neutral count, amber=due, red=overdue/risk, green=done, consistent across both dashboards.

## Priority Issues
- [P1] Worker dashboard has no hierarchy - wall of ~13 equal-weight tiles; CRITICAL alerts below a full screen of scrolling. Fix: lead with today's alerts + "due this week"; demote the metric grid to a secondary section/tab. Command: /impeccable layout
- [P1] Free-text date fields for LMP and DOB - drives EDD and the whole ANC/vaccine schedule; wrong LMP silently corrupts the schedule. Fix: native date picker, constrain ranges. Command: /impeccable harden
- [P1] Irreversible actions with no confirm and no undo - "Mark Administered" and "Acknowledge" are single taps changing clinical records. Fix: undo toast (~5s) preferred over confirm for field speed. Command: /impeccable harden
- [P2] No timeout on data fetches - offline-first app hangs on an infinite spinner when offline; the friendly error copy never fires. Fix: AbortController ~10s timeout -> error state; show cached data with a banner if available. Command: /impeccable harden
- [P2] No typographic identity - system-font-only, no deliberate scale. Fix: load a two-face pair via expo-font, set a real scale. Command: /impeccable typeset

## Persona Red Flags
Casey (distracted mobile, the primary persona): search doesn't filter until submit; half-filled forms lose data when OS backgrounds the app; 4-8s spinner with no skeleton on the first screen every session; FAB overlaps last card's content; CRITICAL alerts below the thumb zone and below a screen of scrolling.
Sam (low vision / outdoor glare, older workers): body text 11-13px, metadata/pills 9-10px - unreadable in sunlight; trimester tiles distinguished by hue only (near-identical circle icons); header buttons icon-only; 9px tracked-caps risk labels.
Riley (stress tester, 50 beneficiaries): first ~6 pregnancies show DELIVERED badge at 14-17 wks gestation / 2027 EDD (wrong data, no sanity check); empty state is a lone grey figure + one sentence, no CTA; error state shows green "Online" pill while body says server unreachable.

## Minor Observations
- Name rendered twice on the worker dashboard (header + dark banner).
- Admin greeting banner still truncates the CMO name mid-parenthetical.
- Notification card titles clamp to one line, almost always truncate.
- Child list vaccine progress bar stays near-full green even with overdue vaccines.
- "beneficiaries" is govtspeak; "mothers"/"women" reads warmer - confirm it is not a mandated term first.
- Quick action "Register Child" uses a smiley icon while "Register Pregnancy" uses add-circle.

## Questions to Consider
- What if the worker dashboard opened on "3 women need attention today" instead of 13 numbers?
- The product is offline-first. Where in the UI does that actually show? What would a confident offline-first status model look like?
- These screens are used in sunlight on cheap phones. What is the smallest usable type size and touch target there, and how far is the current design from it?
- Alerts nails "clear stakes, clear action." What would it take to make every task screen feel that decisive?
