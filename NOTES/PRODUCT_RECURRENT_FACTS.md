# PRODUCT RECURRENT FACTS

- Product target: EU CAP compliance support for farmers (SMR/GAEC), with Lithuania as an initial pilot context.
- Repeating MVP flow: secure login, farm profile capture, personalized task list with plain-language guidance, basic report submission, offline draft and sync, deadline reminders, and audit logging.
- Primary user value: reduce compliance administrative burden, avoid missed deadlines and penalties, and improve access to subsidy-related actions.

## Mobile App Prototype (`mobile-app/`)

- Stack: Expo React Native, file-based routing via `app/(tabs)/_layout.tsx` (custom tab bar, not Expo Router tabs).
- All features are mocked — no real backend, no real OCR.
- Established implementation pattern: add types → extend `AppState`/`seed.ts` → add context functions in `AppContext.tsx` → add screen UI.
- Demo credentials: `farmer@pdp.test / harvest123` (defined in `data/seed.ts`).
- Auth/state: single `AppState` in `context/AppContext.tsx`, persisted via `lib/storage.ts` (AsyncStorage).
- i18n: `lib/i18n.ts` — `t(key, lang)` with full EN + LT dictionaries typed as `Record<I18nKey, string>`; language stored in `AppState.language`.
- `syncReports()` returns `{ synced, failed, conflicts }` (conflicts added in Sprint 5/6; old callers destructuring only `{ synced, failed }` still work).

## Implemented Sprints
- Sprint 4 (SCRUM-33,34,37,45,46,48): report create/draft/offline sync, evidence upload, regulations read, help tickets, multi-offset reminders.
- Sprint 5/6 (SCRUM-38,40,43,44,47): OCR prefill, sync conflict resolution, advisor delegated access, EN/LT i18n (all screens), audit log export CSV/JSON.
