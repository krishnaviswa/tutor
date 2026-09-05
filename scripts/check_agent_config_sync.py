#!/usr/bin/env python3
"""Cursor rules and Claude Code mirrors must change together."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SYNC_GROUPS: list[set[str]] = [
    {".cursor/rules/project.mdc", "CLAUDE.md"},
    {".cursor/rules/backend-fastapi.mdc", "backend/CLAUDE.md"},
    {".cursor/rules/database.mdc", "backend/app/models/CLAUDE.md"},
    {".cursor/rules/ai-and-integrations.mdc", "backend/app/services/CLAUDE.md"},
    {".cursor/rules/testing.mdc", "backend/tests/CLAUDE.md", "frontend/CLAUDE.md"},
    {".cursor/rules/frontend-nextjs.mdc", "frontend/CLAUDE.md"},
    {".cursor/rules/docs-and-api.mdc", "docs/CLAUDE.md"},
    {".cursor/rules/agents/role-product-manager.mdc", ".claude/agents/product-manager.md"},
    {".cursor/rules/agents/role-architect.mdc", ".claude/agents/architect.md"},
    {".cursor/rules/agents/role-tester.mdc", ".claude/agents/tester.md"},
    {".cursor/rules/agents/workflow.mdc", "CLAUDE.md"},
    {".specify/memory/constitution.md", "CLAUDE.md", ".cursor/rules/project.mdc"},
]


def changed_files(args: argparse.Namespace) -> set[str]:
    if args.staged:
        cmd = ["git", "diff", "--cached", "--name-only"]
    else:
        cmd = ["git", "diff", "--name-only", args.range]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return {line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()}


def find_problems(changed: set[str]) -> list[tuple[set[str], set[str]]]:
    problems = []
    for group in SYNC_GROUPS:
        touched = group & changed
        if touched and touched != group:
            problems.append((touched, group - touched))
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=False)
    source.add_argument("--staged", action="store_true")
    source.add_argument("--range", help="e.g. origin/main...HEAD")
    args = parser.parse_args()

    missing_files = sorted({rel for group in SYNC_GROUPS for rel in group if not (ROOT / rel).exists()})
    if missing_files:
        print("agent-config-sync: missing paired files:")
        for m in missing_files:
            print(f"  {m}")
        return 1

    if not args.staged and not args.range:
        print("agent-config-sync: all paired files exist.")
        return 0

    changed = changed_files(args)
    problems = find_problems(changed)
    if not problems:
        print("agent-config-sync: OK")
        return 0
    print("agent-config-sync: Cursor and Claude Code config changed out of sync.\n")
    for touched, missing in problems:
        print(f"  Changed:     {', '.join(sorted(touched))}")
        print(f"  Also update: {', '.join(sorted(missing))}\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
