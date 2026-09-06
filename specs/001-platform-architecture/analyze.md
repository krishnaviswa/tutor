# analyze.md — 001-platform-architecture

Read-only check of spec / plan / tasks / catalog against the revised demo.

| Check | Result |
|---|---|
| spec AC vs delivered files | Pass for file AC; HTML walk is reviewer |
| 47 demo ids vs catalog | Enforced by `scripts/build_catalog.py` + parity |
| Demo `WHY` vs catalog own/who/why/how/when | Parsed into `screens.json` |
| Swimlane roles vs architecture role filter | `roles[]` from template steps (timeline can be student + system) |
| Biology not a domain entity | Pass — topics/taxonomies only |
| WhatsApp roles | Pass — teacher, parent, admin; student gated |
| New screens invented | None |
| Implement started | No |
| MerchantHub product copy | None |
| Demo completeness | **Partial:** `staff-login` is on t2–t6; Exam-prep (t1) omits it by design. Other spine screens may still sit only on Everything. Role pages are generated filters, not a second feature set. Fill later without new ids. |
| Demo vs architecture disagreement | Demo wins; rebuild catalog + architecture embed |

Gaps that block implement: human walk of architecture HTML. Completeness of six tracks is a later feature, not a reason to invent screens.
