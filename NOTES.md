# Notes

## Jira CSV Import Lessons (K608 / Scrum project)

- In this Jira setup, importing with a CSV `Issue Type` column caused mapping/category errors. The reliable path is to import a single issue type per run and set type in the importer UI.
- `Epic Name` produced warnings (`not applicable for issue type 'Epic'`) in this import flow and should be omitted.
- Story-to-epic links failed when placeholder values were used. `Parent`/`Epic Link` values must be real issue keys (for example `SCRUM-22`).
- The imported stories were created with points and labels, but initially had `Parent = None` until explicit linking.
- Bulk linking via Jira REST API in-session worked with `PUT /rest/api/3/issue/{key}` and payload `fields.parent.key`.

## Working Story -> Epic Mapping Applied

- `SCRUM-29` -> `SCRUM-22` (Identity and Access)
- `SCRUM-30` -> `SCRUM-23` (Farm Profile and Eligibility Inputs)
- `SCRUM-31` -> `SCRUM-24` (Compliance Tasks Module)
- `SCRUM-32` -> `SCRUM-24` (Compliance Tasks Module)
- `SCRUM-33` -> `SCRUM-25` (Basic Report Workflow)
- `SCRUM-34` -> `SCRUM-26` (Offline Draft and Sync)
- `SCRUM-35` -> `SCRUM-27` (Deadline Reminders and Notifications)
- `SCRUM-36` -> `SCRUM-28` (Audit Logging and Traceability)

## Recurrent Product Facts (Mar 2026)

- The product target is EU CAP compliance support for farmers (SMR/GAEC), with Lithuania as an initial pilot context.
- Core MVP workflow repeats across artifacts: secure login, farm profile capture, personalized task list with plain-language guidance, basic report submission, offline draft + sync, deadline reminders, and audit logging.
- Primary user value repeats across artifacts: reduce compliance admin burden, avoid missed deadlines/penalties, and improve access to subsidy-related actions.
