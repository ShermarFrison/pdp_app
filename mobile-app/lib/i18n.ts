import * as Localization from "expo-localization";

import { AppLanguage } from "@/types";

export type I18nKey =
  | "tab.dashboard"
  | "tab.calendar"
  | "tab.reports"
  | "tab.regulations"
  | "tab.profile"
  | "tab.help"
  | "tab.audit"
  | "login.title"
  | "login.button"
  | "login.tagline"
  | "dashboard.welcome"
  | "dashboard.tasks"
  | "dashboard.overdue"
  | "dashboard.drafts"
  | "dashboard.compliance_tasks"
  | "dashboard.sign_out"
  | "dashboard.upload_evidence"
  | "dashboard.evidence_files"
  | "reports.title"
  | "reports.subtitle"
  | "reports.online"
  | "reports.offline"
  | "reports.simulate_offline"
  | "reports.go_online"
  | "reports.queued"
  | "reports.sync_now"
  | "reports.create_new"
  | "reports.submitted"
  | "reports.edit_draft"
  | "reports.no_draft"
  | "reports.save_draft"
  | "reports.submit"
  | "reports.upload_document"
  | "reports.ocr_review"
  | "calendar.title"
  | "calendar.subtitle"
  | "calendar.past_due"
  | "calendar.no_tasks"
  | "regulations.title"
  | "regulations.subtitle"
  | "regulations.impacted_tasks"
  | "regulations.new"
  | "profile.title"
  | "profile.subtitle"
  | "profile.farm_details"
  | "profile.farm_ops"
  | "profile.save_local"
  | "profile.sync_backend"
  | "profile.reminders"
  | "profile.language"
  | "profile.advisors"
  | "profile.invite_advisor"
  | "profile.revoke_access"
  | "help.title"
  | "help.subtitle"
  | "help.new_ticket"
  | "help.my_tickets"
  | "help.submit"
  | "help.attach_screenshot"
  | "audit.title"
  | "audit.subtitle"
  | "audit.events_count"
  | "audit.export"
  | "audit.export_title"
  | "ocr.document_type"
  | "ocr.document_date"
  | "ocr.reference_id"
  | "ocr.low_confidence"
  | "ocr.confirm_apply"
  | "ocr.extracted_from"
  | "ocr.cancel"
  | "ocr.review_title"
  | "ocr.applied_msg"
  | "conflict.title"
  | "conflict.subtitle"
  | "conflict.local"
  | "conflict.server"
  | "conflict.resolve"
  | "export.date_from"
  | "export.date_to"
  | "export.format_csv"
  | "export.format_json"
  | "export.preview"
  | "export.copy_clipboard"
  | "export.copied"
  | "export.generate"
  | "task.buffer_strips.title"
  | "task.buffer_strips.guidance"
  | "task.buffer_strips.what_to_do"
  | "task.buffer_strips.penalty"
  | "task.soil_cover.title"
  | "task.soil_cover.guidance"
  | "task.soil_cover.what_to_do"
  | "task.soil_cover.penalty"
  | "task.manure_log.title"
  | "task.manure_log.guidance"
  | "task.manure_log.what_to_do"
  | "task.manure_log.penalty"
  | "task.organic_record.title"
  | "task.organic_record.guidance"
  | "task.organic_record.what_to_do"
  | "task.organic_record.penalty"
  | "task.nitrate_plan.title"
  | "task.nitrate_plan.guidance"
  | "task.nitrate_plan.what_to_do"
  | "task.nitrate_plan.penalty"
  | "task.crop_rotation_plan.title"
  | "task.crop_rotation_plan.guidance"
  | "task.crop_rotation_plan.what_to_do"
  | "task.crop_rotation_plan.penalty";

type Dictionary = Record<I18nKey, string>;

