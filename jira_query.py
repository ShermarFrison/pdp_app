#!/usr/bin/env python3
"""Jira CSV query tool — query, filter and inspect Jira tickets from the terminal."""

import argparse
import re
import sys
import textwrap
from pathlib import Path

import pandas as pd

try:
    from rich.console import Console
    from rich.markup import escape
    from rich.panel import Panel
    from rich.rule import Rule
    from rich.table import Table
    from rich.text import Text

    RICH = True
    console = Console()
except ImportError:
    RICH = False
    console = None

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STORY_POINTS_COL = "Custom field (Story point estimate)"
SPRINT_COL = "Sprint"
SPRINT_DUP_COL = "Sprint.1"
LABEL_COLS = ["Labels", "Labels.1", "Labels.2", "Labels.3"]
VULN_DUP_COL = "Custom field (Vulnerability).1"
SP_COL = "Story Points"

STATUS_COLORS = {
    "Done": "green",
    "In Progress": "yellow",
    "To Do": "cyan",
}

PRIORITY_COLORS = {
    "Highest": "red",
    "High": "orange1",
    "Medium": "white",
    "Low": "dim",
}

LIST_COLS = ["Issue key", "Summary", "Issue Type", "Status", "Priority", "Assignee", SP_COL]
PLAIN_WIDTHS = [10, 62, 9, 13, 10, 22, 6]

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def load_data(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, low_memory=False)

    # Merge duplicate Sprint columns
    if SPRINT_DUP_COL in df.columns:
        df[SPRINT_COL] = df[SPRINT_DUP_COL].combine_first(df[SPRINT_COL])
        df.drop(columns=[SPRINT_DUP_COL], inplace=True)

    # Merge duplicate Labels columns
    present = [c for c in LABEL_COLS if c in df.columns]
    df["Labels"] = df[present].apply(
        lambda row: ", ".join(str(v) for v in row if pd.notna(v) and str(v).strip()),
        axis=1,
    )
    for c in LABEL_COLS[1:]:
        if c in df.columns:
            df.drop(columns=[c], inplace=True)

    # Drop duplicate Vulnerability column
    if VULN_DUP_COL in df.columns:
        df.drop(columns=[VULN_DUP_COL], inplace=True)

    # Rename story points
    if STORY_POINTS_COL in df.columns:
        df.rename(columns={STORY_POINTS_COL: SP_COL}, inplace=True)
        df[SP_COL] = pd.to_numeric(df[SP_COL], errors="coerce")

    # Numeric sort key for issue keys (SCRUM-N → N)
    def _key_num(k):
        m = re.search(r"\d+", str(k)) if pd.notna(k) else None
        return int(m.group()) if m else 0

    df["_key_num"] = df["Issue key"].apply(_key_num)
    return df


