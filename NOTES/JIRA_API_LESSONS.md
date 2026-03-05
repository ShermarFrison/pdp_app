# JIRA API LESSONS

- For content repair, Jira REST API is safer than broad automation rules because updates can be scoped and validated per issue.
- Current issue payload can be read with `GET /rest/api/3/issue/{KEY}` (or `expand=changelog` when restoration history is needed).
- Description updates work reliably via `PUT /rest/api/3/issue/{KEY}` with `fields.description` in Atlassian Document Format (ADF), not plain text.
- Safe newline repair pattern: read description, convert ADF to text, replace literal `\\n` tokens with actual line breaks, convert back to ADF, then update.
- Always verify post-update with a second API pass (for example, check that description text no longer contains literal `\\n`) and spot-check in UI.
- If bulk operation shows unexpected behavior, disable or stop the mechanism immediately before further writes.
