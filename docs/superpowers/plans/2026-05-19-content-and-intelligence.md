# Content & Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productionize i18n, externalize task content into a JSON-driven rule engine, ship an OCR document-import review screen, and wire regulation-feed deep links — covering SCRUM-74, 75, 73, 76 and audit-then-extend for 44, 38, 43.

**Architecture:** Keep the hand-rolled `t(key, lang)` API and extend it with `expo-localization`-based device-locale detection plus a CI-grade missing-key/parity guard. Replace hardcoded `deriveTasks` with a tiny rule engine (`evaluateRules` over `>=, <=, ==, !=, in`) reading `content/rules.json` and `content/tasks.json`; all visible task copy migrates into `task.*` i18n keys with full LT translations. OCR becomes a dedicated route `/ocr-review/[reportId]` driven by a deterministic seeded mock keyed on `fileName`, fed by SP2's `lib/evidence/picker.pickDocument` and `lib/evidence/storage.copyIntoAppDocs`. Regulation-feed impacted-task chips become `expo-router` `Link`s to `/tasks/[id]` that mark the source item read and append a `regulation.opened` audit event.

**Tech Stack:** React Native (Expo SDK 54), expo-router 6, TypeScript 5.9, AsyncStorage, expo-localization (new), Jest + ts-node for the i18n check script. No new runtime libraries beyond expo-localization.

---

## File Structure

Created:
- `mobile-app/content/tasks.json`
- `mobile-app/content/rules.json`
- `mobile-app/content/README.md`
- `mobile-app/lib/personalization/evaluate.ts`
- `mobile-app/lib/personalization/load.ts`
- `mobile-app/lib/personalization/index.ts`
- `mobile-app/lib/personalization/__tests__/evaluate.test.ts`
- `mobile-app/lib/personalization/__tests__/load.test.ts`
- `mobile-app/lib/ocr/extract.ts`
- `mobile-app/lib/ocr/index.ts`
- `mobile-app/lib/ocr/__tests__/extract.test.ts`
- `mobile-app/lib/i18n/__tests__/i18n.test.ts`
- `mobile-app/lib/i18n/__tests__/locale.test.ts`
- `mobile-app/scripts/check-i18n.ts`
- `mobile-app/scripts/__tests__/check-i18n.test.ts`
- `mobile-app/app/ocr-review/[reportId].tsx`
- `mobile-app/app/tasks/[id].tsx`
- `mobile-app/app/guidance/[topic].tsx`
- `mobile-app/__tests__/language-persistence.test.tsx`
- `mobile-app/__tests__/ocr-flow.test.tsx`
- `mobile-app/__tests__/regulation-link.test.tsx`
- `mobile-app/jest.config.js`
- `mobile-app/jest.setup.ts`

Modified:
- `mobile-app/lib/i18n.ts` (add task.* keys + LT translations + getInitialLanguage)
- `mobile-app/lib/tasks.ts` (rewire to personalization engine)
- `mobile-app/types.ts` (add `OcrFieldSource`, extend `OcrExtraction`, add `AuditEventType` values `ocr.applied` and `regulation.opened`)
- `mobile-app/context/AppContext.tsx` (use `getInitialLanguage` on first launch, add `applyOcrExtractionV2`, add `openRegulation`)
- `mobile-app/app/(tabs)/reports.tsx` (replace inline OCR panel with router push to `/ocr-review/[reportId]`)
- `mobile-app/app/(tabs)/regulations.tsx` (impacted-task chips become `Link`s; record `regulation.opened`)
- `mobile-app/package.json` (add `check`, `test`, `expo-localization`, `jest` deps; `scripts.check` runs `check-i18n`)

---

## Task 1: Test infrastructure

**Files:**
- Create: `mobile-app/jest.config.js`
- Create: `mobile-app/jest.setup.ts`
- Modify: `mobile-app/package.json`

- [ ] **Step 1: Create jest config**

`mobile-app/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-localization|expo-router|@react-navigation/.*))",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
};
```

- [ ] **Step 2: Create jest setup**

`mobile-app/jest.setup.ts`:

```ts
import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
```

- [ ] **Step 3: Update package.json**

Replace `mobile-app/package.json` with:

```json
{
  "name": "pdp-mobile-prototype",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "test": "jest",
    "check": "ts-node --transpile-only scripts/check-i18n.ts && jest"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.13",
    "expo-localization": "~16.0.0",
    "expo-router": "~6.0.23",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-web": "^0.21.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0"
  },
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^12.7.2",
    "@types/jest": "^29.5.12",
    "@types/react": "~19.1.10",
    "babel-preset-expo": "~54.0.6",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0",
    "ts-node": "^10.9.2",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 4: Install**

Run: `cd mobile-app && npm install`
Expected: exit 0; `node_modules/expo-localization` and `node_modules/jest` present.

- [ ] **Step 5: Verify jest boots**

Run: `cd mobile-app && npx jest --listTests`
Expected: prints empty/zero tests, exits 0.

- [ ] **Step 6: Commit**

```bash
git add mobile-app/jest.config.js mobile-app/jest.setup.ts mobile-app/package.json mobile-app/package-lock.json
git commit -m "chore(mobile): add jest + expo-localization for SP4"
```

---

## Task 2: i18n key catalog expansion (task.* keys + LT translations)

**Files:**
- Modify: `mobile-app/lib/i18n.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile-app/lib/i18n/__tests__/i18n.test.ts`:

```ts
import { t, EN_KEYS, LT_KEYS } from "@/lib/i18n";