def find_csv(override: str | None) -> Path:
    if override:
        p = Path(override)
        if not p.exists():
            sys.exit(f"Error: CSV not found at {override}")
        return p
    for candidate in [Path(__file__).parent / "Jira.csv", Path.cwd() / "Jira.csv"]:
        if candidate.exists():
            return candidate
    sys.exit("Error: Jira.csv not found. Use --csv to specify the path.")


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _na(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "—"
    s = str(val).strip()
    return s if s else "—"


def fmt_sp(val) -> str:
    if pd.isna(val):
        return "—"
    return str(int(val)) if val == int(val) else str(val)


def truncate(s, n: int) -> str:
    s = str(s) if pd.notna(s) else ""
    return s if len(s) <= n else s[: n - 1] + "…"


def wrap_description(text, width: int = 100) -> str:
    if not text or (isinstance(text, float) and pd.isna(text)):
        return "(no description)"
    lines = str(text).splitlines()
    result = []
    for line in lines:
        if line.strip() == "":
            result.append("")
        else:
            result.append(textwrap.fill(line, width=width))
    return "\n".join(result)


def colorize_status(status: str):
    if not RICH:
        return str(status)
    color = STATUS_COLORS.get(str(status), "white")
    return Text(str(status), style=color)


def colorize_priority(priority: str):
    if not RICH:
        return str(priority)
    color = PRIORITY_COLORS.get(str(priority), "white")
    return Text(str(priority), style=color)


# ---------------------------------------------------------------------------
# Table display
# ---------------------------------------------------------------------------


def _make_rich_table(df: pd.DataFrame) -> None:
    t = Table(show_header=True, header_style="bold", show_lines=False, pad_edge=False)
    t.add_column("Key", width=10, no_wrap=True)
    t.add_column("Summary", width=62)
    t.add_column("Type", width=9)
    t.add_column("Status", width=13)
    t.add_column("Priority", width=10)
    t.add_column("Assignee", width=22)
    t.add_column("SP", width=4, justify="right")

    for _, row in df.iterrows():
        t.add_row(
            escape(str(row["Issue key"])),
            escape(truncate(row["Summary"], 60)),
            escape(_na(row.get("Issue Type"))),
            colorize_status(_na(row["Status"])),
            colorize_priority(_na(row["Priority"])),
            escape(_na(row.get("Assignee"))),
            fmt_sp(row[SP_COL]) if SP_COL in df.columns else "—",
        )
    console.print(t)
    console.print(f"[dim]{len(df)} ticket(s)[/dim]")


def _make_plain_table(df: pd.DataFrame) -> None:
    headers = ["Key", "Summary", "Type", "Status", "Priority", "Assignee", "SP"]
    sep = "  ".join("─" * w for w in PLAIN_WIDTHS)
    header_row = "  ".join(h.ljust(PLAIN_WIDTHS[i]) for i, h in enumerate(headers))
    print(header_row)
    print(sep)
    for _, row in df.iterrows():
        cells = [
            str(row["Issue key"]).ljust(PLAIN_WIDTHS[0]),
            truncate(row["Summary"], 60).ljust(PLAIN_WIDTHS[1]),
            _na(row.get("Issue Type")).ljust(PLAIN_WIDTHS[2]),
            _na(row["Status"]).ljust(PLAIN_WIDTHS[3]),
            _na(row["Priority"]).ljust(PLAIN_WIDTHS[4]),
            _na(row.get("Assignee")).ljust(PLAIN_WIDTHS[5]),
            fmt_sp(row[SP_COL]).rjust(PLAIN_WIDTHS[6]) if SP_COL in df.columns else "—",
        ]
        print("  ".join(cells))
    print(f"\n{len(df)} ticket(s)")


def make_table(df: pd.DataFrame) -> None:
    if RICH:
        _make_rich_table(df)
    else:
        _make_plain_table(df)


# ---------------------------------------------------------------------------
# Subcommand: list
# ---------------------------------------------------------------------------


def cmd_list(args: argparse.Namespace, df: pd.DataFrame) -> None:
    filtered = df.copy()

    if args.status:
        filtered = filtered[filtered["Status"].str.lower() == args.status.lower()]
    if getattr(args, "type", None):
        filtered = filtered[filtered["Issue Type"].str.lower() == args.type.lower()]
    if args.sprint:
        filtered = filtered[
            filtered[SPRINT_COL].str.contains(args.sprint, case=False, na=False)
        ]
    if args.assignee:
        filtered = filtered[
            filtered["Assignee"].str.lower().str.contains(args.assignee.lower(), na=False)
        ]
    if args.priority:
        filtered = filtered[filtered["Priority"].str.lower() == args.priority.lower()]
    if args.epic:
        filtered = filtered[filtered["Parent key"] == args.epic.upper()]

    filtered = filtered.sort_values("_key_num", ascending=False)

    if filtered.empty:
        msg = "No tickets match the given filters."
        if RICH:
            console.print(f"[yellow]{msg}[/yellow]")
        else:
            print(msg)
        return

    make_table(filtered)


# ---------------------------------------------------------------------------
# Subcommand: show
# ---------------------------------------------------------------------------


def _field_line(label: str, value: str) -> str:
    return f"[bold]{escape(label)}:[/bold]  {escape(value)}"


def cmd_show(args: argparse.Namespace, df: pd.DataFrame) -> None:
    key = args.issue_key.upper()
    rows = df[df["Issue key"] == key]
    if rows.empty:
        sys.exit(f"Issue '{key}' not found.")

    row = rows.iloc[0]

    summary = _na(row.get("Summary"))
    issue_type = _na(row.get("Issue Type"))
    status = _na(row.get("Status"))
    priority = _na(row.get("Priority"))
    assignee = _na(row.get("Assignee"))
    reporter = _na(row.get("Reporter"))
    sprint = _na(row.get(SPRINT_COL))
    sp = fmt_sp(row[SP_COL]) if SP_COL in df.columns else "—"
    created = _na(row.get("Created"))
    updated = _na(row.get("Updated"))
    due = _na(row.get("Due date"))
    labels = _na(row.get("Labels"))
    parent_key = _na(row.get("Parent key"))
    parent_summary = _na(row.get("Parent summary"))
    resolution = _na(row.get("Resolution"))
    description = row.get("Description", "")

    if RICH:
        console.print()
        console.print(Rule(f"[bold]{escape(key)}[/bold]  {escape(summary)}", style="blue"))
        console.print()

        # Metadata grid
        meta = Table.grid(padding=(0, 2))
        meta.add_column(style="bold dim", width=16)
        meta.add_column()
        meta.add_column(style="bold dim", width=16)
        meta.add_column()

        status_cell = colorize_status(status)
        priority_cell = colorize_priority(priority)

        meta.add_row("Type", escape(issue_type), "Status", status_cell)
        meta.add_row("Priority", priority_cell, "Assignee", escape(assignee))
        meta.add_row("Reporter", escape(reporter), "Created", escape(created))
        meta.add_row("Sprint", escape(sprint), "Updated", escape(updated))
        meta.add_row("Story Points", escape(sp), "Due date", escape(due))
        meta.add_row("Resolution", escape(resolution), "Labels", escape(labels))
        if parent_key != "—":
            meta.add_row("Parent", escape(parent_key), "Parent Summary", escape(truncate(parent_summary, 50)))

        console.print(meta)
        console.print()

        # Description
        console.print(Rule("Description", style="dim"))
        console.print(escape(wrap_description(description)))
        console.print()

        # Child issues (Epics)
        if issue_type == "Epic":
            children = df[df["Parent key"] == key].sort_values("_key_num")
            if not children.empty:
                console.print(Rule("Child Issues", style="dim"))
                make_table(children)
                console.print()

    else:
        print()
        print(f"{'─' * 80}")
        print(f"  {key}  {summary}")
        print(f"{'─' * 80}")
        print(f"  Type:         {issue_type:<20}  Status:       {status}")
        print(f"  Priority:     {priority:<20}  Assignee:     {assignee}")
        print(f"  Reporter:     {reporter:<20}  Created:      {created}")
        print(f"  Sprint:       {sprint:<20}  Updated:      {updated}")
        print(f"  Story Points: {sp:<20}  Due date:     {due}")
        print(f"  Resolution:   {resolution:<20}  Labels:       {labels}")
        if parent_key != "—":
            print(f"  Parent:       {parent_key:<20}  Parent Summ:  {truncate(parent_summary, 40)}")
        print()
        print("  Description")
        print(f"  {'─' * 76}")
        for line in wrap_description(description).splitlines():
            print(f"  {line}")
        print()
        if issue_type == "Epic":
            children = df[df["Parent key"] == key].sort_values("_key_num")
            if not children.empty:
                print("  Child Issues")
                print(f"  {'─' * 76}")
                make_table(children)


# ---------------------------------------------------------------------------
# Subcommand: stats
# ---------------------------------------------------------------------------


def _print_count_table(title: str, series: pd.Series, color_fn=None) -> None:
    if RICH:
        console.print(Rule(f"[bold]{escape(title)}[/bold]", style="blue"))
        t = Table(show_header=True, header_style="bold", pad_edge=False)
        t.add_column(title.split(" by ")[-1], min_width=20)
        t.add_column("Count", justify="right", min_width=6)
        for val, count in series.items():
            label = color_fn(str(val)) if color_fn else escape(str(val))
            t.add_row(label, str(count))
        console.print(t)
        console.print()
    else:
        print(f"\n=== {title} ===")
        for val, count in series.items():
            print(f"  {str(val):<30} {count}")


def _print_sp_table(title: str, series: pd.Series) -> None:
    if RICH:
        console.print(Rule(f"[bold]{escape(title)}[/bold]", style="blue"))
        t = Table(show_header=True, header_style="bold", pad_edge=False)
        t.add_column(title.split(" by ")[-1], min_width=20)
        t.add_column("Story Points", justify="right", min_width=12)
        for val, sp in series.items():
            t.add_row(escape(str(val)), fmt_sp(sp) if sp else "—")
        console.print(t)
        console.print()
    else:
        print(f"\n=== {title} ===")
        for val, sp in series.items():
            print(f"  {str(val):<30} {fmt_sp(sp) if sp else '—'}")


def cmd_stats(args: argparse.Namespace, df: pd.DataFrame) -> None:
    status_order = ["Done", "In Progress", "To Do"]
    status_counts = df["Status"].value_counts().reindex(status_order).dropna().astype(int)
    _print_count_table("Tickets by Status", status_counts, colorize_status)

    type_counts = df["Issue Type"].value_counts().sort_index()
    _print_count_table("Tickets by Issue Type", type_counts)

    priority_order = ["Highest", "High", "Medium", "Low"]
    priority_counts = df["Priority"].value_counts().reindex(priority_order).dropna().astype(int)
    _print_count_table("Tickets by Priority", priority_counts, colorize_priority)

    assignee_counts = df["Assignee"].fillna("Unassigned").value_counts()
    _print_count_table("Tickets by Assignee", assignee_counts)

    if SP_COL in df.columns:
        sp_status = df.groupby("Status")[SP_COL].sum().reindex(status_order).dropna()
        _print_sp_table("Story Points by Status", sp_status)

        sp_df = df.copy()
        sp_df["Assignee"] = sp_df["Assignee"].fillna("Unassigned")
        sp_assignee = sp_df.groupby("Assignee")[SP_COL].sum().sort_values(ascending=False)
        _print_sp_table("Story Points by Assignee", sp_assignee)


# ---------------------------------------------------------------------------
# Subcommand: search
# ---------------------------------------------------------------------------


def cmd_search(args: argparse.Namespace, df: pd.DataFrame) -> None:
    query = args.query.lower()
    mask = df["Summary"].str.lower().str.contains(query, na=False) | df[
        "Description"
    ].str.lower().str.contains(query, na=False)
    results = df[mask].sort_values("_key_num", ascending=False)

    if results.empty:
        msg = f"No tickets found matching '{args.query}'."
        if RICH:
            console.print(f"[yellow]{msg}[/yellow]")
        else:
            print(msg)
        return

    if RICH:
        console.print(f"[dim]Found {len(results)} ticket(s) matching '[bold]{escape(args.query)}[/bold]'[/dim]")
    else:
        print(f"Found {len(results)} ticket(s) matching '{args.query}'")
    make_table(results)


# ---------------------------------------------------------------------------
# Subcommand: sprints
# ---------------------------------------------------------------------------


def sprint_sort_key(name: str):
    m = re.search(r"Sprint\s+(\d+)", name, re.IGNORECASE)
    return (0, int(m.group(1))) if m else (1, 0)


def cmd_sprints(args: argparse.Namespace, df: pd.DataFrame) -> None:
    sdf = df.copy()
    sdf[SPRINT_COL] = sdf[SPRINT_COL].fillna("No Sprint")

    groups = sdf.groupby(SPRINT_COL)
    sprint_names = sorted(sdf[SPRINT_COL].unique(), key=sprint_sort_key)

    all_statuses = ["Done", "In Progress", "To Do"]

    if RICH:
        console.print()
        t = Table(show_header=True, header_style="bold", pad_edge=False)
        t.add_column("Sprint", min_width=30)
        t.add_column("Tickets", justify="right", min_width=8)
        t.add_column("Story Points", justify="right", min_width=12)
        for s in all_statuses:
            color = STATUS_COLORS.get(s, "white")
            t.add_column(s, justify="right", min_width=13, style=color)

        for sprint in sprint_names:
            g = groups.get_group(sprint)
            count = len(g)
            has_sp = g[SP_COL].notna().any() if SP_COL in g.columns else False
            sp_total = fmt_sp(g[SP_COL].sum()) if has_sp else "—"
            status_counts = g["Status"].value_counts()
            status_cells = [str(status_counts.get(s, 0)) for s in all_statuses]
            t.add_row(escape(sprint), str(count), sp_total, *status_cells)

        console.print(t)
        console.print()
    else:
        header = f"{'Sprint':<35}  {'Tickets':>7}  {'SP':>6}  {'Done':>6}  {'In Prog':>7}  {'To Do':>6}"
        print(header)
        print("─" * len(header))
        for sprint in sprint_names:
            g = groups.get_group(sprint)
            count = len(g)
            has_sp = g[SP_COL].notna().any() if SP_COL in g.columns else False
            sp_total = fmt_sp(g[SP_COL].sum()) if has_sp else "—"
            sc = g["Status"].value_counts()
            print(
                f"{sprint:<35}  {count:>7}  {sp_total:>6}  "
                f"{sc.get('Done', 0):>6}  {sc.get('In Progress', 0):>7}  {sc.get('To Do', 0):>6}"
            )


# ---------------------------------------------------------------------------
# CLI wiring
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="jira_query",
        description="Query a Jira CSV export from the command line.",
    )
    parser.add_argument("--csv", metavar="PATH", help="Path to Jira CSV export")

    sub = parser.add_subparsers(dest="command", required=True)

    # list
    p_list = sub.add_parser("list", help="List tickets with optional filters")
    p_list.add_argument("--status", help="Filter by status (Done, 'In Progress', 'To Do')")
    p_list.add_argument("--type", dest="type", help="Filter by issue type (Task, Story, Subtask, Epic)")
    p_list.add_argument("--sprint", help="Filter by sprint name (partial match)")
    p_list.add_argument("--assignee", help="Filter by assignee name (partial match)")
    p_list.add_argument("--priority", help="Filter by priority (Medium, High, Highest)")
    p_list.add_argument("--epic", help="Filter by parent epic key (e.g. SCRUM-22)")

    # show
    p_show = sub.add_parser("show", help="Show full details of a single ticket")
    p_show.add_argument("issue_key", metavar="ISSUE_KEY", help="Issue key (e.g. SCRUM-78)")

    # stats
    sub.add_parser("stats", help="Show summary statistics across all tickets")

    # search
    p_search = sub.add_parser("search", help="Full-text search across Summary + Description")
    p_search.add_argument("query", metavar="QUERY", help="Search term (case-insensitive)")

    # sprints
    sub.add_parser("sprints", help="Show per-sprint ticket and story point breakdown")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    csv_path = find_csv(args.csv)
    df = load_data(csv_path)

    dispatch = {
        "list": cmd_list,
        "show": cmd_show,
        "stats": cmd_stats,
        "search": cmd_search,
        "sprints": cmd_sprints,
    }
    dispatch[args.command](args, df)


if __name__ == "__main__":
    main()
