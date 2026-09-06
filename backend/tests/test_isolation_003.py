"""T2.6 — tenant isolation on 003 tables. Does not weaken 002 cases."""

from app.db import session_factory
from app.models.tables import (
    Announcement,
    Assignment,
    Attempt,
    AutomationRule,
    BacklogItem,
    ContentItem,
    Doubt,
    Invoice,
    Message,
    NotificationDelivery,
    NotificationPref,
    Plan,
    Payout,
    PracticeSet,
    Question,
    Submission,
    Test,
)
from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def _db():
    return session_factory()()


def test_002_exam_cannot_read_language_roster_still_holds(client):
    exam_teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    exam_ids = {s["id"] for s in client.get("/api/v1/students", headers=auth(exam_teacher)).json()}
    lang_ids = {s["id"] for s in client.get("/api/v1/students", headers=auth(lang_teacher)).json()}
    assert exam_ids.isdisjoint(lang_ids)


def test_003_new_tables_workspace_scoped(client):
    db = _db()
    exam_teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    exam_student = client.get("/api/v1/students", headers=auth(exam_teacher)).json()[0]["id"]
    lang_student = client.get("/api/v1/students", headers=auth(lang_teacher)).json()[0]["id"]
    exam_user = login(client, "+9101t", WS_EXAM, "teacher")
    # user ids from seed
    from app.services.seed import PEOPLE_EXAM, PEOPLE_LANG

    rows = [
        ContentItem(workspace_id=WS_EXAM, title="exam notes", body="A"),
        ContentItem(workspace_id=WS_LANG, title="lang notes", body="B"),
        Assignment(workspace_id=WS_EXAM, title="exam hw"),
        Assignment(workspace_id=WS_LANG, title="lang hw"),
        Question(workspace_id=WS_EXAM, stem="exam q", answer="1"),
        Question(workspace_id=WS_LANG, stem="lang q", answer="2"),
        PracticeSet(workspace_id=WS_EXAM, title="exam set"),
        PracticeSet(workspace_id=WS_LANG, title="lang set"),
        Test(workspace_id=WS_EXAM, title="exam test"),
        Test(workspace_id=WS_LANG, title="lang test"),
        Doubt(workspace_id=WS_EXAM, student_id=exam_student, body="exam doubt"),
        Doubt(workspace_id=WS_LANG, student_id=lang_student, body="lang doubt"),
        Message(
            workspace_id=WS_EXAM,
            thread_id="thread-exam",
            student_id=exam_student,
            sender_user_id=PEOPLE_EXAM["teacher"],
            body="hi A",
        ),
        Message(
            workspace_id=WS_LANG,
            thread_id="thread-lang",
            student_id=lang_student,
            sender_user_id=PEOPLE_LANG["teacher"],
            body="hi B",
        ),
        Announcement(workspace_id=WS_EXAM, title="exam announce"),
        Announcement(workspace_id=WS_LANG, title="lang announce"),
        NotificationPref(workspace_id=WS_EXAM, user_id=PEOPLE_EXAM["teacher"], prefs={"student": {"whatsapp": False}}),
        NotificationPref(workspace_id=WS_LANG, user_id=PEOPLE_LANG["teacher"], prefs={"student": {"whatsapp": False}}),
        NotificationDelivery(workspace_id=WS_EXAM, channel="whatsapp", to_role="teacher", body="A"),
        NotificationDelivery(workspace_id=WS_LANG, channel="whatsapp", to_role="teacher", body="B"),
        Plan(workspace_id=WS_EXAM, name="exam plan", amount_cents=1000),
        Plan(workspace_id=WS_LANG, name="lang plan", amount_cents=2000),
        AutomationRule(workspace_id=WS_EXAM, name="exam rule"),
        AutomationRule(workspace_id=WS_LANG, name="lang rule"),
        BacklogItem(workspace_id=WS_EXAM, student_id=exam_student, title="exam backlog"),
        BacklogItem(workspace_id=WS_LANG, student_id=lang_student, title="lang backlog"),
        Payout(workspace_id=WS_EXAM, amount_cents=1),
        Payout(workspace_id=WS_LANG, amount_cents=2),
    ]
    db.add_all(rows)
    db.flush()
    exam_asg = db.query(Assignment).filter(Assignment.workspace_id == WS_EXAM).first()
    lang_asg = db.query(Assignment).filter(Assignment.workspace_id == WS_LANG).first()
    db.add(Submission(workspace_id=WS_EXAM, assignment_id=exam_asg.id, student_id=exam_student, body="A"))
    db.add(Submission(workspace_id=WS_LANG, assignment_id=lang_asg.id, student_id=lang_student, body="B"))
    exam_set = db.query(PracticeSet).filter(PracticeSet.workspace_id == WS_EXAM).first()
    lang_set = db.query(PracticeSet).filter(PracticeSet.workspace_id == WS_LANG).first()
    db.add(Attempt(workspace_id=WS_EXAM, student_id=exam_student, practice_set_id=exam_set.id, score=1))
    db.add(Attempt(workspace_id=WS_LANG, student_id=lang_student, practice_set_id=lang_set.id, score=2))
    exam_plan = db.query(Plan).filter(Plan.workspace_id == WS_EXAM).first()
    lang_plan = db.query(Plan).filter(Plan.workspace_id == WS_LANG).first()
    db.add(Invoice(workspace_id=WS_EXAM, student_id=exam_student, plan_id=exam_plan.id, amount_cents=1000))
    db.add(Invoice(workspace_id=WS_LANG, student_id=lang_student, plan_id=lang_plan.id, amount_cents=2000))
    db.commit()

    def ids(model, ws):
        return {r.id for r in db.query(model).filter(model.workspace_id == ws)}

    for model in (
        ContentItem,
        Assignment,
        Submission,
        Question,
        PracticeSet,
        Test,
        Attempt,
        Doubt,
        Message,
        Announcement,
        NotificationPref,
        NotificationDelivery,
        Plan,
        Invoice,
        Payout,
        AutomationRule,
        BacklogItem,
    ):
        assert ids(model, WS_EXAM).isdisjoint(ids(model, WS_LANG)), model.__tablename__
    db.close()
    # silence unused
    assert exam_user
