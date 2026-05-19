All learned information that reoccurs at least twice must be stored in the `NOTES/` directory.

## NOTES reference protocol (efficiency-first)

- Always open `NOTES/INDEX.md` first.
- Use the index to select only the relevant uppercase topic file(s) instead of scanning every note file.
- Add new recurrent learnings to the best matching existing topic file; create a new uppercase topic file only when no good fit exists.
- When adding a new topic file, update `NOTES/INDEX.md` in the same change.
- Keep notes concise and deduplicated: append only net-new recurring facts, decisions, or pitfalls.
- If a stored statement is later proven wrong, edit that statement in-place (do not keep it as active guidance), and add a short `Correction:` note with date and reason.

## Jira ticket inspection

Use `python3 jira_query.py` (reads `Jira.csv` from the repo root) for any ticket lookup instead of grepping the CSV directly. Subcommands:

- `list [--status … --type … --sprint … --assignee … --priority … --epic SCRUM-N]` — filtered ticket table
- `show SCRUM-N` — full details for one ticket (Epics also list child issues)
- `stats` — counts and story points by status / type / priority / assignee
- `sprints` — per-sprint ticket and story-point breakdown
- `search QUERY` — case-insensitive full-text search across Summary + Description

Pass `--csv PATH` to point at a different export.