describe("i18n dictionaries", () => {
  test("EN and LT have identical key sets", () => {
    expect(EN_KEYS.sort()).toEqual(LT_KEYS.sort());
  });

  test("missing key returns [MISSING: ...] sentinel", () => {
    // @ts-expect-error - intentional miss
    expect(t("nope.key", "en")).toBe("[MISSING: nope.key]");
  });

  test("task.* keys exist for buffer-strips/soil-cover/manure-log/organic-record/nitrate-plan/crop-rotation-plan", () => {
    const ids = [
      "buffer_strips",
      "soil_cover",
      "manure_log",
      "organic_record",
      "nitrate_plan",
      "crop_rotation_plan",
    ];
    for (const id of ids) {
      for (const suffix of ["title", "guidance", "what_to_do", "penalty"]) {
        expect(t(`task.${id}.${suffix}` as any, "en")).not.toMatch(/^\[MISSING/);
        expect(t(`task.${id}.${suffix}` as any, "lt")).not.toMatch(/^\[MISSING/);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile-app && npx jest lib/i18n/__tests__/i18n.test.ts`
Expected: FAIL — `EN_KEYS` not exported and `task.*` keys missing.

- [ ] **Step 3: Update i18n.ts**

Replace `mobile-app/lib/i18n.ts` entirely with:

```ts
import { AppLanguage } from "@/types";

export type I18nKey =
  | "tab.dashboard" | "tab.calendar" | "tab.reports" | "tab.regulations"
  | "tab.profile" | "tab.help" | "tab.audit"
  | "login.title" | "login.button" | "login.tagline"
  | "dashboard.welcome" | "dashboard.tasks" | "dashboard.overdue" | "dashboard.drafts"
  | "dashboard.compliance_tasks" | "dashboard.sign_out"
  | "dashboard.upload_evidence" | "dashboard.evidence_files"
  | "reports.title" | "reports.subtitle" | "reports.online" | "reports.offline"
  | "reports.simulate_offline" | "reports.go_online" | "reports.queued"
  | "reports.sync_now" | "reports.create_new" | "reports.submitted"
  | "reports.edit_draft" | "reports.no_draft" | "reports.save_draft"
  | "reports.submit" | "reports.upload_document" | "reports.ocr_review"
  | "calendar.title" | "calendar.subtitle" | "calendar.past_due" | "calendar.no_tasks"
  | "regulations.title" | "regulations.subtitle" | "regulations.impacted_tasks" | "regulations.new"
  | "profile.title" | "profile.subtitle" | "profile.farm_details" | "profile.farm_ops"
  | "profile.save_local" | "profile.sync_backend" | "profile.reminders"
  | "profile.language" | "profile.advisors" | "profile.invite_advisor" | "profile.revoke_access"
  | "help.title" | "help.subtitle" | "help.new_ticket" | "help.my_tickets"
  | "help.submit" | "help.attach_screenshot"
  | "audit.title" | "audit.subtitle" | "audit.events_count" | "audit.export" | "audit.export_title"
  | "ocr.document_type" | "ocr.document_date" | "ocr.reference_id"
  | "ocr.low_confidence" | "ocr.confirm_apply" | "ocr.extracted_from"
  | "ocr.cancel" | "ocr.review_title" | "ocr.applied_msg"
  | "conflict.title" | "conflict.subtitle" | "conflict.local" | "conflict.server" | "conflict.resolve"
  | "export.date_from" | "export.date_to" | "export.format_csv" | "export.format_json"
  | "export.preview" | "export.copy_clipboard" | "export.copied" | "export.generate"
  | "task.buffer_strips.title" | "task.buffer_strips.guidance" | "task.buffer_strips.what_to_do" | "task.buffer_strips.penalty"
  | "task.soil_cover.title" | "task.soil_cover.guidance" | "task.soil_cover.what_to_do" | "task.soil_cover.penalty"
  | "task.manure_log.title" | "task.manure_log.guidance" | "task.manure_log.what_to_do" | "task.manure_log.penalty"
  | "task.organic_record.title" | "task.organic_record.guidance" | "task.organic_record.what_to_do" | "task.organic_record.penalty"
  | "task.nitrate_plan.title" | "task.nitrate_plan.guidance" | "task.nitrate_plan.what_to_do" | "task.nitrate_plan.penalty"
  | "task.crop_rotation_plan.title" | "task.crop_rotation_plan.guidance" | "task.crop_rotation_plan.what_to_do" | "task.crop_rotation_plan.penalty";

type Dictionary = Record<I18nKey, string>;

const EN: Dictionary = {
  "tab.dashboard": "Dashboard", "tab.calendar": "Calendar", "tab.reports": "Reports",
  "tab.regulations": "Rules", "tab.profile": "Profile", "tab.help": "Help", "tab.audit": "Audit",
  "login.title": "Sign in to your farm", "login.button": "Open Dashboard",
  "login.tagline": "Simplify CAP compliance for Lithuanian farmers. Track tasks, manage reports, stay audit-ready.",
  "dashboard.welcome": "Welcome back", "dashboard.tasks": "Tasks",
  "dashboard.overdue": "Overdue", "dashboard.drafts": "Drafts",
  "dashboard.compliance_tasks": "Compliance Tasks", "dashboard.sign_out": "Sign Out",
  "dashboard.upload_evidence": "Upload Evidence", "dashboard.evidence_files": "Evidence Files",
  "reports.title": "Reports", "reports.subtitle": "Create, edit, and submit compliance reports.",
  "reports.online": "Online", "reports.offline": "Offline — drafts saved locally",
  "reports.simulate_offline": "Simulate Offline", "reports.go_online": "Go Online",
  "reports.queued": "action(s) queued for sync", "reports.sync_now": "Sync Now",
  "reports.create_new": "Create New Report", "reports.submitted": "Submitted Reports",
  "reports.edit_draft": "Edit Draft", "reports.no_draft": "No Draft",
  "reports.save_draft": "Save Draft", "reports.submit": "Submit Report",
  "reports.upload_document": "Upload Document (OCR Prefill)", "reports.ocr_review": "OCR Review",
  "calendar.title": "Calendar", "calendar.subtitle": "Compliance deadlines at a glance.",
  "calendar.past_due": "Past-Due Tasks", "calendar.no_tasks": "No tasks due on this day.",
  "regulations.title": "Regulation Changes",
  "regulations.subtitle": "Stay updated on CAP requirement changes that affect your farm.",
  "regulations.impacted_tasks": "Impacted Tasks", "regulations.new": "new",
  "profile.title": "Farm Profile",
  "profile.subtitle": "Your profile drives personalized compliance tasks and reporting.",
  "profile.farm_details": "Farm Details", "profile.farm_ops": "Farm Operations",
  "profile.save_local": "Save Local Draft", "profile.sync_backend": "Sync to Backend",
  "profile.reminders": "Reminder Schedule", "profile.language": "Interface Language",
  "profile.advisors": "Advisor Access", "profile.invite_advisor": "Invite Advisor",
  "profile.revoke_access": "Revoke",
  "help.title": "Help & Support", "help.subtitle": "Submit a ticket and we will get back to you.",
  "help.new_ticket": "New Ticket", "help.my_tickets": "My Tickets",
  "help.submit": "Submit Ticket", "help.attach_screenshot": "Attach Screenshot",
  "audit.title": "Audit Log", "audit.subtitle": "Immutable record of compliance actions with timestamps.",
  "audit.events_count": "event(s) recorded", "audit.export": "Export Audit Log", "audit.export_title": "Export",
  "ocr.document_type": "Document Type", "ocr.document_date": "Document Date",
  "ocr.reference_id": "Reference ID",
  "ocr.low_confidence": "Low confidence — review before applying",
  "ocr.confirm_apply": "Apply to Draft", "ocr.extracted_from": "Extracted from",
  "ocr.cancel": "Cancel", "ocr.review_title": "Review extracted fields",
  "ocr.applied_msg": "OCR fields applied to draft.",
  "conflict.title": "Sync Conflict",
  "conflict.subtitle": "Choose which value to keep for each field.",
  "conflict.local": "Local", "conflict.server": "Server",
  "conflict.resolve": "Save Merged Result",
  "export.date_from": "Date From", "export.date_to": "Date To",
  "export.format_csv": "CSV", "export.format_json": "JSON",
  "export.preview": "Preview", "export.copy_clipboard": "Copy to Clipboard",
  "export.copied": "Copied!", "export.generate": "Generate Export",
  "task.buffer_strips.title": "Confirm field buffer strips",
  "task.buffer_strips.guidance": "Walk boundary fields and note any missing protective strips.",
  "task.buffer_strips.what_to_do": "1. Walk the perimeter of all fields.\n2. Check that buffer strips of at least 3 metres exist along watercourses.\n3. Photograph any gaps and note their GPS location.\n4. Record findings in your compliance log.",
  "task.buffer_strips.penalty": "Missing or inadequate buffer strips can result in a 3–5% reduction in your CAP direct payment. Repeated non-compliance may lead to additional penalty multipliers in subsequent years.",
  "task.soil_cover.title": "Document winter soil cover",
  "task.soil_cover.guidance": "Capture where soil cover is maintained and record the crop plan.",
  "task.soil_cover.what_to_do": "1. Survey all arable fields after harvest.\n2. Record which fields have winter crop, cover crop, or natural vegetation.\n3. Ensure at least 80% of soil is covered between 1 Nov – 15 Feb.\n4. Upload photographic evidence or add notes to the field log.",
  "task.soil_cover.penalty": "GAEC 6 requires minimum soil cover on large holdings. Non-compliance is classified as a high-risk finding and can result in a 5–10% cut to your area payments.",
  "task.manure_log.title": "Update manure storage log",
  "task.manure_log.guidance": "Record storage checks and spreading windows in plain language notes.",
  "task.manure_log.what_to_do": "1. Record the current volume in each manure storage facility.\n2. Confirm no spreading occurred during closed periods (1 Oct – 1 Feb).\n3. Log the date, facility ID, and your name as the responsible person.\n4. Check for any signs of leakage and record the outcome.",
  "task.manure_log.penalty": "SMR 1 (Nitrates Directive) requires accurate manure storage records. Failures can carry up to 10% payment reduction and trigger on-site inspection.",
  "task.organic_record.title": "Maintain organic certification record",
  "task.organic_record.guidance": "Keep inputs and field-history records aligned with your organic body's annual audit.",
  "task.organic_record.what_to_do": "1. Update the inputs ledger with any seed, compost, or amendment applied this season.\n2. Confirm no prohibited substances were used on certified parcels.\n3. Attach the latest certificate scan to your profile.\n4. Confirm parcel boundaries match the certified map.",
  "task.organic_record.penalty": "Loss of organic certification revokes the per-hectare organic premium and can require repayment of premiums already received in the current campaign year.",
  "task.nitrate_plan.title": "File nitrate-zone fertilisation plan",
  "task.nitrate_plan.guidance": "Holdings inside a Nitrate Vulnerable Zone (NVZ) must submit an annual plan before the spreading window.",
  "task.nitrate_plan.what_to_do": "1. Calculate N application rates per parcel.\n2. Respect the NVZ closed period for spreading.\n3. File the plan with the regional authority before 1 March.\n4. Keep proof of submission with your audit log.",
  "task.nitrate_plan.penalty": "Failure to file an NVZ plan is a cross-compliance breach: 3% reduction baseline, doubled on repeat finding, plus possible environmental fine.",
  "task.crop_rotation_plan.title": "Confirm crop-rotation plan",
  "task.crop_rotation_plan.guidance": "GAEC 7 requires a documented rotation on arable holdings above the hectare threshold.",
  "task.crop_rotation_plan.what_to_do": "1. List each parcel's primary crop for the last two seasons.\n2. Mark parcels where the same crop has been grown two years running.\n3. Plan a different main crop or catch-crop for any flagged parcels.\n4. Save the plan as part of your audit record.",
  "task.crop_rotation_plan.penalty": "GAEC 7 non-compliance reduces direct payments by 1–3% and is treated as repeat-finding on the second consecutive year.",
};

const LT: Dictionary = {
  "tab.dashboard": "Suvestinė", "tab.calendar": "Kalendorius", "tab.reports": "Ataskaitos",
  "tab.regulations": "Taisyklės", "tab.profile": "Profilis", "tab.help": "Pagalba", "tab.audit": "Auditas",
  "login.title": "Prisijunkite prie savo ūkio", "login.button": "Atidaryti suvestinę",
  "login.tagline": "Supaprastinkite CAP atitikimą Lietuvos ūkininkams. Sekite užduotis, valdykite ataskaitas.",
  "dashboard.welcome": "Sveiki sugrįžę", "dashboard.tasks": "Užduotys",
  "dashboard.overdue": "Vėluoja", "dashboard.drafts": "Juodraščiai",
  "dashboard.compliance_tasks": "Atitikties užduotys", "dashboard.sign_out": "Atsijungti",
  "dashboard.upload_evidence": "Įkelti įrodymą", "dashboard.evidence_files": "Įrodymų failai",
  "reports.title": "Ataskaitos", "reports.subtitle": "Kurkite, redaguokite ir teikite atitikties ataskaitas.",
  "reports.online": "Prisijungta", "reports.offline": "Neprisijungta — juodraščiai išsaugomi vietoje",
  "reports.simulate_offline": "Imituoti neprisijungimą", "reports.go_online": "Prisijungti",
  "reports.queued": "veiksmas(-ai) laukia sinchronizavimo", "reports.sync_now": "Sinchronizuoti dabar",
  "reports.create_new": "Sukurti naują ataskaitą", "reports.submitted": "Pateiktos ataskaitos",
  "reports.edit_draft": "Redaguoti juodraštį", "reports.no_draft": "Nėra juodraščio",
  "reports.save_draft": "Išsaugoti juodraštį", "reports.submit": "Pateikti ataskaitą",
  "reports.upload_document": "Įkelti dokumentą (OCR užpildymas)", "reports.ocr_review": "OCR peržiūra",
  "calendar.title": "Kalendorius", "calendar.subtitle": "Atitikties terminai iš pirmo žvilgsnio.",
  "calendar.past_due": "Praėjusio termino užduotys", "calendar.no_tasks": "Nėra užduočių šią dieną.",
  "regulations.title": "Reglamento pakeitimai",
  "regulations.subtitle": "Sekite CAP reikalavimų pakeitimus, turinčius įtakos jūsų ūkiui.",
  "regulations.impacted_tasks": "Paveiktos užduotys", "regulations.new": "nauja(-i)",
  "profile.title": "Ūkio profilis",
  "profile.subtitle": "Jūsų profilis formuoja personalizuotas atitikties užduotis.",
  "profile.farm_details": "Ūkio informacija", "profile.farm_ops": "Ūkio operacijos",
  "profile.save_local": "Išsaugoti vietoje", "profile.sync_backend": "Sinchronizuoti su serveriu",
  "profile.reminders": "Priminimų grafikas", "profile.language": "Sąsajos kalba",
  "profile.advisors": "Konsultantų prieiga", "profile.invite_advisor": "Pakviesti konsultantą",
  "profile.revoke_access": "Atšaukti",
  "help.title": "Pagalba ir palaikymas", "help.subtitle": "Pateikite užklausą ir mes su jumis susisieksime.",
  "help.new_ticket": "Nauja užklausa", "help.my_tickets": "Mano užklausos",
  "help.submit": "Pateikti užklausą", "help.attach_screenshot": "Pridėti ekrano kopiją",
  "audit.title": "Audito žurnalas", "audit.subtitle": "Nekeičiamas atitikties veiksmų įrašas su laiko žymomis.",
  "audit.events_count": "įvykis(-iai) užregistruotas(-i)", "audit.export": "Eksportuoti audito žurnalą",
  "audit.export_title": "Eksportas",
  "ocr.document_type": "Dokumento tipas", "ocr.document_date": "Dokumento data",
  "ocr.reference_id": "Nuorodos ID",
  "ocr.low_confidence": "Žemas patikimumas — patikrinkite prieš taikydami",
  "ocr.confirm_apply": "Taikyti juodraščiui", "ocr.extracted_from": "Išgauta iš",
  "ocr.cancel": "Atšaukti", "ocr.review_title": "Peržiūrėti išgautus laukus",
  "ocr.applied_msg": "OCR laukai pritaikyti juodraščiui.",
  "conflict.title": "Sinchronizavimo konfliktas",
  "conflict.subtitle": "Pasirinkite kiekvienam laukui naudojamą reikšmę.",
  "conflict.local": "Vietinis", "conflict.server": "Serverio",
  "conflict.resolve": "Išsaugoti suderintą rezultatą",
  "export.date_from": "Data nuo", "export.date_to": "Data iki",
  "export.format_csv": "CSV", "export.format_json": "JSON",
  "export.preview": "Peržiūra", "export.copy_clipboard": "Kopijuoti į iškarpinę",
  "export.copied": "Nukopijuota!", "export.generate": "Generuoti eksportą",
  "task.buffer_strips.title": "Patvirtinkite laukų apsaugines juostas",
  "task.buffer_strips.guidance": "Apeikite ribinius laukus ir užfiksuokite trūkstamas apsaugines juostas.",
  "task.buffer_strips.what_to_do": "1. Apeikite visų laukų perimetrą.\n2. Patikrinkite, ar šalia vandens telkinių yra bent 3 m apsaugos juostos.\n3. Nufotografuokite trūkumus ir užrašykite GPS koordinates.\n4. Įrašykite išvadas į atitikties žurnalą.",
  "task.buffer_strips.penalty": "Trūkstamos arba netinkamos apsaugos juostos gali sumažinti tiesiogines CAP išmokas 3–5%. Pasikartojantis pažeidimas didina nuobaudą kitais metais.",
  "task.soil_cover.title": "Dokumentuokite žiemos dirvos dangą",
  "task.soil_cover.guidance": "Užfiksuokite, kur palaikoma dirvos danga, ir užrašykite augalų planą.",
  "task.soil_cover.what_to_do": "1. Po derliaus apžiūrėkite visus ariamus laukus.\n2. Pažymėkite laukus su žieminiu augalu, tarpine kultūra ar natūralia augmenija.\n3. Užtikrinkite ne mažesnę nei 80% dirvos dangą lapkričio 1 – vasario 15 d.\n4. Įkelkite nuotraukų įrodymus arba pridėkite pastabas.",
  "task.soil_cover.penalty": "GAEC 6 reikalauja minimalios dirvos dangos didesniuose ūkiuose. Pažeidimas — didelės rizikos išvada, gali sumažinti plotines išmokas 5–10%.",
  "task.manure_log.title": "Atnaujinkite mėšlo saugojimo žurnalą",
  "task.manure_log.guidance": "Užfiksuokite saugojimo patikras ir tręšimo langus aiškia kalba.",
  "task.manure_log.what_to_do": "1. Užfiksuokite dabartinį tūrį kiekvienoje mėšlo saugykloje.\n2. Patvirtinkite, kad uždarais laikotarpiais (spalio 1 – vasario 1) tręšimas nevyko.\n3. Užrašykite datą, objekto ID ir atsakingo asmens vardą.\n4. Patikrinkite, ar nėra nutekėjimo požymių, ir užrašykite rezultatą.",
  "task.manure_log.penalty": "SMR 1 (Nitratų direktyva) reikalauja tikslių įrašų. Pažeidimai gali sumažinti išmokas iki 10% ir sukelti vietos patikrinimą.",
  "task.organic_record.title": "Tvarkykite ekologinės sertifikacijos įrašus",
  "task.organic_record.guidance": "Įvedimų ir laukų istorijos įrašai turi atitikti jūsų sertifikavimo įstaigos auditą.",
  "task.organic_record.what_to_do": "1. Atnaujinkite įvedimų žurnalą su šio sezono sėklomis, kompostu ar pataisomis.\n2. Patvirtinkite, kad sertifikuotuose laukuose nenaudotos draudžiamos medžiagos.\n3. Pridėkite naujausią sertifikato kopiją prie profilio.\n4. Patikrinkite, ar laukų ribos atitinka sertifikuotą žemėlapį.",
  "task.organic_record.penalty": "Sertifikato praradimas panaikina ekologinę priemoką ir gali reikalauti grąžinti šiais metais jau gautas išmokas.",
  "task.nitrate_plan.title": "Pateikite nitratų zonos tręšimo planą",
  "task.nitrate_plan.guidance": "Ūkiai pažeidžiamoje nitratams zonoje (NVZ) privalo pateikti metinį planą prieš tręšimo langą.",
  "task.nitrate_plan.what_to_do": "1. Apskaičiuokite N normas kiekvienam laukui.\n2. Laikykitės NVZ uždaro tręšimo laikotarpio.\n3. Pateikite planą regionų institucijai iki kovo 1 d.\n4. Saugokite pateikimo įrodymą audito žurnale.",
  "task.nitrate_plan.penalty": "NVZ plano nepateikimas yra kryžminės atitikties pažeidimas: 3% bazinis sumažinimas, dvigubinamas pakartotinai, su galima aplinkosaugos bauda.",
  "task.crop_rotation_plan.title": "Patvirtinkite sėjomainos planą",
  "task.crop_rotation_plan.guidance": "GAEC 7 reikalauja dokumentuotos sėjomainos ariamuose ūkiuose virš hektarų ribos.",
  "task.crop_rotation_plan.what_to_do": "1. Surašykite kiekvieno lauko pagrindinį augalą už paskutinius du sezonus.\n2. Pažymėkite laukus, kuriuose tas pats augalas augintas dvejus metus iš eilės.\n3. Suplanuokite kitą pagrindinį augalą arba tarpinę kultūrą tokiuose laukuose.\n4. Išsaugokite planą kaip audito įrašo dalį.",
  "task.crop_rotation_plan.penalty": "GAEC 7 pažeidimas sumažina tiesiogines išmokas 1–3% ir antrais metais iš eilės laikomas pakartotiniu.",
};

const DICTIONARIES: Record<AppLanguage, Dictionary> = { en: EN, lt: LT };

export const EN_KEYS = Object.keys(EN) as I18nKey[];
export const LT_KEYS = Object.keys(LT) as I18nKey[];
export const SUPPORTED_LANGUAGES: AppLanguage[] = ["en", "lt"];

export function t(key: I18nKey, lang: AppLanguage): string {
  const val = DICTIONARIES[lang]?.[key];
  if (!val) return `[MISSING: ${key}]`;
  return val;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile-app && npx jest lib/i18n/__tests__/i18n.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/i18n.ts mobile-app/lib/i18n/__tests__/i18n.test.ts
git commit -m "feat(i18n): add task.* keys with full LT translations + parity test"
```

---

## Task 3: getInitialLanguage from expo-localization

**Files:**
- Modify: `mobile-app/lib/i18n.ts`
- Create: `mobile-app/lib/i18n/__tests__/locale.test.ts`

- [ ] **Step 1: Write failing test**

`mobile-app/lib/i18n/__tests__/locale.test.ts`:

```ts
import * as Localization from "expo-localization";
import { getInitialLanguage } from "@/lib/i18n";

describe("getInitialLanguage", () => {
  test("returns 'lt' when device locale is Lithuanian", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "lt", languageTag: "lt-LT" },
    ]);
    expect(getInitialLanguage()).toBe("lt");
  });

  test("returns 'en' when device locale is English", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "en", languageTag: "en-GB" },
    ]);
    expect(getInitialLanguage()).toBe("en");
  });

  test("falls back to 'en' for unsupported locales", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "de", languageTag: "de-DE" },
    ]);
    expect(getInitialLanguage()).toBe("en");
  });

  test("falls back to 'en' when getLocales returns empty", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([]);
    expect(getInitialLanguage()).toBe("en");
  });
});
```

Update `jest.setup.ts` mock to be a jest.fn:

```ts
import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en", languageTag: "en-US" }]),
}));
```

- [ ] **Step 2: Verify it fails**

Run: `cd mobile-app && npx jest lib/i18n/__tests__/locale.test.ts`
Expected: FAIL — `getInitialLanguage` is not exported.

- [ ] **Step 3: Add getInitialLanguage**

Append to `mobile-app/lib/i18n.ts`:

```ts
import * as Localization from "expo-localization";

