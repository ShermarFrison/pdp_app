# Content & Intelligence — Design

Date: 2026-05-19
Sub-project: SP4 of 5 (Sprints 5 & 6 delivery)
Owner: The V
Depends on: SP2 (`lib/evidence/picker` reused for OCR file selection).

## Tickets in scope

- **SCRUM-74** — i18n framework, persisted language selection, untranslated-key build guard.
- **SCRUM-75** — Expand task personalization rules and externalize task/risk/guidance content.
- **SCRUM-73** — OCR document import with editable extraction review and low-confidence flags.
- **SCRUM-76** — Regulation feed deep-links from change items into impacted task or guidance.
- **SCRUM-44** (audit-then-extend) — Existing i18n MVP; productionized by SCRUM-74.
- **SCRUM-38** (audit-then-extend) — Existing OCR review keys; productionized by SCRUM-73.
- **SCRUM-43** (audit-then-extend) — Advisor delegated access; verify; minor gap fixes only, otherwise defer to SP5.

Out of scope: release smoke / regression (SP5), real OCR engine, new languages beyond `en` and `lt`.

## Context

- `lib/i18n.ts` is a hand-rolled `t(key, lang)` over two dictionaries (`en`, `lt`). ~80 keys covering tabs, login, dashboard, reports, OCR, conflict, export. Missing keys return `[MISSING: <key>]`.
- `lib/tasks.ts` exposes `deriveTasks(profile)` with three hardcoded rules; titles, guidance, and penalty copy are inline literals.
- OCR review i18n keys exist; a basic review screen is presumed (verify at plan time).
- The regulation feed renders items with an "Impacted Tasks" section but does not navigate to them.
- SCRUM-43 advisor access is in review; no follow-up ticket exists; this sub-project treats it as audit-only.

## Approach

Keep the lightweight `t()` API and extend it with device-locale detection, persistence verification, and a missing-key build guard. Replace hardcoded `deriveTasks` with a JSON-driven rule engine reading from a `content/` directory. Productionize the OCR review UI with editable fields and per-field confidence flags using a deterministic simulated OCR. Add deep-link navigation from regulation feed items to impacted tasks.

## i18n hardening (SCRUM-74)

- Retain `lib/i18n.ts` `t(key, lang)` API. No external i18n library.
- Add `getInitialLanguage()`:
  - Read `expo-localization` device locale.
  - Map to supported set (`en`, `lt`); fall back to `en`.
  - Only used on first launch when no persisted preference exists.
- Language selection persists in AppState (already does). Add an integration test asserting:
  - The selected language survives app restart.
  - The selected language survives logout + login.
- Add `scripts/check-i18n.ts`:
  - Scans `app/`, `components/`, `context/`, `lib/` for `t("...")` calls.
  - Asserts every referenced key exists in every dictionary.
  - Asserts every dictionary has the same key set.
  - Exits non-zero on missing or mismatched keys.
- Wire the script into `package.json` `scripts.check` and into the test suite so CI fails on drift.
- Unit test `i18n.test.ts` covers dictionary parity and the `[MISSING: ...]` fallback.

## Personalization + externalized content (SCRUM-75)

### Layout

```
mobile-app/content/
  tasks.json
  rules.json
  README.md          // documents the rule grammar
mobile-app/lib/personalization/
  evaluate.ts        // evaluateRules(profile, rules) -> taskIds
  load.ts            // loadTasks(profile, language) -> ComplianceTask[]
  index.ts
```

### Data shape

`tasks.json` entries:

```
{
  "id": "buffer-strips",
  "titleKey": "task.buffer_strips.title",
  "guidanceKey": "task.buffer_strips.guidance",
  "whatToDoKey": "task.buffer_strips.what_to_do",
  "penaltyKey": "task.buffer_strips.penalty",
  "source": "Baseline CAP requirement",
  "riskLevel": "medium",
  "dueDate": "2026-04-15"
}
```

All copy moves into the i18n dictionaries under `task.*` keys; full Lithuanian translations land in `lt`.

`rules.json` entries:

```
{
  "taskId": "soil-cover",
  "when": [
    { "field": "hectares", "op": ">=", "value": 20 }
  ]
}
```

A task with no `when` clause is unconditional. Multiple clauses on one rule are ANDed. Multiple rules with the same `taskId` are ORed.

### Rule grammar

Supported operators: `>=`, `<=`, `==`, `!=`, `in` (value is an array). Supported field types: number, string, enum. Documented in `content/README.md`.

### `deriveTasks` rewire

`deriveTasks(profile)` becomes:

1. Load `rules.json`; call `evaluateRules(profile, rules)` → `Set<taskId>`.
2. Load `tasks.json` filtered to those ids.
3. Resolve i18n strings via current `t()` and return the existing `ComplianceTask` shape unchanged.

Existing call sites are unaffected.

