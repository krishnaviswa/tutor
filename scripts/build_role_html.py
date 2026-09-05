#!/usr/bin/env python3
"""Mint role-child HTML from tutor-platform-demo.html (1:1 copy + ROLE_ONLY)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "tutor-platform-demo.html"
MARKER = "var ROLE_ONLY=null;"
ROLES = ("student", "faculty", "admin", "parent", "system")
LABEL = {
    "student": "Student",
    "faculty": "Faculty",
    "admin": "Admin / Owner",
    "parent": "Parent",
    "system": "System",
}
GEN = (
    "<!-- GENERATED from tutor-platform-demo.html. Do not edit. "
    "Re-run scripts/build_role_html.py after demo changes. -->\n"
)


def render_role(demo: str, role: str) -> str:
    if MARKER not in demo:
        raise SystemExit(f"{DEMO.name} must contain {MARKER!r}")
    if role not in ROLES:
        raise SystemExit(f"unknown role {role}")
    out = demo.replace(MARKER, f"var ROLE_ONLY='{role}';", 1)
    out = out.replace(
        "<title>TutorOS — Template Prototype</title>",
        f"<title>TutorOS — {LABEL[role]} flow</title>",
        1,
    )
    if out.startswith(GEN):
        return out
    return GEN + out


def write_roles() -> list[Path]:
    demo = DEMO.read_text(encoding="utf-8")
    written: list[Path] = []
    for role in ROLES:
        path = ROOT / f"tutor-platform-role-{role}.html"
        path.write_text(render_role(demo, role), encoding="utf-8")
        written.append(path)
    return written


if __name__ == "__main__":
    paths = write_roles()
    print("wrote", ", ".join(p.name for p in paths))
