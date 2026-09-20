"""Cross-role golden-path smoke test: teach -> bill -> pay -> parent visibility.

Chains what the individual 002-007 suites only test in isolation, so a break in how the
screens hand session/invoice ids to each other (see billing-subscription-plan.html /
integrations-backlog-and-golden-path.html §2) shows up here instead of only in a live demo.
"""

from app.services.seed import PEOPLE_EXAM, WS_EXAM, cid
from tests.helpers import auth, login

ONE_ON_ONE_SESSION = cid("0001", 56)
STUDENT = cid("0001", 20)


def test_teach_bill_pay_parent_walkthrough(client):
    # 1. Teacher delivers the session — record + attendance fan out to the timeline.
    teacher_h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    rec = client.patch(
        f"/api/v1/sessions/{ONE_ON_ONE_SESSION}/record",
        headers=teacher_h,
        json={"notes": "Covered ratios", "attendance": [{"student_id": STUDENT, "status": "present"}]},
    )
    assert rec.status_code == 200, rec.text
    assert rec.json()["timeline_event_ids"]
    row = client.get(f"/api/v1/sessions/{ONE_ON_ONE_SESSION}", headers=teacher_h).json()
    assert row["status"] == "completed"
    assert row["display_status"] == "Staff completed"

    # 2. Owner issues a plan-driven invoice for the same student.
    owner_h = auth(login(client, "+9101o", WS_EXAM, "owner"))
    plans = client.get("/api/v1/plans", headers=owner_h).json()
    assert plans, "exam-prep workspace should have seeded plans"
    plan = plans[0]
    inv = client.post(
        "/api/v1/invoices",
        headers=owner_h,
        json={
            "student_id": STUDENT,
            "amount_cents": 0,
            "plan_id": plan["id"],
            "auto": True,
            "days_used": 10,
        },
    )
    assert inv.status_code == 200, inv.text
    invoice = inv.json()
    assert invoice["status"] == "open"
    assert invoice["amount_cents"] > 0

    # 3. Student sees the open invoice, then pays it through the mock checkout port.
    student_h = auth(login(client, "+9101s", WS_EXAM, "student"))
    mine = {r["id"]: r for r in client.get("/api/v1/invoices/mine", headers=student_h).json()}
    assert invoice["id"] in mine
    assert mine[invoice["id"]]["status"] == "open"

    pay = client.post("/api/v1/payments/checkout", headers=student_h, json={"invoice_id": invoice["id"]})
    assert pay.status_code == 200, pay.text
    assert pay.json()["status"] == "paid"

    mine_after = {r["id"]: r for r in client.get("/api/v1/invoices/mine", headers=student_h).json()}
    assert mine_after[invoice["id"]]["status"] == "paid"

    # 4. The linked parent sees the same paid invoice (fee visibility defaults on).
    parent_h = auth(login(client, "+9101p", WS_EXAM, "parent"))
    parent_view = {r["id"]: r for r in client.get("/api/v1/invoices/mine", headers=parent_h).json()}
    assert invoice["id"] in parent_view
    assert parent_view[invoice["id"]]["status"] == "paid"