### Rule coverage

Expanded rule set covers at minimum the acceptance intent of SCRUM-31/32/42: organic-certified holdings, crop-rotation rules over hectare thresholds, livestock density bands, nitrate-vulnerable-zone variants. Exact rule list is locked in the plan, not the spec.

## OCR review productionization (SCRUM-73)

### Simulated extraction

```
mobile-app/lib/ocr/
  extract.ts         // extractFromFile(uri, fileName) -> ExtractionResult
  index.ts
```

`extractFromFile` returns:

```
{
  documentType: { value: string, confidence: number },
  documentDate: { value: string, confidence: number },
  referenceId:  { value: string, confidence: number }
}
```

Mock is deterministic: seeded RNG keyed on `fileName`. Demo documents are tuned so most fields land at `confidence >= 0.7` with one deliberate low-confidence field per document.

### Review screen

Route `mobile-app/app/ocr-review/[reportId].tsx`:

- Each extracted field renders as an editable text input pre-filled with the extracted value.
- Fields with `confidence < 0.7` show the existing `ocr.low_confidence` badge (orange).
- **Apply to Draft** writes confirmed values into the report draft and appends an `ocr.applied` audit event with a per-field source map: `{ documentType: "extracted" | "edited", ... }`.
- **Cancel** discards the extraction.

### Entry point

The existing "Upload Document (OCR Prefill)" action on the Reports screen invokes SP2's `lib/evidence/picker.pickDocument()`, copies the file via `lib/evidence/storage.copyIntoAppDocs`, calls `lib/ocr/extract.extractFromFile`, and routes to `/ocr-review/[reportId]` with the result.

## Regulation feed deep-links (SCRUM-76)

- Each "Impacted Tasks" chip on a regulation feed item becomes a `Link` to `/tasks/[id]`. Items without a specific task link to a `/guidance/[topic]` route (existing or stubbed).
- Read/unread state is preserved (already in AppState). Tapping an impacted-task link marks the source item read.
- An `regulation.opened` audit event is appended with `{ feedItemId, target }`.

## SCRUM-43 audit (advisor delegated access)

Plan step: read the current implementation. If invite, revoke, scoped permissions, and audit-on-advisor-actions all work, no extension is performed. Documented gaps lead to either small inline fixes (capped at one plan step) or are deferred to SP5 release hardening with a noted risk.

## Test strategy

Unit:

- `i18n.test.ts` — dictionary parity; `[MISSING: ...]` fallback; `getInitialLanguage` resolution from device locale.
- `scripts/check-i18n.test.ts` — guard detects a planted missing or mismatched key.
- `personalization/evaluate.test.ts` — table-driven profile → expected `taskIds` over every supported operator.
- `personalization/load.test.ts` — `loadTasks` returns the existing `ComplianceTask` shape with resolved i18n strings.
- `ocr/extract.test.ts` — deterministic shape; confidences in `[0, 1]`; low-confidence fields flagged appropriately.

Integration:

- Selected language survives restart and logout/login.
- Document picked → OCR review → apply → report draft updated and `ocr.applied` event present in audit log.
- Tap regulation item's impacted-task link → router pushed to `/tasks/[id]`, source item marked read, `regulation.opened` event recorded.

## Risks and mitigations

- **i18n guard flags pre-existing missing keys.** Mitigation: clean those at plan time; the guard turns on only after a clean run.
- **Externalized tasks may break seeded references.** Mitigation: keep stable task ids across the migration; add a one-shot pruning step for unknown ids logged as `migration.task_pruned`.
- **OCR mock confidence distribution affects demo perception.** Mitigation: tune deterministic confidences so most fields are >=0.7 with one intentional low-confidence field per demo doc.
- **SCRUM-43 audit uncovers larger gaps than expected.** Mitigation: defer to SP5 with explicit risk note rather than scope-creep this sub-project.

## Acceptance criteria

- `getInitialLanguage` resolves to a supported language from device locale on first launch; user-selected language persists across restart and logout/login.
- `scripts/check-i18n.ts` runs in `npm test` (or equivalent) and fails on missing or mismatched keys; current dictionaries pass the guard.
- `deriveTasks` reads from `content/tasks.json` + `content/rules.json` via `lib/personalization`; output shape unchanged; expanded rules cover SCRUM-31/32/42 acceptance intent.
- All task copy lives in i18n dictionaries; Lithuanian translations are complete for every task in `tasks.json`.
- Picking a document from the Reports screen routes to `/ocr-review/[reportId]` with editable fields and per-field confidence badges; **Apply** writes into the draft and appends `ocr.applied`.
- Regulation feed item's impacted-task chips deep-link to `/tasks/[id]`; read state and audit event behave per spec.
- SCRUM-43 verified or minor gaps closed; larger gaps documented as SP5 risks.
- All new unit + integration tests pass; existing flows do not regress.