const EN: Dictionary = {
  "tab.dashboard": "Dashboard",
  "tab.calendar": "Calendar",
  "tab.reports": "Reports",
  "tab.regulations": "Rules",
  "tab.profile": "Profile",
  "tab.help": "Help",
  "tab.audit": "Audit",
  "login.title": "Sign in to your farm",
  "login.button": "Open Dashboard",
  "login.tagline": "Simplify CAP compliance for Lithuanian farmers. Track tasks, manage reports, stay audit-ready.",
  "dashboard.welcome": "Welcome back",
  "dashboard.tasks": "Tasks",
  "dashboard.overdue": "Overdue",
  "dashboard.drafts": "Drafts",
  "dashboard.compliance_tasks": "Compliance Tasks",
  "dashboard.sign_out": "Sign Out",
  "dashboard.upload_evidence": "Upload Evidence",
  "dashboard.evidence_files": "Evidence Files",
  "reports.title": "Reports",
  "reports.subtitle": "Create, edit, and submit compliance reports.",
  "reports.online": "Online",
  "reports.offline": "Offline — drafts saved locally",
  "reports.simulate_offline": "Simulate Offline",
  "reports.go_online": "Go Online",
  "reports.queued": "action(s) queued for sync",
  "reports.sync_now": "Sync Now",
  "reports.create_new": "Create New Report",
  "reports.submitted": "Submitted Reports",
  "reports.edit_draft": "Edit Draft",
  "reports.no_draft": "No Draft",
  "reports.save_draft": "Save Draft",
  "reports.submit": "Submit Report",
  "reports.upload_document": "Upload Document (OCR Prefill)",
  "reports.ocr_review": "OCR Review",
  "calendar.title": "Calendar",
  "calendar.subtitle": "Compliance deadlines at a glance.",
  "calendar.past_due": "Past-Due Tasks",
  "calendar.no_tasks": "No tasks due on this day.",
  "regulations.title": "Regulation Changes",
  "regulations.subtitle": "Stay updated on CAP requirement changes that affect your farm.",
  "regulations.impacted_tasks": "Impacted Tasks",
  "regulations.new": "new",
  "profile.title": "Farm Profile",
  "profile.subtitle": "Your profile drives personalized compliance tasks and reporting.",
  "profile.farm_details": "Farm Details",
  "profile.farm_ops": "Farm Operations",
  "profile.save_local": "Save Local Draft",
  "profile.sync_backend": "Sync to Backend",
  "profile.reminders": "Reminder Schedule",
  "profile.language": "Interface Language",
  "profile.advisors": "Advisor Access",
  "profile.invite_advisor": "Invite Advisor",
  "profile.revoke_access": "Revoke",
  "help.title": "Help & Support",
  "help.subtitle": "Submit a ticket and we will get back to you.",
  "help.new_ticket": "New Ticket",
  "help.my_tickets": "My Tickets",
  "help.submit": "Submit Ticket",
  "help.attach_screenshot": "Attach Screenshot",
  "audit.title": "Audit Log",
  "audit.subtitle": "Immutable record of compliance actions with timestamps.",
  "audit.events_count": "event(s) recorded",
  "audit.export": "Export Audit Log",
  "audit.export_title": "Export",
  "ocr.document_type": "Document Type",
  "ocr.document_date": "Document Date",
  "ocr.reference_id": "Reference ID",
  "ocr.low_confidence": "Low confidence — review before applying",
  "ocr.confirm_apply": "Apply to Draft",
  "ocr.extracted_from": "Extracted from",
  "ocr.cancel": "Cancel",
  "ocr.review_title": "Review extracted fields",
  "ocr.applied_msg": "OCR fields applied to draft.",
  "conflict.title": "Sync Conflict",
  "conflict.subtitle": "Choose which value to keep for each field.",
  "conflict.local": "Local",
  "conflict.server": "Server",
  "conflict.resolve": "Save Merged Result",
  "export.date_from": "Date From",
  "export.date_to": "Date To",
  "export.format_csv": "CSV",
  "export.format_json": "JSON",
  "export.preview": "Preview",
  "export.copy_clipboard": "Copy to Clipboard",
  "export.copied": "Copied!",
  "export.generate": "Generate Export",
  "task.buffer_strips.title": "Confirm field buffer strips",
  "task.buffer_strips.guidance": "Walk boundary fields and note any missing protective strips.",
  "task.buffer_strips.what_to_do":
    "1. Walk the perimeter of all fields.\n2. Check that buffer strips of at least 3 metres exist along watercourses.\n3. Photograph any gaps and note their GPS location.\n4. Record findings in your compliance log.",
  "task.buffer_strips.penalty":
    "Missing or inadequate buffer strips can result in a 3–5% reduction in your CAP direct payment. Repeated non-compliance may lead to additional penalty multipliers in subsequent years.",
  "task.soil_cover.title": "Document winter soil cover",
  "task.soil_cover.guidance": "Capture where soil cover is maintained and record the crop plan.",
  "task.soil_cover.what_to_do":
    "1. Survey all arable fields after harvest.\n2. Record which fields have winter crop, cover crop, or natural vegetation.\n3. Ensure at least 80% of soil is covered between 1 Nov – 15 Feb.\n4. Upload photographic evidence or add notes to the field log.",
  "task.soil_cover.penalty":
    "GAEC 6 requires minimum soil cover on large holdings. Non-compliance is classified as a high-risk finding and can result in a 5–10% cut to your area payments.",
  "task.manure_log.title": "Update manure storage log",
  "task.manure_log.guidance": "Record storage checks and spreading windows in plain language notes.",
  "task.manure_log.what_to_do":
    "1. Record the current volume in each manure storage facility.\n2. Confirm no spreading occurred during closed periods (1 Oct – 1 Feb).\n3. Log the date, facility ID, and your name as the responsible person.\n4. Check for any signs of leakage and record the outcome.",
  "task.manure_log.penalty":
    "SMR 1 (Nitrates Directive) requires accurate manure storage records. Failures can carry up to 10% payment reduction and trigger on-site inspection.",
  "task.organic_record.title": "Maintain organic certification record",
  "task.organic_record.guidance":
    "Keep inputs and field-history records aligned with your organic body's annual audit.",
  "task.organic_record.what_to_do":
    "1. Update the inputs ledger with any seed, compost, or amendment applied this season.\n2. Confirm no prohibited substances were used on certified parcels.\n3. Attach the latest certificate scan to your profile.\n4. Confirm parcel boundaries match the certified map.",
  "task.organic_record.penalty":
    "Loss of organic certification revokes the per-hectare organic premium and can require repayment of premiums already received in the current campaign year.",
  "task.nitrate_plan.title": "File nitrate-zone fertilisation plan",
  "task.nitrate_plan.guidance":
    "Holdings inside a Nitrate Vulnerable Zone (NVZ) must submit an annual plan before the spreading window.",
  "task.nitrate_plan.what_to_do":
    "1. Calculate N application rates per parcel.\n2. Respect the NVZ closed period for spreading.\n3. File the plan with the regional authority before 1 March.\n4. Keep proof of submission with your audit log.",
  "task.nitrate_plan.penalty":
    "Failure to file an NVZ plan is a cross-compliance breach: 3% reduction baseline, doubled on repeat finding, plus possible environmental fine.",
  "task.crop_rotation_plan.title": "Confirm crop-rotation plan",
  "task.crop_rotation_plan.guidance":
    "GAEC 7 requires a documented rotation on arable holdings above the hectare threshold.",
  "task.crop_rotation_plan.what_to_do":
    "1. List each parcel's primary crop for the last two seasons.\n2. Mark parcels where the same crop has been grown two years running.\n3. Plan a different main crop or catch-crop for any flagged parcels.\n4. Save the plan as part of your audit record.",
  "task.crop_rotation_plan.penalty":
    "GAEC 7 non-compliance reduces direct payments by 1–3% and is treated as repeat-finding on the second consecutive year.",
};

