# JIRA CSV IMPORT LESSONS

- In this Jira setup, importing with a CSV `Issue Type` column caused mapping/category errors. The reliable path is to import a single issue type per run and set type in the importer UI.
- `Epic Name` produced warnings (`not applicable for issue type 'Epic'`) in this import flow and should be omitted.
- Story-to-epic links failed when placeholder values were used. `Parent`/`Epic Link` values must be real issue keys (for example `SCRUM-22`).
- Imported stories could have points and labels but still have missing parent links until explicit linking.
- Bulk linking via Jira REST API worked with `PUT /rest/api/3/issue/{key}` and payload `fields.parent.key`.
