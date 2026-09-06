# 005 analyze

Cross-check of spec vs plan vs tasks. No new screen ids. No new `/api/v1` paths.

| AC | Spec | Plan | Task |
|---|---|---|---|
| 1 student-dash named facts | story 1 | `GET /me/dashboard` keys | T7.3, T7.7 |
| 2 teacher-dash bars + chase | story 2 | `GET /teacher/dashboard` keys | T7.4, T7.8 |
| 3 owner scorecard + quotas | story 3 | `GET /owner/console` keep `usage` | T7.5, T7.9 |
| 4 parent numeric slice | story 4 | `GET /parent/home` per child | T7.6, T7.9 |
| 5 payments due + receipts | story 5 | invoice `due_on` / `receipt_id` | T7.6, T7.9 |
| 6 library / lesson kind | story 6 | content `kind` / notes | T7.6, T7.7 |
| 7 reports term slice | story 7 | keep list + term fields | T7.6, T7.9 |
| 8 isolation + thin routers | story 8 | `progress.py` | T7.2, T7.10 |
| 9 no 48th screen | out of scope | same catalog ids | T7.1–T7.12 |
| 10 ledger tables only | story 8 | no new tables | T7.2 |
| 11 seed after `--reset` | story 9 | `seed_density.py` | T7.1 |
| 12 pytest + live_calls 0 | story 8 | `test_005_density.py` | T7.10 |
| 13 catalog + product map | story 10 | `shows` rebuild | T7.11 |

Duplicates: none material. Underspec: public academy homepage stays out of scope. Overlap with 004: chrome stays; 005 only fills payloads and the eight density screens.
