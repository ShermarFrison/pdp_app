# JIRA AUTOMATION NEWLINE FIX LESSONS

- Jira Automation smart value expressions for string replacement are sensitive to how newline values are encoded.
- A malformed transformation can run without obvious rule-level failure and still corrupt field content.
- A one-time bulk transformation should always be validated on a single issue first before running on a set.
- If unexpected content loss appears, disable the rule immediately to stop additional damage.
- For this workspace, rule `Fix Imported Newline Escapes (SCRUM-37..48)` was disabled after detecting unintended description clearing.
