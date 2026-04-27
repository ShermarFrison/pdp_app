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
  | "export.generate";

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
};

const DICTIONARIES: Record<AppLanguage, Dictionary> = { en: EN, lt: LT };

export function t(key: I18nKey, lang: AppLanguage): string {
  const val = DICTIONARIES[lang]?.[key];
  if (!val) return `[MISSING: ${key}]`;
  return val;
}
