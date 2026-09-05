#!/usr/bin/env python3
"""Parity: demo S ↔ catalog ↔ architecture HTML ↔ README intro ↔ env ↔ spec feature dir."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

ALLOW_NO_SCREEN = {"B4", "C6", "F4", "G1", "G3"}


def fail(msg: str) -> None:
    errors.append(msg)


def demo_ids() -> set[str]:
    text = (ROOT / "tutor-platform-demo.html").read_text(encoding="utf-8")
    block = re.search(r"var S=\{(.*?)\n\};", text, re.S)
    if not block:
        fail("demo.html: var S not found")
        return set()
    return set(re.findall(r"'([a-z0-9-]+)':\{t:", block.group(1)))


def main() -> int:
    screens = json.loads((ROOT / "catalog/screens.json").read_text(encoding="utf-8"))
    catalog_ids = {s["id"] for s in screens}
    d_ids = demo_ids()
    if catalog_ids != d_ids:
        fail(f"catalog vs demo ids: only-catalog={sorted(catalog_ids-d_ids)} only-demo={sorted(d_ids-catalog_ids)}")

    html = (ROOT / "tutor-platform-architecture.html").read_text(encoding="utf-8")
    if "catalog/embed.js" not in html:
        fail("architecture HTML must script-src catalog/embed.js")
    if "data-screen=" not in html:
        fail("architecture HTML has no data-screen attributes")
    embed = (ROOT / "catalog/embed.js").read_text(encoding="utf-8")
    for sid in catalog_ids:
        if f'"{sid}"' not in embed:
            fail(f"embed.js missing screen {sid}")

    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    intro = "\n".join(readme.splitlines()[:40]).lower()
    if "subject-neutral" not in intro:
        fail("README intro (first 40 lines) must say subject-neutral")
    if "biology" not in intro or "example" not in intro:
        fail("README intro must say Biology is an example")
    if "plant physiology" in intro:
        fail("README intro still reads as a NEET teaching plan")

    env_catalog = json.loads((ROOT / "catalog/env.json").read_text(encoding="utf-8"))
    env_ex = (ROOT / ".env.example").read_text(encoding="utf-8")
    for item in env_catalog:
        name = item["name"]
        if name not in env_ex:
            fail(f".env.example missing {name}")

    modules = json.loads((ROOT / "catalog/modules.json").read_text(encoding="utf-8"))
    by_mod: dict[str, list[str]] = {}
    for s in screens:
        by_mod.setdefault(s["module"], []).append(s["id"])
    for m in modules:
        if not by_mod.get(m["id"]) and m["id"] not in ALLOW_NO_SCREEN:
            fail(f"module {m['id']} has no screens (add a screen or ALLOW_NO_SCREEN)")

    flows = json.loads((ROOT / "catalog/flows.json").read_text(encoding="utf-8"))
    for f in flows:
        for sid in f["tour"]:
            if sid not in catalog_ids:
                fail(f"flow {f['id']} unknown screen {sid}")

    spec = (ROOT / "specs/001-platform-architecture/spec.md").read_text(encoding="utf-8")
    plan = (ROOT / "specs/001-platform-architecture/plan.md").read_text(encoding="utf-8")
    for label, text in (("spec.md", spec), ("plan.md", plan)):
        for sid in re.findall(r"`([a-z0-9-]+)`", text):
            if sid in d_ids or sid in catalog_ids:
                continue
            # ignore non-screen ticks
            pass

    feature = json.loads((ROOT / ".specify/feature.json").read_text(encoding="utf-8"))
    fd = ROOT / feature["featureDirectory"]
    if not (fd / "spec.md").exists():
        fail(f"missing {fd}/spec.md")

    if errors:
        print("architecture-parity: FAIL")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"architecture-parity: OK ({len(catalog_ids)} screens)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
