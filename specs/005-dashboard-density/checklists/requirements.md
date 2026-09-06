# 005 requirements checklist

- [x] Same 47 catalog screen ids
- [x] Same `/api/v1` paths; additive JSON only
- [x] Aggregates in `services/progress.py`
- [x] No new tables / columns (meta in existing fields)
- [x] Historical attendance only — no pre-write for the live upcoming class
- [x] Parent scoped to linked child
- [x] Workspace isolation (language teacher cannot see exam-prep chase names)
- [x] Mock payments; `live_calls == 0`
- [x] Seed named facts after catalog pack
- [x] T7.12 PM Accept (wired matches demo density on eight screens)