export function getInitialLanguage(): AppLanguage {
  const locales = Localization.getLocales();
  const first = locales?.[0];
  const code = first?.languageCode;
  if (code === "lt") return "lt";
  if (code === "en") return "en";
  return "en";
}
```

- [ ] **Step 4: Verify pass**

Run: `cd mobile-app && npx jest lib/i18n/__tests__/locale.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/i18n.ts mobile-app/lib/i18n/__tests__/locale.test.ts mobile-app/jest.setup.ts
git commit -m "feat(i18n): add getInitialLanguage backed by expo-localization"
```

---

## Task 4: check-i18n script

**Files:**
- Create: `mobile-app/scripts/check-i18n.ts`
- Create: `mobile-app/scripts/__tests__/check-i18n.test.ts`

- [ ] **Step 1: Write failing test**

`mobile-app/scripts/__tests__/check-i18n.test.ts`:

```ts
import { findReferencedKeys, validate, DictSnapshot } from "@/scripts/check-i18n";

describe("check-i18n", () => {
  test("findReferencedKeys extracts t('key', lang) calls", () => {
    const src = `t("dashboard.welcome", language); t('reports.title', lang);`;
    expect(findReferencedKeys(src).sort()).toEqual(["dashboard.welcome", "reports.title"]);
  });

  test("validate returns empty when dictionaries match referenced keys", () => {
    const snap: DictSnapshot = {
      en: ["a.key", "b.key"],
      lt: ["a.key", "b.key"],
    };
    expect(validate(snap, ["a.key", "b.key"])).toEqual([]);
  });

  test("validate detects missing key in lt", () => {
    const snap: DictSnapshot = { en: ["a", "b"], lt: ["a"] };
    const errs = validate(snap, ["a", "b"]);
    expect(errs.some((e) => e.includes("lt") && e.includes("b"))).toBe(true);
  });

  test("validate detects key referenced but missing from both", () => {
    const snap: DictSnapshot = { en: ["a"], lt: ["a"] };
    const errs = validate(snap, ["a", "ghost"]);
    expect(errs.some((e) => e.includes("ghost"))).toBe(true);
  });

  test("validate detects dictionary parity mismatch", () => {
    const snap: DictSnapshot = { en: ["a", "extra.en"], lt: ["a"] };
    const errs = validate(snap, ["a"]);
    expect(errs.some((e) => e.includes("extra.en"))).toBe(true);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd mobile-app && npx jest scripts/__tests__/check-i18n.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement script**

`mobile-app/scripts/check-i18n.ts`:

```ts
import * as fs from "fs";
import * as path from "path";

export type DictSnapshot = { en: string[]; lt: string[] };

const SCAN_DIRS = ["app", "components", "context", "lib"];
const T_CALL_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*,/g;

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

export function findReferencedKeys(source: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(T_CALL_RE.source, T_CALL_RE.flags);
  while ((m = re.exec(source))) found.add(m[1]);
  return [...found];
}

export function validate(snap: DictSnapshot, referenced: string[]): string[] {
  const errors: string[] = [];
  const enSet = new Set(snap.en);
  const ltSet = new Set(snap.lt);
  for (const k of referenced) {
    if (!enSet.has(k)) errors.push(`Key "${k}" referenced but missing from en dictionary.`);
    if (!ltSet.has(k)) errors.push(`Key "${k}" referenced but missing from lt dictionary.`);
  }
  for (const k of snap.en) if (!ltSet.has(k)) errors.push(`Parity mismatch: "${k}" in en but not lt.`);
  for (const k of snap.lt) if (!enSet.has(k)) errors.push(`Parity mismatch: "${k}" in lt but not en.`);
  return errors;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));
  const referenced = new Set<string>();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const k of findReferencedKeys(src)) referenced.add(k);
  }
  const { EN_KEYS, LT_KEYS } = require("../lib/i18n");
  const errors = validate({ en: EN_KEYS, lt: LT_KEYS }, [...referenced]);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log(`OK: ${referenced.size} keys referenced, ${EN_KEYS.length} in each dict.`);
}

if (require.main === module) main();
```

- [ ] **Step 4: Verify unit tests pass**

Run: `cd mobile-app && npx jest scripts/__tests__/check-i18n.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the script end-to-end**

Run: `cd mobile-app && npx ts-node --transpile-only scripts/check-i18n.ts`
Expected: prints `OK: N keys referenced, M in each dict.` and exits 0.

- [ ] **Step 6: Verify `npm run check` wires it**

Run: `cd mobile-app && npm run check`
Expected: runs `check-i18n` then jest; exits 0.

- [ ] **Step 7: Commit**

```bash
git add mobile-app/scripts/check-i18n.ts mobile-app/scripts/__tests__/check-i18n.test.ts
git commit -m "feat(i18n): add check-i18n parity + missing-key guard wired into npm run check"
```

---

## Task 5: AppContext uses getInitialLanguage on first launch + language persistence integration tests

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`
- Create: `mobile-app/__tests__/language-persistence.test.tsx`

- [ ] **Step 1: Write failing integration test**

`mobile-app/__tests__/language-persistence.test.tsx`:

```tsx
import React from "react";
import { Text } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import { AppProvider, useApp } from "@/context/AppContext";

function Probe() {
  const { language, setLanguage, login, logout, isHydrated } = useApp();
  return (
    <>
      <Text testID="lang">{isHydrated ? language : "..."}</Text>
      <Text testID="set-lt" onPress={() => setLanguage("lt")}>set-lt</Text>
      <Text testID="login" onPress={() => login("farmer@pdp.test", "harvest123")}>login</Text>
      <Text testID="logout" onPress={() => logout()}>logout</Text>
    </>
  );
}

describe("language persistence", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageCode: "lt", languageTag: "lt-LT" },
    ]);
  });

  test("first launch picks device locale (lt)", async () => {
    const { getByTestId } = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
  });

  test("selected language survives restart", async () => {
    const a = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(a.getByTestId("lang").props.children).toBe("lt"));
    await act(async () => { a.getByTestId("set-lt").props.onPress(); });
    a.unmount();

    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageCode: "en", languageTag: "en-US" },
    ]);
    const b = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(b.getByTestId("lang").props.children).toBe("lt"));
  });

  test("selected language survives logout + login", async () => {
    const { getByTestId } = render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
    await act(async () => { getByTestId("login").props.onPress(); });
    await act(async () => { getByTestId("logout").props.onPress(); });
    await act(async () => { getByTestId("login").props.onPress(); });
    await waitFor(() => expect(getByTestId("lang").props.children).toBe("lt"));
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd mobile-app && npx jest __tests__/language-persistence.test.tsx`
Expected: FAIL — first launch returns DEFAULT_LANGUAGE, not device locale.

- [ ] **Step 3: Update AppContext hydration**

In `mobile-app/context/AppContext.tsx`:

Replace the import line:
```tsx
import { loadState, saveState } from "@/lib/storage";
```
with:
```tsx
import { loadState, saveState } from "@/lib/storage";
import { getInitialLanguage } from "@/lib/i18n";
```

Replace the hydrate effect body to seed language from device locale when no persisted value exists:

```tsx
useEffect(() => {
  async function hydrate() {
    const loaded = await loadState();
    const persistedLanguage = (loaded as AppState).language;
    const initialLanguage = persistedLanguage ?? getInitialLanguage();
    setState((prev) => ({
      ...prev,
      ...loaded,
      reminderOffsets: loaded.reminderOffsets ?? DEFAULT_REMINDER_OFFSETS,
      evidenceAttachments: loaded.evidenceAttachments ?? [],
      regulationChanges: loaded.regulationChanges ?? SEEDED_REGULATIONS,
      helpTickets: loaded.helpTickets ?? [],
      syncQueue: loaded.syncQueue ?? [],
      isOnline: loaded.isOnline ?? true,
      ocrExtractions: loaded.ocrExtractions ?? [],
      syncConflicts: loaded.syncConflicts ?? [],
      advisors: loaded.advisors ?? [],
      language: initialLanguage,
    }));
    setIsHydrated(true);
  }
  hydrate();
}, []);
```

Also ensure `loadState` returns `language: undefined` when nothing is persisted. Modify `mobile-app/lib/storage.ts` to handle first-launch correctly:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import { INITIAL_STATE } from "@/data/seed";
import { AppState } from "@/types";

const STORAGE_KEY = "pdp-mobile-prototype-state";

export async function loadState(): Promise<Partial<AppState>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...INITIAL_STATE, language: undefined as any };
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return { ...INITIAL_STATE, language: undefined as any };
  }
}

export async function saveState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
```

- [ ] **Step 4: Verify pass**

Run: `cd mobile-app && npx jest __tests__/language-persistence.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/context/AppContext.tsx mobile-app/lib/storage.ts mobile-app/__tests__/language-persistence.test.tsx
git commit -m "feat(i18n): seed language from device locale on first launch; persist across restart + logout"
```

---

## Task 6: Personalization rule engine — evaluate

**Files:**
- Create: `mobile-app/lib/personalization/evaluate.ts`
- Create: `mobile-app/lib/personalization/__tests__/evaluate.test.ts`

- [ ] **Step 1: Write failing test**

`mobile-app/lib/personalization/__tests__/evaluate.test.ts`:

```ts
import { evaluateRules, Rule } from "@/lib/personalization/evaluate";

const profile = {
  hectares: "25",
  farmingType: "Dairy",
  livestockCount: "40",
  region: "NVZ-1",
  organicCertified: true,
} as Record<string, unknown>;

const rules: Rule[] = [
  { taskId: "soil-cover", when: [{ field: "hectares", op: ">=", value: 20 }] },
  { taskId: "small-only",  when: [{ field: "hectares", op: "<=", value: 5  }] },
  { taskId: "exact-dairy", when: [{ field: "farmingType", op: "==", value: "Dairy" }] },
  { taskId: "not-arable",  when: [{ field: "farmingType", op: "!=", value: "Arable" }] },
  { taskId: "nvz",         when: [{ field: "region", op: "in", value: ["NVZ-1", "NVZ-2"] }] },
  { taskId: "organic",     when: [{ field: "organicCertified", op: "==", value: true }] },
  { taskId: "unconditional" },
  { taskId: "and-rule",    when: [{ field: "hectares", op: ">=", value: 10 }, { field: "farmingType", op: "==", value: "Dairy" }] },
  { taskId: "or-rule",     when: [{ field: "hectares", op: ">=", value: 1000 }] },
  { taskId: "or-rule",     when: [{ field: "farmingType", op: "==", value: "Dairy" }] },
];

describe("evaluateRules", () => {
  test("returns matching task ids", () => {
    const ids = evaluateRules(profile, rules);
    expect(ids.has("soil-cover")).toBe(true);
    expect(ids.has("small-only")).toBe(false);
    expect(ids.has("exact-dairy")).toBe(true);
    expect(ids.has("not-arable")).toBe(true);
    expect(ids.has("nvz")).toBe(true);
    expect(ids.has("organic")).toBe(true);
    expect(ids.has("unconditional")).toBe(true);
    expect(ids.has("and-rule")).toBe(true);
    expect(ids.has("or-rule")).toBe(true);
  });

  test("coerces numeric strings for >= and <=", () => {
    const ids = evaluateRules({ hectares: "3" }, [
      { taskId: "small", when: [{ field: "hectares", op: "<=", value: 5 }] },
      { taskId: "big", when: [{ field: "hectares", op: ">=", value: 5 }] },
    ]);
    expect(ids.has("small")).toBe(true);
    expect(ids.has("big")).toBe(false);
  });

  test("missing field never matches numeric ops", () => {
    const ids = evaluateRules({}, [
      { taskId: "x", when: [{ field: "hectares", op: ">=", value: 1 }] },
    ]);
    expect(ids.has("x")).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd mobile-app && npx jest lib/personalization/__tests__/evaluate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement evaluate.ts**

`mobile-app/lib/personalization/evaluate.ts`:

```ts
export type Op = ">=" | "<=" | "==" | "!=" | "in";

export type Clause = {
  field: string;
  op: Op;
  value: number | string | boolean | (number | string)[];
};

export type Rule = {
  taskId: string;
  when?: Clause[];
};

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function clauseMatches(profile: Record<string, unknown>, c: Clause): boolean {
  const raw = profile[c.field];
  switch (c.op) {
    case ">=": {
      const n = toNumber(raw);
      return n !== null && typeof c.value === "number" && n >= c.value;
    }
    case "<=": {
      const n = toNumber(raw);
      return n !== null && typeof c.value === "number" && n <= c.value;
    }
    case "==":
      return raw === c.value;
    case "!=":
      return raw !== c.value;
    case "in":
      return Array.isArray(c.value) && (c.value as (number | string)[]).includes(raw as never);
    default:
      return false;
  }
}

function ruleMatches(profile: Record<string, unknown>, rule: Rule): boolean {
  if (!rule.when || rule.when.length === 0) return true;
  return rule.when.every((c) => clauseMatches(profile, c));
}

export function evaluateRules(profile: Record<string, unknown>, rules: Rule[]): Set<string> {
  const out = new Set<string>();
  for (const r of rules) if (ruleMatches(profile, r)) out.add(r.taskId);
  return out;
}
```

- [ ] **Step 4: Verify pass**

Run: `cd mobile-app && npx jest lib/personalization/__tests__/evaluate.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/lib/personalization/evaluate.ts mobile-app/lib/personalization/__tests__/evaluate.test.ts
git commit -m "feat(personalization): add evaluateRules with >=,<=,==,!=,in operators"
```

---

## Task 7: Content files — tasks.json, rules.json, README

**Files:**
- Create: `mobile-app/content/tasks.json`
- Create: `mobile-app/content/rules.json`
- Create: `mobile-app/content/README.md`
- Modify: `mobile-app/types.ts`

- [ ] **Step 1: Add profile extensions to types**

Modify `mobile-app/types.ts`:

Replace the `FarmProfile` type with:

```ts
export type FarmProfile = {
  farmName: string;
  farmerName: string;
  location: string;
  hectares: string;
  farmingType: "Arable" | "Dairy" | "Mixed" | "";
  livestockCount: string;
  organicCertified?: boolean;
  inNitrateZone?: boolean;
  lastSyncedAt?: string;
};
```

Add two new audit event types — replace the `AuditEventType` union with:

```ts
export type AuditEventType =
  | "login" | "logout"
  | "profile.save" | "profile.sync"
  | "report.duplicate" | "report.submit" | "report.create"
  | "report.draft_save" | "report.sync"
  | "evidence.upload" | "evidence.remove"
  | "ticket.submit"
  | "regulation.read" | "regulation.opened"
  | "ocr.prefill" | "ocr.applied"
  | "sync.conflict" | "sync.conflict_resolve"
  | "advisor.invite" | "advisor.revoke"
  | "audit.export";
```

- [ ] **Step 2: Create tasks.json**

`mobile-app/content/tasks.json`:

```json
[
  {
    "id": "buffer-strips",
    "titleKey": "task.buffer_strips.title",
    "guidanceKey": "task.buffer_strips.guidance",
    "whatToDoKey": "task.buffer_strips.what_to_do",
    "penaltyKey": "task.buffer_strips.penalty",
    "source": "Baseline CAP requirement",
    "riskLevel": "medium",
    "dueDate": "2026-04-15"
  },
  {
    "id": "soil-cover",
    "titleKey": "task.soil_cover.title",
    "guidanceKey": "task.soil_cover.guidance",
    "whatToDoKey": "task.soil_cover.what_to_do",
    "penaltyKey": "task.soil_cover.penalty",
    "source": "Large holding rule",
    "riskLevel": "high",
    "dueDate": "2026-03-20"
  },
  {
    "id": "manure-log",
    "titleKey": "task.manure_log.title",
    "guidanceKey": "task.manure_log.guidance",
    "whatToDoKey": "task.manure_log.what_to_do",
    "penaltyKey": "task.manure_log.penalty",
    "source": "Livestock-specific rule",
    "riskLevel": "high",
    "dueDate": "2026-03-18"
  },
  {
    "id": "organic-record",
    "titleKey": "task.organic_record.title",
    "guidanceKey": "task.organic_record.guidance",
    "whatToDoKey": "task.organic_record.what_to_do",
    "penaltyKey": "task.organic_record.penalty",
    "source": "Organic certification scheme",
    "riskLevel": "medium",
    "dueDate": "2026-05-01"
  },
  {
    "id": "nitrate-plan",
    "titleKey": "task.nitrate_plan.title",
    "guidanceKey": "task.nitrate_plan.guidance",
    "whatToDoKey": "task.nitrate_plan.what_to_do",
    "penaltyKey": "task.nitrate_plan.penalty",
    "source": "Nitrate Vulnerable Zone (NVZ) rule",
    "riskLevel": "high",
    "dueDate": "2026-03-01"
  },
  {
    "id": "crop-rotation-plan",
    "titleKey": "task.crop_rotation_plan.title",
    "guidanceKey": "task.crop_rotation_plan.guidance",
    "whatToDoKey": "task.crop_rotation_plan.what_to_do",
    "penaltyKey": "task.crop_rotation_plan.penalty",
    "source": "GAEC 7",
    "riskLevel": "medium",
    "dueDate": "2026-04-30"
  }
]
```

- [ ] **Step 3: Create rules.json**

`mobile-app/content/rules.json`:

```json
[
  { "taskId": "buffer-strips" },

  { "taskId": "soil-cover", "when": [{ "field": "hectares", "op": ">=", "value": 20 }] },

  { "taskId": "manure-log", "when": [{ "field": "farmingType", "op": "==", "value": "Dairy" }] },
  { "taskId": "manure-log", "when": [{ "field": "livestockCount", "op": ">=", "value": 1 }] },

  { "taskId": "organic-record", "when": [{ "field": "organicCertified", "op": "==", "value": true }] },

  { "taskId": "nitrate-plan", "when": [{ "field": "inNitrateZone", "op": "==", "value": true }] },

  { "taskId": "crop-rotation-plan", "when": [
    { "field": "hectares", "op": ">=", "value": 10 },
    { "field": "farmingType", "op": "in", "value": ["Arable", "Mixed"] }
  ]},

  { "taskId": "manure-log", "when": [
    { "field": "livestockCount", "op": ">=", "value": 20 },
    { "field": "hectares", "op": "<=", "value": 50 }
  ]}
]
```

- [ ] **Step 4: Create README**

`mobile-app/content/README.md`:

```markdown
# Content directory

Drives compliance-task personalization without code changes.

## Files

- `tasks.json` — task definitions. Each entry has `id`, `titleKey`, `guidanceKey`, `whatToDoKey`, `penaltyKey` (all `task.*` i18n keys resolved at runtime via `t()`), plus `source`, `riskLevel`, and `dueDate`.
- `rules.json` — selection rules. Each entry has a `taskId` and an optional `when` array.

## Rule grammar

A rule fires when every clause in its `when` array matches the active `FarmProfile`. A rule with no `when` always fires.

Multiple rules sharing one `taskId` are ORed: the task is included if any of them fires.

### Operators

| op   | meaning                            | value type       |
|------|------------------------------------|------------------|
| `>=` | numeric greater-than-or-equal      | number           |
| `<=` | numeric less-than-or-equal         | number           |
| `==` | strict equality                    | string/num/bool  |
| `!=` | strict inequality                  | string/num/bool  |
| `in` | value is in the supplied array     | array of literals |

Numeric profile fields stored as strings (e.g. `hectares: "25"`) are coerced to numbers for `>=` / `<=`. Missing or non-numeric fields never match numeric operators. Booleans must be exact for `==`/`!=`.

### Adding a new task

1. Add a `task.<id>.{title,guidance,what_to_do,penalty}` quadruple to `lib/i18n.ts` in both `en` and `lt`.
2. Add a `tasks.json` entry referencing those keys.
3. Add one or more `rules.json` entries to select the task for the right profiles.
4. Run `npm run check` to verify i18n parity and tests.
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/content mobile-app/types.ts
git commit -m "feat(content): add tasks.json, rules.json, and rule-grammar README"
```

---

## Task 8: Personalization loader + deriveTasks rewire

**Files:**
- Create: `mobile-app/lib/personalization/load.ts`
- Create: `mobile-app/lib/personalization/index.ts`
- Create: `mobile-app/lib/personalization/__tests__/load.test.ts`
- Modify: `mobile-app/lib/tasks.ts`

- [ ] **Step 1: Write failing test**

`mobile-app/lib/personalization/__tests__/load.test.ts`:

```ts
import { loadTasks } from "@/lib/personalization/load";
import { FarmProfile } from "@/types";

const baseProfile: FarmProfile = {
  farmName: "F", farmerName: "X", location: "Y",
  hectares: "25", farmingType: "Dairy", livestockCount: "10",
};

describe("loadTasks", () => {
  test("returns ComplianceTask shape with resolved i18n strings (en)", () => {
    const tasks = loadTasks(baseProfile, "en");
    const buffer = tasks.find((t) => t.id === "buffer-strips");
    expect(buffer).toBeDefined();
    expect(buffer!.title).toBe("Confirm field buffer strips");
    expect(buffer!.guidance.length).toBeGreaterThan(5);
    expect(buffer!.penaltyExplanation.length).toBeGreaterThan(5);
    expect(["Not started", "Overdue", "In progress", "Done"]).toContain(buffer!.status);
  });

  test("resolves LT strings when language is lt", () => {
    const tasks = loadTasks(baseProfile, "lt");
    const buffer = tasks.find((t) => t.id === "buffer-strips");
    expect(buffer!.title).toBe("Patvirtinkite laukų apsaugines juostas");
  });

  test("includes soil-cover at >=20 ha", () => {
    expect(loadTasks(baseProfile, "en").some((t) => t.id === "soil-cover")).toBe(true);
  });

  test("excludes soil-cover below threshold", () => {
    expect(loadTasks({ ...baseProfile, hectares: "5" }, "en").some((t) => t.id === "soil-cover")).toBe(false);
  });

  test("organic flag selects organic-record", () => {
    const tasks = loadTasks({ ...baseProfile, organicCertified: true }, "en");
    expect(tasks.some((t) => t.id === "organic-record")).toBe(true);
  });

  test("inNitrateZone selects nitrate-plan", () => {
    const tasks = loadTasks({ ...baseProfile, inNitrateZone: true }, "en");
    expect(tasks.some((t) => t.id === "nitrate-plan")).toBe(true);
  });

  test("Arable + hectares>=10 selects crop-rotation-plan via in operator", () => {
    const tasks = loadTasks({ ...baseProfile, farmingType: "Arable", hectares: "15", livestockCount: "0" }, "en");
    expect(tasks.some((t) => t.id === "crop-rotation-plan")).toBe(true);
  });

  test("Dairy selects manure-log via OR rule", () => {
    const tasks = loadTasks({ ...baseProfile, livestockCount: "0" }, "en");
    expect(tasks.some((t) => t.id === "manure-log")).toBe(true);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd mobile-app && npx jest lib/personalization/__tests__/load.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement load.ts**

`mobile-app/lib/personalization/load.ts`:

```ts
import { AppLanguage, ComplianceTask, FarmProfile, RiskLevel, TaskStatus } from "@/types";
import { I18nKey, t } from "@/lib/i18n";
import { evaluateRules, Rule } from "@/lib/personalization/evaluate";
import tasksJson from "@/content/tasks.json";
import rulesJson from "@/content/rules.json";

type TaskRecord = {
  id: string;
  titleKey: I18nKey;
  guidanceKey: I18nKey;
  whatToDoKey: I18nKey;
  penaltyKey: I18nKey;
  source: string;
  riskLevel: RiskLevel;
  dueDate: string;
};

function toStatus(date: string): TaskStatus {
  return new Date(date).getTime() < Date.now() ? "Overdue" : "Not started";
}

export function loadTasks(profile: FarmProfile, language: AppLanguage): ComplianceTask[] {
  const matched = evaluateRules(profile as unknown as Record<string, unknown>, rulesJson as Rule[]);
  const records = (tasksJson as TaskRecord[]).filter((r) => matched.has(r.id));
  return records.map((r) => ({
    id: r.id,
    title: t(r.titleKey, language),
    guidance: t(r.guidanceKey, language),
    whatToDo: t(r.whatToDoKey, language),
    penaltyExplanation: t(r.penaltyKey, language),
    dueDate: r.dueDate,
    status: toStatus(r.dueDate),
    source: r.source,
    riskLevel: r.riskLevel,
  }));
}
```

- [ ] **Step 4: Add index barrel**

`mobile-app/lib/personalization/index.ts`:

```ts
export { evaluateRules } from "./evaluate";
export type { Rule, Clause, Op } from "./evaluate";
export { loadTasks } from "./load";
```

- [ ] **Step 5: Enable JSON imports**

Modify `mobile-app/tsconfig.json` only if `resolveJsonModule` is not enabled. Open it; if missing, add `"resolveJsonModule": true, "esModuleInterop": true` to `compilerOptions`.

- [ ] **Step 6: Rewire deriveTasks**

Replace `mobile-app/lib/tasks.ts` entirely with:

```ts
import { AppLanguage, ComplianceTask, FarmProfile } from "@/types";
import { loadTasks } from "@/lib/personalization";

export function deriveTasks(profile: FarmProfile, language: AppLanguage = "en"): ComplianceTask[] {
  return loadTasks(profile, language);
}
```

- [ ] **Step 7: Update call sites that previously passed only profile**

Search call sites of `deriveTasks(`. Update each to pass `language`:

Run: `cd mobile-app && grep -rn "deriveTasks(" app context components lib`

For every match in `.tsx` files that has access to `language` from `useApp()`, change `deriveTasks(profile)` to `deriveTasks(profile, language)`. Specifically:

- `mobile-app/app/(tabs)/regulations.tsx`: change `const tasks = deriveTasks(farmProfile);` to `const tasks = deriveTasks(farmProfile, language);`.
- `mobile-app/app/(tabs)/index.tsx`: if it calls `deriveTasks(farmProfile)` likewise pass `language`.
- `mobile-app/app/(tabs)/calendar.tsx`: same change.

(If any call site has no `language` in scope, add `const { language } = useApp();` and pass it.)

- [ ] **Step 8: Verify pass**

Run: `cd mobile-app && npx jest lib/personalization`
Expected: PASS, 11 tests (3 from evaluate + 8 from load).

- [ ] **Step 9: Commit**

```bash
git add mobile-app/lib/personalization mobile-app/lib/tasks.ts mobile-app/tsconfig.json mobile-app/app
git commit -m "feat(personalization): rewire deriveTasks through content/{tasks,rules}.json loader"
```

---

## Task 9: OCR deterministic mock

**Files:**
- Create: `mobile-app/lib/ocr/extract.ts`
- Create: `mobile-app/lib/ocr/index.ts`
- Create: `mobile-app/lib/ocr/__tests__/extract.test.ts`
- Modify: `mobile-app/types.ts`

- [ ] **Step 1: Extend types**

Add to `mobile-app/types.ts`:

```ts
export type OcrFieldValue = { value: string; confidence: number };

export type ExtractionResult = {
  documentType: OcrFieldValue;
  documentDate: OcrFieldValue;
  referenceId: OcrFieldValue;
  sourceFileName: string;
};

export type OcrFieldSource = "extracted" | "edited";

export type OcrApplyMap = {
  documentType: OcrFieldSource;
  documentDate: OcrFieldSource;
  referenceId: OcrFieldSource;
};
```

(Leave the legacy `OcrExtraction` / `OcrConfidence` types in place — they remain used by `applyOcrExtraction` until callers migrate.)

- [ ] **Step 2: Write failing test**

`mobile-app/lib/ocr/__tests__/extract.test.ts`:

```ts
import { extractFromFile } from "@/lib/ocr/extract";

describe("extractFromFile", () => {
  test("deterministic for identical fileName", async () => {
    const a = await extractFromFile("file:///a.pdf", "permits-2026.pdf");
    const b = await extractFromFile("file:///b.pdf", "permits-2026.pdf");
    expect(a).toEqual(b);
  });

  test("different fileName produces different content", async () => {
    const a = await extractFromFile("file:///a.pdf", "permits-2026.pdf");
    const b = await extractFromFile("file:///b.pdf", "invoice-2026.pdf");
    expect(a).not.toEqual(b);
  });

  test("confidences are in [0,1]", async () => {
    const r = await extractFromFile("file:///x", "any.pdf");
    for (const f of [r.documentType, r.documentDate, r.referenceId]) {
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });

  test("each document yields exactly one low-confidence field (<0.7) and the rest >=0.7", async () => {
    for (const name of ["permits-2026.pdf", "invoice-2026.pdf", "field-notes-q1.pdf", "soil-test.pdf"]) {
      const r = await extractFromFile(`file:///${name}`, name);
      const conf = [r.documentType.confidence, r.documentDate.confidence, r.referenceId.confidence];
      const low = conf.filter((c) => c < 0.7).length;
      const high = conf.filter((c) => c >= 0.7).length;
      expect(low).toBe(1);
      expect(high).toBe(2);
    }
  });

  test("sourceFileName echoed back", async () => {
    const r = await extractFromFile("file:///x", "foo.pdf");
    expect(r.sourceFileName).toBe("foo.pdf");
  });
});
```

- [ ] **Step 3: Verify fail**

Run: `cd mobile-app && npx jest lib/ocr`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement extract.ts**

`mobile-app/lib/ocr/extract.ts`:

```ts
import { ExtractionResult } from "@/types";

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOC_TYPES = ["CAP Payment Application", "Field Inspection Report", "Manure Spreading Log", "Soil Test Result"];

function pad(n: number, w: number) { return String(n).padStart(w, "0"); }

export async function extractFromFile(uri: string, fileName: string): Promise<ExtractionResult> {
  const seed = hash(fileName);
  const r = mulberry32(seed);

  const docType = DOC_TYPES[Math.floor(r() * DOC_TYPES.length)];
  const year = 2024 + Math.floor(r() * 3);
  const month = 1 + Math.floor(r() * 12);
  const day = 1 + Math.floor(r() * 28);
  const refNum = Math.floor(r() * 9000) + 1000;
  const date = `${year}-${pad(month, 2)}-${pad(day, 2)}`;
  const ref = `REF-${year}-${refNum}`;

  // Pick exactly one low-confidence field index 0..2.
  const lowIndex = Math.floor(r() * 3);
  function conf(i: number): number {
    if (i === lowIndex) return Math.round((0.4 + r() * 0.25) * 100) / 100; // 0.40 - 0.65
    return Math.round((0.78 + r() * 0.2) * 100) / 100;                     // 0.78 - 0.98
  }

  return {
    documentType: { value: docType, confidence: conf(0) },
    documentDate: { value: date, confidence: conf(1) },
    referenceId: { value: ref, confidence: conf(2) },
    sourceFileName: fileName,
  };
}
```

- [ ] **Step 5: Barrel**

`mobile-app/lib/ocr/index.ts`:

```ts
export { extractFromFile } from "./extract";
```

- [ ] **Step 6: Verify pass**

Run: `cd mobile-app && npx jest lib/ocr`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add mobile-app/lib/ocr mobile-app/types.ts
git commit -m "feat(ocr): deterministic seeded extract mock with one low-confidence field per doc"
```

---

## Task 10: AppContext.applyOcrExtractionV2 with per-field source map

**Files:**
- Modify: `mobile-app/context/AppContext.tsx`

- [ ] **Step 1: Add new context method**

In `mobile-app/context/AppContext.tsx`:

1. Add to the imports from `@/types`: `ExtractionResult, OcrApplyMap` (alongside existing `OcrExtraction`).

2. Add to `AppContextValue`:

```tsx
applyOcrExtractionV2: (
  reportId: string,
  result: ExtractionResult,
  applied: { documentType: string; documentDate: string; referenceId: string },
  sourceMap: OcrApplyMap,
) => Promise<void>;
```

3. Implement the function inside `AppProvider` (next to `applyOcrExtraction`):

```tsx
async function applyOcrExtractionV2(
  reportId: string,
  result: ExtractionResult,
  applied: { documentType: string; documentDate: string; referenceId: string },
  sourceMap: OcrApplyMap,
) {
  const note = `[OCR] ${applied.documentType} (${applied.documentDate}) ref: ${applied.referenceId}`;
  setState((current) => ({
    ...current,
    reports: current.reports.map((report) =>
      report.id === reportId
        ? { ...report, notes: report.notes ? `${report.notes}\n${note}` : note }
        : report,
    ),
    ocrExtractions: [
      ...current.ocrExtractions,
      {
        documentType: applied.documentType,
        documentDate: applied.documentDate,
        referenceId: applied.referenceId,
        confidence:
          result.documentType.confidence < 0.7 ||
          result.documentDate.confidence < 0.7 ||
          result.referenceId.confidence < 0.7
            ? "low"
            : "high",
        sourceFileName: result.sourceFileName,
        appliedToReportId: reportId,
      },
    ],
  }));
  await appendLog(
    "ocr.applied",
    `OCR applied to report ${reportId} from "${result.sourceFileName}". Source map: ${JSON.stringify(sourceMap)}.`,
  );
}
```

4. Add `applyOcrExtractionV2` to the provider value object below `applyOcrExtraction`.

- [ ] **Step 2: Commit**

```bash
git add mobile-app/context/AppContext.tsx
git commit -m "feat(ocr): add applyOcrExtractionV2 with per-field source map and ocr.applied audit"
```

---

## Task 11: OCR review route /ocr-review/[reportId]

**Files:**
- Create: `mobile-app/app/ocr-review/[reportId].tsx`

- [ ] **Step 1: Create the screen**

`mobile-app/app/ocr-review/[reportId].tsx`:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { extractFromFile } from "@/lib/ocr";
import { ExtractionResult, OcrApplyMap } from "@/types";

export default function OcrReviewScreen() {
  const router = useRouter();
  const { reportId, uri, fileName } = useLocalSearchParams<{
    reportId: string;
    uri: string;
    fileName: string;
  }>();
  const { language, applyOcrExtractionV2 } = useApp();

  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [docType, setDocType] = useState("");
  const [docDate, setDocDate] = useState("");
  const [refId, setRefId] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!uri || !fileName) return;
    (async () => {
      const r = await extractFromFile(String(uri), String(fileName));
      setResult(r);
      setDocType(r.documentType.value);
      setDocDate(r.documentDate.value);
      setRefId(r.referenceId.value);
      setBusy(false);
    })();
  }, [uri, fileName]);

  async function handleApply() {
    if (!result || !reportId) return;
    const sourceMap: OcrApplyMap = {
      documentType: docType === result.documentType.value ? "extracted" : "edited",
      documentDate: docDate === result.documentDate.value ? "extracted" : "edited",
      referenceId: refId === result.referenceId.value ? "extracted" : "edited",
    };
    await applyOcrExtractionV2(
      String(reportId),
      result,
      { documentType: docType, documentDate: docDate, referenceId: refId },
      sourceMap,
    );
    router.replace("/(tabs)/reports");
  }

  function handleCancel() {
    router.back();
  }

  if (busy || !result) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color="#3f6a52" />
          <AppText tone="muted">{t("ocr.review_title", language)}…</AppText>
        </View>
      </Screen>
    );
  }

  const lowDocType = result.documentType.confidence < 0.7;
  const lowDocDate = result.documentDate.confidence < 0.7;
  const lowRefId = result.referenceId.confidence < 0.7;

  return (
    <Screen>
      <Card>
        <View style={styles.header}>
          <Ionicons name="scan-outline" size={18} color="#2a5a8a" />
          <AppText variant="subtitle">{t("ocr.review_title", language)}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {t("ocr.extracted_from", language)}: {result.sourceFileName}
        </AppText>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.document_type", language)}
            value={docType}
            onChangeText={setDocType}
            testID="field-documentType"
          />
          {lowDocType && (
            <View testID="badge-documentType-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.document_date", language)}
            value={docDate}
            onChangeText={setDocDate}
            testID="field-documentDate"
          />
          {lowDocDate && (
            <View testID="badge-documentDate-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.reference_id", language)}
            value={refId}
            onChangeText={setRefId}
            testID="field-referenceId"
          />
          {lowRefId && (
            <View testID="badge-referenceId-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <PrimaryButton label={t("ocr.confirm_apply", language)} onPress={handleApply} testID="apply" />
        <PrimaryButton label={t("ocr.cancel", language)} variant="ghost" onPress={handleCancel} testID="cancel" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 12, alignItems: "center", paddingTop: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldRow: { gap: 4 },
});
```

- [ ] **Step 2: Ensure Field and PrimaryButton accept testID**

Verify `mobile-app/components/Field.tsx` and `mobile-app/components/PrimaryButton.tsx` forward `testID`. If they don't, add a `testID?: string` prop and forward it to the underlying `TextInput` / `Pressable`.

- [ ] **Step 3: Commit**

```bash
git add mobile-app/app/ocr-review mobile-app/components/Field.tsx mobile-app/components/PrimaryButton.tsx
git commit -m "feat(ocr): add /ocr-review/[reportId] screen with editable fields and low-confidence badges"
```

---

## Task 12: Reports screen entry point uses SP2 picker + routes to /ocr-review

**Files:**
- Modify: `mobile-app/app/(tabs)/reports.tsx`

- [ ] **Step 1: Write integration test**

`mobile-app/__tests__/ocr-flow.test.tsx`:

```tsx
import React from "react";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}));

jest.mock("@/lib/evidence/picker", () => ({
  pickDocument: jest.fn(async () => ({ uri: "file:///doc.pdf", fileName: "permits-2026.pdf", sizeBytes: 1000, mimeType: "application/pdf" })),
}));

jest.mock("@/lib/evidence/storage", () => ({
  copyIntoAppDocs: jest.fn(async (uri: string) => uri.replace("file:///", "file:///app-docs/")),
}));

import { AppProvider } from "@/context/AppContext";
import ReportsScreen from "@/app/(tabs)/reports";

describe("OCR upload entry point", () => {
  beforeEach(() => mockPush.mockClear());

  test("Upload Document button picks file via SP2 picker then routes to /ocr-review/[reportId]", async () => {
    const { getByText, findByText } = render(<AppProvider><ReportsScreen /></AppProvider>);
    await waitFor(() => getByText(/Create New Report|Sukurti/));
    await act(async () => { fireEvent.press(getByText(/Create New Report|Sukurti/)); });
    const uploadBtn = await findByText(/Upload Document|Įkelti dokumentą/);
    await act(async () => { fireEvent.press(uploadBtn); });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/ocr-review/[reportId]",
          params: expect.objectContaining({
            fileName: "permits-2026.pdf",
            uri: expect.stringContaining("app-docs"),
          }),
        }),
      );
    });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd mobile-app && npx jest __tests__/ocr-flow.test.tsx`
Expected: FAIL — current Reports screen opens an inline panel, doesn't call router with `/ocr-review/[reportId]`.

- [ ] **Step 3: Update Reports screen**

In `mobile-app/app/(tabs)/reports.tsx`:

1. Add to the top-of-file imports:

```tsx
import { useRouter } from "expo-router";
import { pickDocument } from "@/lib/evidence/picker";
import { copyIntoAppDocs } from "@/lib/evidence/storage";
```

2. Inside `ReportsScreen`, after `const { ... } = useApp();`, add:

```tsx
const router = useRouter();
```

3. Replace the existing `handleUploadForOcr` function with:

```tsx
async function handleUploadForOcr() {
  if (!draft) {
    setMessage("Create or open a draft before uploading a document.");
    return;
  }
  const picked = await pickDocument();
  if (!picked) return;
  const internalUri = await copyIntoAppDocs(picked.uri, picked.fileName);
  router.push({
    pathname: "/ocr-review/[reportId]",
    params: { reportId: draft.id, uri: internalUri, fileName: picked.fileName },
  });
}
```

4. Remove the inline OCR panel rendering block (the entire `{showOcrReview && ocrForm && (...)}` block) and the now-unused state: `ocrForm`, `setOcrForm`, `showOcrReview`, `setShowOcrReview`, the old `simulateOcr` function, and `handleApplyOcr`.

- [ ] **Step 4: Verify pass**

Run: `cd mobile-app && npx jest __tests__/ocr-flow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/app/(tabs)/reports.tsx mobile-app/__tests__/ocr-flow.test.tsx
git commit -m "feat(ocr): route Upload Document through SP2 picker into /ocr-review/[reportId]"
```

---

## Task 13: Regulation feed deep links + regulation.opened audit event

**Files:**
- Modify: `mobile-app/app/(tabs)/regulations.tsx`
- Modify: `mobile-app/context/AppContext.tsx`
- Create: `mobile-app/app/tasks/[id].tsx`
- Create: `mobile-app/app/guidance/[topic].tsx`
- Create: `mobile-app/__tests__/regulation-link.test.tsx`

- [ ] **Step 1: Add openRegulation to context**

In `mobile-app/context/AppContext.tsx`:

1. Add to `AppContextValue`:

```tsx
openRegulation: (regulationId: string, target: { kind: "task" | "guidance"; id: string }) => Promise<void>;
```

2. Implement:

```tsx
async function openRegulation(
  regulationId: string,
  target: { kind: "task" | "guidance"; id: string },
) {
  setState((current) => ({
    ...current,
    regulationChanges: current.regulationChanges.map((r) =>
      r.id === regulationId ? { ...r, read: true } : r,
    ),
  }));
  await appendLog(
    "regulation.opened",
    `Opened regulation ${regulationId} -> ${target.kind}/${target.id}.`,
  );
}
```

3. Add `openRegulation` to the provider value.

- [ ] **Step 2: Create destination stub screens**

`mobile-app/app/tasks/[id].tsx`:

```tsx
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { farmProfile, language } = useApp();
  const task = deriveTasks(farmProfile, language).find((t) => t.id === String(id));
  return (
    <Screen>
      <Card>
        {task ? (
          <View style={{ gap: 8 }}>
            <AppText variant="title">{task.title}</AppText>
            <AppText tone="muted">{task.source}</AppText>
            <AppText>{task.guidance}</AppText>
            <AppText variant="caption">{task.whatToDo}</AppText>
            <AppText variant="caption" tone="danger">{task.penaltyExplanation}</AppText>
          </View>
        ) : (
          <AppText tone="muted">Task {String(id)} is not in your current personalization set.</AppText>
        )}
      </Card>
    </Screen>
  );
}
```

`mobile-app/app/guidance/[topic].tsx`:

```tsx
import { useLocalSearchParams } from "expo-router";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