const LT: Dictionary = {
  "tab.dashboard": "Suvestinė",
  "tab.calendar": "Kalendorius",
  "tab.reports": "Ataskaitos",
  "tab.regulations": "Taisyklės",
  "tab.profile": "Profilis",
  "tab.help": "Pagalba",
  "tab.audit": "Auditas",
  "login.title": "Prisijunkite prie savo ūkio",
  "login.button": "Atidaryti suvestinę",
  "login.tagline": "Supaprastinkite CAP atitikimą Lietuvos ūkininkams. Sekite užduotis, valdykite ataskaitas.",
  "dashboard.welcome": "Sveiki sugrįžę",
  "dashboard.tasks": "Užduotys",
  "dashboard.overdue": "Vėluoja",
  "dashboard.drafts": "Juodraščiai",
  "dashboard.compliance_tasks": "Atitikties užduotys",
  "dashboard.sign_out": "Atsijungti",
  "dashboard.upload_evidence": "Įkelti įrodymą",
  "dashboard.evidence_files": "Įrodymų failai",
  "reports.title": "Ataskaitos",
  "reports.subtitle": "Kurkite, redaguokite ir teikite atitikties ataskaitas.",
  "reports.online": "Prisijungta",
  "reports.offline": "Neprisijungta — juodraščiai išsaugomi vietoje",
  "reports.simulate_offline": "Imituoti neprisijungimą",
  "reports.go_online": "Prisijungti",
  "reports.queued": "veiksmas(-ai) laukia sinchronizavimo",
  "reports.sync_now": "Sinchronizuoti dabar",
  "reports.create_new": "Sukurti naują ataskaitą",
  "reports.submitted": "Pateiktos ataskaitos",
  "reports.edit_draft": "Redaguoti juodraštį",
  "reports.no_draft": "Nėra juodraščio",
  "reports.save_draft": "Išsaugoti juodraštį",
  "reports.submit": "Pateikti ataskaitą",
  "reports.upload_document": "Įkelti dokumentą (OCR užpildymas)",
  "reports.ocr_review": "OCR peržiūra",
  "calendar.title": "Kalendorius",
  "calendar.subtitle": "Atitikties terminai iš pirmo žvilgsnio.",
  "calendar.past_due": "Praėjusio termino užduotys",
  "calendar.no_tasks": "Nėra užduočių šią dieną.",
  "regulations.title": "Reglamento pakeitimai",
  "regulations.subtitle": "Sekite CAP reikalavimų pakeitimus, turinčius įtakos jūsų ūkiui.",
  "regulations.impacted_tasks": "Paveiktos užduotys",
  "regulations.new": "nauja(-i)",
  "profile.title": "Ūkio profilis",
  "profile.subtitle": "Jūsų profilis formuoja personalizuotas atitikties užduotis.",
  "profile.farm_details": "Ūkio informacija",
  "profile.farm_ops": "Ūkio operacijos",
  "profile.save_local": "Išsaugoti vietoje",
  "profile.sync_backend": "Sinchronizuoti su serveriu",
  "profile.reminders": "Priminimų grafikas",
  "profile.language": "Sąsajos kalba",
  "profile.advisors": "Konsultantų prieiga",
  "profile.invite_advisor": "Pakviesti konsultantą",
  "profile.revoke_access": "Atšaukti",
  "help.title": "Pagalba ir palaikymas",
  "help.subtitle": "Pateikite užklausą ir mes su jumis susisieksime.",
  "help.new_ticket": "Nauja užklausa",
  "help.my_tickets": "Mano užklausos",
  "help.submit": "Pateikti užklausą",
  "help.attach_screenshot": "Pridėti ekrano kopiją",
  "audit.title": "Audito žurnalas",
  "audit.subtitle": "Nekeičiamas atitikties veiksmų įrašas su laiko žymomis.",
  "audit.events_count": "įvykis(-iai) užregistruotas(-i)",
  "audit.export": "Eksportuoti audito žurnalą",
  "audit.export_title": "Eksportas",
  "ocr.document_type": "Dokumento tipas",
  "ocr.document_date": "Dokumento data",
  "ocr.reference_id": "Nuorodos ID",
  "ocr.low_confidence": "Žemas patikimumas — patikrinkite prieš taikydami",
  "ocr.confirm_apply": "Taikyti juodraščiui",
  "ocr.extracted_from": "Išgauta iš",
  "ocr.cancel": "Atšaukti",
  "ocr.review_title": "Peržiūrėti išgautus laukus",
  "ocr.applied_msg": "OCR laukai pritaikyti juodraščiui.",
  "conflict.title": "Sinchronizavimo konfliktas",
  "conflict.subtitle": "Pasirinkite kiekvienam laukui naudojamą reikšmę.",
  "conflict.local": "Vietinis",
  "conflict.server": "Serverio",
  "conflict.resolve": "Išsaugoti suderintą rezultatą",
  "export.date_from": "Data nuo",
  "export.date_to": "Data iki",
  "export.format_csv": "CSV",
  "export.format_json": "JSON",
  "export.preview": "Peržiūra",
  "export.copy_clipboard": "Kopijuoti į iškarpinę",
  "export.copied": "Nukopijuota!",
  "export.generate": "Generuoti eksportą",
  "task.buffer_strips.title": "Patvirtinkite laukų apsaugines juostas",
  "task.buffer_strips.guidance": "Apeikite ribinius laukus ir užfiksuokite trūkstamas apsaugines juostas.",
  "task.buffer_strips.what_to_do":
    "1. Apeikite visų laukų perimetrą.\n2. Patikrinkite, ar šalia vandens telkinių yra bent 3 m apsaugos juostos.\n3. Nufotografuokite trūkumus ir užrašykite GPS koordinates.\n4. Įrašykite išvadas į atitikties žurnalą.",
  "task.buffer_strips.penalty":
    "Trūkstamos arba netinkamos apsaugos juostos gali sumažinti tiesiogines CAP išmokas 3–5%. Pasikartojantis pažeidimas didina nuobaudą kitais metais.",
  "task.soil_cover.title": "Dokumentuokite žiemos dirvos dangą",
  "task.soil_cover.guidance":
    "Užfiksuokite, kur palaikoma dirvos danga, ir užrašykite augalų planą.",
  "task.soil_cover.what_to_do":
    "1. Po derliaus apžiūrėkite visus ariamus laukus.\n2. Pažymėkite laukus su žieminiu augalu, tarpine kultūra ar natūralia augmenija.\n3. Užtikrinkite ne mažesnę nei 80% dirvos dangą lapkričio 1 – vasario 15 d.\n4. Įkelkite nuotraukų įrodymus arba pridėkite pastabas.",
  "task.soil_cover.penalty":
    "GAEC 6 reikalauja minimalios dirvos dangos didesniuose ūkiuose. Pažeidimas — didelės rizikos išvada, gali sumažinti plotines išmokas 5–10%.",
  "task.manure_log.title": "Atnaujinkite mėšlo saugojimo žurnalą",
  "task.manure_log.guidance": "Užfiksuokite saugojimo patikras ir tręšimo langus aiškia kalba.",
  "task.manure_log.what_to_do":
    "1. Užfiksuokite dabartinį tūrį kiekvienoje mėšlo saugykloje.\n2. Patvirtinkite, kad uždarais laikotarpiais (spalio 1 – vasario 1) tręšimas nevyko.\n3. Užrašykite datą, objekto ID ir atsakingo asmens vardą.\n4. Patikrinkite, ar nėra nutekėjimo požymių, ir užrašykite rezultatą.",
  "task.manure_log.penalty":
    "SMR 1 (Nitratų direktyva) reikalauja tikslių įrašų. Pažeidimai gali sumažinti išmokas iki 10% ir sukelti vietos patikrinimą.",
  "task.organic_record.title": "Tvarkykite ekologinės sertifikacijos įrašus",
  "task.organic_record.guidance":
    "Įvedimų ir laukų istorijos įrašai turi atitikti jūsų sertifikavimo įstaigos auditą.",
  "task.organic_record.what_to_do":
    "1. Atnaujinkite įvedimų žurnalą su šio sezono sėklomis, kompostu ar pataisomis.\n2. Patvirtinkite, kad sertifikuotuose laukuose nenaudotos draudžiamos medžiagos.\n3. Pridėkite naujausią sertifikato kopiją prie profilio.\n4. Patikrinkite, ar laukų ribos atitinka sertifikuotą žemėlapį.",
  "task.organic_record.penalty":
    "Sertifikato praradimas panaikina ekologinę priemoką ir gali reikalauti grąžinti šiais metais jau gautas išmokas.",
  "task.nitrate_plan.title": "Pateikite nitratų zonos tręšimo planą",
  "task.nitrate_plan.guidance":
    "Ūkiai pažeidžiamoje nitratams zonoje (NVZ) privalo pateikti metinį planą prieš tręšimo langą.",
  "task.nitrate_plan.what_to_do":
    "1. Apskaičiuokite N normas kiekvienam laukui.\n2. Laikykitės NVZ uždaro tręšimo laikotarpio.\n3. Pateikite planą regionų institucijai iki kovo 1 d.\n4. Saugokite pateikimo įrodymą audito žurnale.",
  "task.nitrate_plan.penalty":
    "NVZ plano nepateikimas yra kryžminės atitikties pažeidimas: 3% bazinis sumažinimas, dvigubinamas pakartotinai, su galima aplinkosaugos bauda.",
  "task.crop_rotation_plan.title": "Patvirtinkite sėjomainos planą",
  "task.crop_rotation_plan.guidance":
    "GAEC 7 reikalauja dokumentuotos sėjomainos ariamuose ūkiuose virš hektarų ribos.",
  "task.crop_rotation_plan.what_to_do":
    "1. Surašykite kiekvieno lauko pagrindinį augalą už paskutinius du sezonus.\n2. Pažymėkite laukus, kuriuose tas pats augalas augintas dvejus metus iš eilės.\n3. Suplanuokite kitą pagrindinį augalą arba tarpinę kultūrą tokiuose laukuose.\n4. Išsaugokite planą kaip audito įrašo dalį.",
  "task.crop_rotation_plan.penalty":
    "GAEC 7 pažeidimas sumažina tiesiogines išmokas 1–3% ir antrais metais iš eilės laikomas pakartotiniu.",
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

export function getInitialLanguage(): AppLanguage {
  const locales = Localization.getLocales();
  const first = locales?.[0];
  const code = first?.languageCode;
  if (code === "lt") return "lt";
  if (code === "en") return "en";
  return "en";
}
