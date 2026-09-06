import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
screens = json.loads((root / "catalog/screens.json").read_text(encoding="utf-8"))
app = root / "frontend" / "app"
for s in screens:
    dest = app.joinpath(*s["route"].lstrip("/").split("/"))
    dest.mkdir(parents=True, exist_ok=True)
    content = (
        "import { ScreenShell } from '@/components/ScreenShell';\n\n"
        "export default function Page() {\n"
        "  return <ScreenShell id=%s title=%s role=%s route=%s />;\n"
        "}\n"
    ) % (
        json.dumps(s["id"]),
        json.dumps(s["title"]),
        json.dumps(s["role"]),
        json.dumps(s["route"]),
    )
    (dest / "page.tsx").write_text(content, encoding="utf-8")
lite = [{"id": s["id"], "title": s["title"], "route": s["route"], "role": s["role"]} for s in screens]
catalog_ts = (
    "/* Generated from catalog/screens.json — do not invent ids. */\n"
    "export const CATALOG_SCREENS = "
    + json.dumps(lite, indent=2)
    + " as const;\n"
)
(root / "frontend" / "lib" / "catalog-screens.ts").write_text(catalog_ts, encoding="utf-8")
print("wrote", len(screens), "pages")