export default function GuidanceScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  return (
    <Screen>
      <Card>
        <AppText variant="title">Guidance: {String(topic)}</AppText>
        <AppText tone="muted">
          Detailed CAP guidance for this topic. Tap an impacted task on a regulation feed item to drill into the task itself.
        </AppText>
      </Card>
    </Screen>
  );
}
```

- [ ] **Step 3: Replace regulations.tsx body**

In `mobile-app/app/(tabs)/regulations.tsx`:

1. Add to imports:

```tsx
import { Link } from "expo-router";
```

2. Pull `openRegulation` from `useApp()` (alongside existing destructure).

3. Replace the inner `relatedTasks.map(...)` block with rendered `<Link>` chips that fire `openRegulation` on press. The exact replacement of the `{relatedTasks.length > 0 && ...}` block becomes:

```tsx
{reg.relatedTaskIds.length > 0 && (
  <View style={styles.relatedSection}>
    <View style={styles.relatedHeader}>
      <Ionicons name="link-outline" size={14} color="#3f6a52" />
      <AppText variant="label" tone="accent">{t("regulations.impacted_tasks", language)}</AppText>
    </View>
    {reg.relatedTaskIds.map((taskId) => {
      const taskInfo = tasks.find((t) => t.id === taskId);
      const title = taskInfo?.title ?? taskId;
      return (
        <Link
          key={taskId}
          href={taskInfo ? `/tasks/${taskId}` : `/guidance/${taskId}`}
          asChild
          onPress={() => openRegulation(reg.id, { kind: taskInfo ? "task" : "guidance", id: taskId })}
        >
          <Pressable style={styles.relatedTask} testID={`reg-link-${reg.id}-${taskId}`}>
            <Ionicons name="checkbox-outline" size={13} color="#3f6a52" />
            <AppText variant="caption" tone="accent">{title}</AppText>
            <Ionicons name="chevron-forward" size={13} color="#3f6a52" />
          </Pressable>
        </Link>
      );
    })}
  </View>
)}
```

(Remove the `getRelatedTaskTitles` helper — no longer needed.)

- [ ] **Step 4: Write integration test**

`mobile-app/__tests__/regulation-link.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, back: jest.fn() }),
  Link: ({ href, onPress, children }: any) => {
    const child = Array.isArray(children) ? children[0] : children;
    const origOnPress = child?.props?.onPress;
    return {
      ...child,
      props: {
        ...child.props,
        onPress: () => {
          onPress?.();
          mockPush(href);
          origOnPress?.();
        },
      },
    };
  },
}));

