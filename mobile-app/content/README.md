# Content directory

Drives compliance-task personalization without code changes.

## Files

- `tasks.json` — task definitions. Each entry has `id`, `titleKey`, `guidanceKey`, `whatToDoKey`, `penaltyKey` (all `task.*` i18n keys resolved at runtime via `t()`), plus `source`, `riskLevel`, and `dueDate`.
- `rules.json` — selection rules. Each entry has a `taskId` and an optional `when` array.

## Rule grammar

A rule fires when every clause in its `when` array matches the active `FarmProfile`. A rule with no `when` always fires.

Multiple rules sharing one `taskId` are ORed: the task is included if any of them fires.

### Operators

| op   | meaning                            | value type        |
|------|------------------------------------|-------------------|
| `>=` | numeric greater-than-or-equal      | number            |
| `<=` | numeric less-than-or-equal         | number            |
| `==` | strict equality                    | string/num/bool   |
| `!=` | strict inequality                  | string/num/bool   |
| `in` | value is in the supplied array     | array of literals |

Numeric profile fields stored as strings (e.g. `hectares: "25"`) are coerced to numbers for `>=` / `<=`. Missing or non-numeric fields never match numeric operators. Booleans must be exact for `==`/`!=`.

### Adding a new task

1. Add a `task.<id>.{title,guidance,what_to_do,penalty}` quadruple to `lib/i18n.ts` in both `en` and `lt`.
2. Add a `tasks.json` entry referencing those keys.
3. Add one or more `rules.json` entries to select the task for the right profiles.
4. Run `npm run check` to verify i18n parity and tests.
