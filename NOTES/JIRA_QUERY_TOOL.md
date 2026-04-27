# JIRA_QUERY_TOOL

## Overview
`jira_query.py` — single-file Python CLI for querying `Jira.csv` without opening it manually.

**Location:** `/home/main/Desktop/pdp_app/jira_query.py`
**Run with:** `python3 jira_query.py <subcommand> [options]`
**Dependencies:** `pandas`, `rich` (optional, for coloured output); both confirmed installed.

---

## Subcommands

| Command | Purpose |
|---|---|
| `list` | Filtered table of tickets |
| `show SCRUM-N` | Full detail of one ticket (Epics show child issues) |
| `stats` | Count + story-point breakdowns by status/type/priority/assignee |
| `search QUERY` | Full-text search across Summary + Description |
| `sprints` | Per-sprint ticket count, story points, status breakdown |

---

## `list` filters (combinable)

```
--status "To Do"|"In Progress"|"Done"
--type   Task|Story|Subtask|Epic
--sprint <partial sprint name>       # e.g. "Sprint 5"
--assignee <partial name>            # e.g. "Bilal"
--priority Medium|High|Highest
--epic SCRUM-N                       # children of that epic
```

---

## Common usage patterns

```bash
# All open stories assigned to The V
python3 jira_query.py list --status "To Do" --type Story --assignee "The V"

# Everything in Sprint 6
python3 jira_query.py list --sprint "Sprint 6"

# Full detail of a ticket (shows child issues if Epic)
python3 jira_query.py show SCRUM-22

# Find anything mentioning "login"
python3 jira_query.py search "login"

# Team overview
python3 jira_query.py stats

# Sprint progress at a glance
python3 jira_query.py sprints

# Use a different CSV file
python3 jira_query.py --csv /path/to/export.csv list
```

---

## CSV quirks handled automatically
- Duplicate `Sprint` columns (`Sprint` + `Sprint.1`) — merged, non-null wins.
- Four `Labels` columns — merged into one comma-separated field.
- Duplicate `Custom field (Vulnerability).1` — dropped silently.
- `Custom field (Story point estimate)` — renamed to `Story Points`.
- Issue keys sorted numerically (`SCRUM-9` before `SCRUM-10`).

---

## Output notes
- Status cells are colour-coded when `rich` is installed: Done=green, In Progress=yellow, To Do=cyan.
- Summary is truncated to 60 chars in table views; full text shown in `show`.
- Story points display as integers when whole (5.0 → 5); missing values show as `—`.
- `Jira.csv` is auto-detected next to the script or in CWD; override with `--csv`.