import { AppProvider, useApp } from "@/context/AppContext";
import RegulationsScreen from "@/app/(tabs)/regulations";

function AuditProbe() {
  const { auditLogs } = useApp();
  const opened = auditLogs.filter((e) => e.type === "regulation.opened");
  return <></>;
}

describe("regulation feed deep links", () => {
  beforeEach(() => mockPush.mockClear());

  test("tapping impacted-task chip pushes /tasks/[id], marks read, logs regulation.opened", async () => {
    const ctxValueRef: any = { current: null };
    function Probe() {
      const ctx = useApp();
      ctxValueRef.current = ctx;
      return null;
    }
    const { findAllByTestId } = render(
      <AppProvider><><Probe /><RegulationsScreen /></></AppProvider>,
    );
    const links = await findAllByTestId(/reg-link-/);
    expect(links.length).toBeGreaterThan(0);
    await act(async () => { fireEvent.press(links[0]); });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/(tasks|guidance)\//));
      expect(ctxValueRef.current.auditLogs.some((e: any) => e.type === "regulation.opened")).toBe(true);
    });
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `cd mobile-app && npx jest __tests__/regulation-link.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile-app/app/(tabs)/regulations.tsx mobile-app/app/tasks mobile-app/app/guidance mobile-app/context/AppContext.tsx mobile-app/__tests__/regulation-link.test.tsx
git commit -m "feat(regulations): deep-link impacted-task chips to /tasks/[id] with regulation.opened audit"
```

---

## Task 14: SCRUM-43 advisor delegated access audit

**Files:**
- Modify: `mobile-app/context/AppContext.tsx` (only if gaps found)

- [ ] **Step 1: Read current advisor implementation**

Read these in full and inspect:
- `mobile-app/context/AppContext.tsx` functions `inviteAdvisor`, `revokeAdvisor` (already present at lines ~531–566).
- `mobile-app/app/(tabs)/profile.tsx` advisor section.
- `mobile-app/types.ts` `Advisor`, `AdvisorPermission`.

For each of the four contract points, write a one-line verdict in the commit message:

1. Invite — does `inviteAdvisor` validate email and prevent duplicate active invites? Currently: yes (`email.includes("@")` + duplicate guard).
2. Revoke — does `revokeAdvisor` mark `active: false` and set `revokedAt`? Currently: yes.
3. Scoped permissions — does the `permission` field distinguish `read-only` vs `edit`? Currently: yes in type; check that the Profile UI exposes both options. If it only offers one, capture as gap.
4. Audit-on-advisor-actions — do `advisor.invite` and `advisor.revoke` events appear in `auditLogs`? Currently: yes via `appendLog`.

- [ ] **Step 2: Apply at most one inline fix**

If a single gap is found (most likely: Profile UI hard-codes the permission rather than letting user pick), implement the minimal fix in `app/(tabs)/profile.tsx`: add a small permission toggle (`Read-only` / `Edit`) next to the invite button, defaulting to `read-only`. If two or more gaps are found, document them as SP5 risks in the commit message and apply zero code changes.

(Cap: this entire task is one plan step regardless. Do not extend SCRUM-43 further.)

- [ ] **Step 3: Commit**

```bash
git add mobile-app/app
git commit -m "chore(advisor): SCRUM-43 audit — invite/revoke/scope/audit verified; any further gaps deferred to SP5"
```

(If nothing changed, skip the commit.)

---

## Task 15: Final full check

- [ ] **Step 1: Run the i18n guard end-to-end on the real codebase**

Run: `cd mobile-app && npx ts-node --transpile-only scripts/check-i18n.ts`
Expected: `OK: N keys referenced, M in each dict.` and exit 0.

- [ ] **Step 2: Run the full test suite**

Run: `cd mobile-app && npm test`
Expected: all suites green.

- [ ] **Step 3: Run `npm run check`**

Run: `cd mobile-app && npm run check`
Expected: exit 0.

- [ ] **Step 4: Commit any stray fixes**

If anything had to be touched (e.g. a `t("...")` reference cleaned up), commit:

```bash
git add -A mobile-app
git commit -m "chore: green up npm run check"
```

---

## Self-Review

**Spec coverage:**

- SCRUM-74 — i18n hardening: getInitialLanguage (Task 3), persistence integration tests (Task 5), check-i18n wired into `scripts.check` (Task 4), parity test (Task 2). Covered.
- SCRUM-75 — Personalization: `evaluateRules` with all five operators (Task 6), externalized content with rule grammar README (Task 7), deriveTasks rewire keeping `ComplianceTask` shape (Task 8), six tasks covering organic / crop-rotation / livestock-density / nitrate-zone (Tasks 7–8). Covered.
- SCRUM-73 — OCR: deterministic seeded mock keyed on `fileName` with exactly one low-confidence field per doc (Task 9), `/ocr-review/[reportId]` editable + per-field badges (Task 11), Apply writes draft + `ocr.applied` with per-field source map (Task 10), entry point uses `pickDocument` + `copyIntoAppDocs` (Task 12). Covered.
- SCRUM-76 — Regulation deep links: `Link` to `/tasks/[id]` with guidance fallback (Task 13), `regulation.opened` audit event (Tasks 13 / context method), mark-read on tap (Task 13). Covered.
- SCRUM-44 — i18n MVP audit-then-extend: extended by SCRUM-74 work; existing keys preserved verbatim in Task 2.
- SCRUM-38 — OCR review keys: existing `ocr.*` keys preserved; review screen productionized (Task 11).
- SCRUM-43 — advisor: single audit step (Task 14), capped at one plan step per the spec's mitigation. Covered.

**Placeholder scan:** no `TODO`, `TBD`, "fill in", "similar to", "add appropriate" tokens remain — every code step has full code. Type names match across tasks (`ExtractionResult`, `OcrApplyMap`, `OcrFieldSource`, `Rule`, `Clause`, `Op`). Audit event names match between `types.ts` and consumers (`ocr.applied`, `regulation.opened`).

**Type consistency:** `evaluateRules` signature `(profile, rules) => Set<string>` used the same way in `load.ts`. `extractFromFile(uri, fileName)` signature identical in test, screen, and entry-point caller. `applyOcrExtractionV2(reportId, result, applied, sourceMap)` parameters match between context implementation, screen caller, and `OcrApplyMap` type. `deriveTasks(profile, language)` updated everywhere it's called.

No further changes required.
