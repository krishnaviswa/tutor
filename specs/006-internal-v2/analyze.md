# 006 analyze

Cross-check of spec vs plan vs tasks. No new screen ids. No new `/api/v1` path ids. No live ports.

| AC | Spec | Plan | Task |
|---|---|---|---|
| 1 assistant 404 | story 1 | staff `meta.modules` | T8.3 |
| 2 multi-guardian fees | story 2 | parent_links.meta | T8.3 |
| 3 invite + waitlist | story 3 | cohorts.meta | T8.3 |
| 4 dual auth methods | story 4 | branding.auth_methods | T8.3 |
| 5 conflict + booking | story 5 | POST /sessions 409 | T8.4 |
| 6 in-app chat/mcq | story 6 | engagement kinds | T8.4 |
| 7 record capture | story 7 | record + local_put | T8.4 |
| 8 playlist/drip | story 8 | content.meta | T8.4 |
| 9 rubric/late | story 9 | assignments.meta | T8.4 |
| 10–15 practice | stories 10–15 | questions/tests/analysis | T8.5 |
| 16–20 record | stories 16–20 | doubts/threads/timeline | T8.6 |
| 21–24 ops + tracks | stories 21–24 | invoices/automation/demo | T8.7 |
| 18 pytest + sealed | AC 18 | factory + live_calls | T8.9, T8.11 |

Duplicates: none material vs 005 (005 stays dashboard facts). Underspec: no new waitlist collection path. Overlap with 004: chrome stays.
