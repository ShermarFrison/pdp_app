# Release Hardening — Risks

Date: 2026-05-19
Sub-project: SP5 (SCRUM-78)
Owner: The V

This document captures known limitations of the release candidate built from main after SP1–SP4 merged, plus any new findings uncovered during the SP5 smoke pass.

## Accepted residual risks

### R1 — Expo Go iOS notification limitations
**What:** On iOS, Expo Go (SDK-managed runtime) does not support the full Notifications API. Background notification handlers, custom notification categories, and notification action buttons behave differently or are silently dropped.
**Impact:** Local reminders, deep-link notifications, and notification taps may not fire reliably when the app is built and run through Expo Go on iOS. On Android the behavior is closer to a dev build but not identical.
**Mitigation:** Full notification behavior is validated only on EAS dev/preview builds. The smoke checklist's Flow 3.2 must be performed on a dev build before release sign-off; on Expo Go iOS it is permitted to record `BLOCKED — Expo Go iOS limitation`.
**Status:** Accepted for the release; production build is an EAS preview build, not Expo Go.

### R2 — OCR engine is simulated
**What:** The OCR feature in this release is wired to a simulated engine that returns deterministic results based on input filename. There is no real ML model running on-device or in a backend service.
**Impact:** Field extraction quality, latency, and the confidence scores observed in Flow 8 are not representative of production behavior.
**Mitigation:** A real OCR engine (on-device Vision framework on iOS, ML Kit on Android, or a backend OCR service) must be wired before the OCR feature is enabled for end users. The simulation is feature-flagged so production builds can ship with OCR hidden until the real engine lands.
**Status:** Accepted; OCR will ship behind a flag, off by default, until production OCR is integrated.

### R3 — No real backend; sync is local-simulated
**What:** The `SyncClient` used in SP2 is a local in-memory simulator. There is no real server-side endpoint, no authoritative timestamp, and no real conflict source.
**Impact:** Conflict behavior (Flow 2.5, Flow 5.2) is reproducible only via developer toggles. Real network-induced failures, partial writes, and authoritative remote state are not exercised.
**Mitigation:** Before any production deployment a real `SyncClient` implementation against the production backend must replace the simulator, and the smoke checklist must be re-run against a staging environment with the real backend.
**Status:** Accepted for the internal release; production deployment is blocked on a real backend and a re-run of this smoke checklist.

## Findings (from the SP5 smoke pass)

Add an entry here for every `FAIL` recorded in the smoke checklist. One entry per finding. Use the template below.

### Finding template
```
ID: F-NN
Flow: <Flow N.M from smoke checklist>
Summary: <one-line description>
Severity: blocker | critical | major | minor
Decision: fix-in-sp5 | reopen-sp<1..4> | new-ticket | accepted-residual
Owner: <name>
Notes: <free text>
```

### F-00 (informational)
```
ID: F-00 (informational)
Flow: unit+integration baseline
Summary: SP1-4 baseline = Tests: 96 passed, 96 total (Test Suites: 24 passed, 24 total)
Severity: minor
Decision: accepted-residual
Owner: The V
Notes: Recorded from `npm --prefix mobile-app test -- --watchAll=false` at the start of SP5.
```
