import re
from pathlib import Path

ROOT = Path(r"c:\Self Projects\tutor")
DONE = [
    "T0.1", "T0.2", "T0.3",
    "T1.1", "T1.2", "T1.3",
    "T2.1", "T2.2", "T2.3", "T2.4", "T2.5", "T2.6",
    "T3.1", "T3.2", "T3.3", "T3.4", "T3.5", "T3.6", "T3.7", "T3.8", "T3.9",
    "T3.10", "T3.11", "T3.12", "T3.13", "T3.14", "T3.15", "T3.16", "T3.17",
    "T3.18", "T3.19", "T3.20", "T3.21",
    "T4.1", "T4.2", "T4.3", "T4.4", "T4.5", "T4.6", "T4.7", "T4.8", "T4.9",
    "T5.1", "T5.2", "T5.3",
    "T6.1", "T6.2", "T6.3",
]
path = ROOT / "product-viewer.html"
text = path.read_text(encoding="utf-8")
for tid in DONE:
    text, n = re.subn(
        rf'("id": "{tid}",.*?)"status": "pending"',
        r'\1"status": "done"',
        text,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        raise SystemExit(f"failed {tid} n={n}")
path.write_text(text, encoding="utf-8")
print("marked", len(DONE), "tasks done")
