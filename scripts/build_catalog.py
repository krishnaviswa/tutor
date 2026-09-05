"""Generate catalog JSON from tutor-platform-demo.html S{} plus planned contracts."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "tutor-platform-demo.html"
OUT = ROOT / "catalog"

PHASE_BY_MOD = {
    "A1": 0, "A2": 0, "A3": 0, "A4": 3, "A5": 1,
    "B1": 1, "B2": 1, "B3": 1, "B4": 3, "B5": 2, "B6": 2,
    "C1": 2, "C2": 2, "C3": 3, "C4": 2, "C5": 2, "C6": 4,
    "D1": 3, "D2": 3, "D3": 3, "D4": 0, "D5": 1,
    "E1": 1, "E2": 2, "E3": 3, "E4": 3, "E5": 3,
    "F1": 4, "F2": 0, "F3": 4, "F4": 4, "F5": 4, "F6": 4,
    "G1": 0, "G2": 0, "G3": 4, "G4": 4, "G5": 4,
}

ROLE_PATH = {"student": "student", "faculty": "faculty", "admin": "admin", "parent": "parent"}

# Planned contracts: screen id -> (apis, entities, ports, timeline events, shows)
CONTRACTS: dict[str, dict] = {
    "router": {
        "apis": ["GET /api/v1/auth/me"],
        "entities": ["users", "sessions_auth"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Pick a role: student, staff, or parent. Routes to the matching sign-in.",
    },
    "student-login": {
        "apis": ["POST /api/v1/auth/otp/start", "POST /api/v1/auth/otp/verify", "POST /api/v1/auth/magic-link"],
        "entities": ["users", "identities", "sessions_auth"],
        "ports": ["sms", "email"],
        "timelineEvents": [],
        "shows": "Student sign-in (phone OTP default, email magic link optional). No password in v1.",
    },
    "staff-login": {
        "apis": ["POST /api/v1/auth/otp/start", "POST /api/v1/auth/otp/verify", "POST /api/v1/auth/magic-link"],
        "entities": ["users", "identities", "staff_memberships", "sessions_auth"],
        "ports": ["sms", "email"],
        "timelineEvents": [],
        "shows": "Staff sign-in for teacher, assistant, or owner.",
    },
    "wsetup": {
        "apis": ["POST /api/v1/workspaces", "PATCH /api/v1/workspaces/current"],
        "entities": ["workspaces", "feature_flags"],
        "ports": ["email"],
        "timelineEvents": [],
        "shows": "Create workspace: name, timezone, subdomain. Always-on core flags on.",
    },
    "branding": {
        "apis": ["GET /api/v1/workspaces/current", "PATCH /api/v1/workspaces/current/branding"],
        "entities": ["workspaces"],
        "ports": ["storage"],
        "timelineEvents": [],
        "shows": "Logo, colours, subdomain. Custom domain later.",
    },
    "roster": {
        "apis": ["GET /api/v1/students", "POST /api/v1/students", "POST /api/v1/students/import"],
        "entities": ["students", "enrollments", "cohorts"],
        "ports": ["email"],
        "timelineEvents": ["student.enrolled"],
        "shows": "Student list, add, CSV import. Admin WhatsApp on new enrollment if opted in.",
    },
    "cohort-builder": {
        "apis": ["GET /api/v1/cohorts", "POST /api/v1/cohorts", "PATCH /api/v1/cohorts/{id}"],
        "entities": ["cohorts", "enrollments", "topics"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Batches / groups / 1-on-1 pairings. Topic taxonomy is tenant-defined.",
    },
    "parent-link": {
        "apis": ["POST /api/v1/parent-links", "POST /api/v1/parent-links/{token}/accept"],
        "entities": ["parent_links", "students"],
        "ports": ["whatsapp", "email", "sms"],
        "timelineEvents": ["parent.linked"],
        "shows": "Invite token to link a guardian to a student.",
    },
    "parent-home": {
        "apis": ["GET /api/v1/parent/home"],
        "entities": ["students", "attendance", "timeline_events"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Read-mostly: attendance, reports, fees for linked students.",
    },
    "schedule": {
        "apis": ["GET /api/v1/sessions", "POST /api/v1/sessions", "PATCH /api/v1/sessions/{id}"],
        "entities": ["scheduled_sessions", "cohorts"],
        "ports": ["calendar_video", "whatsapp"],
        "timelineEvents": ["session.scheduled", "session.rescheduled", "session.cancelled"],
        "shows": "Calendar of sessions. Create/reschedule notifies teacher, parent, admin via D5.",
    },
    "session-pre": {
        "apis": ["GET /api/v1/sessions/{id}", "POST /api/v1/sessions/{id}/video-link"],
        "entities": ["scheduled_sessions", "session_records"],
        "ports": ["calendar_video"],
        "timelineEvents": [],
        "shows": "Pre-class detail: topic, cohort, Meet or Teams link, join URL.",
    },
    "join": {
        "apis": ["GET /api/v1/join/{token}", "POST /api/v1/join/{token}/enter"],
        "entities": ["scheduled_sessions", "attendance"],
        "ports": ["calendar_video"],
        "timelineEvents": ["session.joined"],
        "shows": "Waiting room. Students join through the platform; Meet URL is not the attendance source.",
    },
    "live-teacher": {
        "apis": ["GET /api/v1/sessions/{id}/live", "POST /api/v1/sessions/{id}/engagement"],
        "entities": ["scheduled_sessions", "attendance"],
        "ports": ["calendar_video"],
        "timelineEvents": [],
        "shows": "Teacher console shell around the video session.",
    },
    "live-student": {
        "apis": ["GET /api/v1/sessions/{id}/live"],
        "entities": ["scheduled_sessions", "attendance"],
        "ports": ["calendar_video"],
        "timelineEvents": [],
        "shows": "Student live view / waiting overlay.",
    },
    "session-video": {
        "apis": ["GET /api/v1/sessions/{id}/video"],
        "entities": ["session_records", "transcript_events"],
        "ports": ["calendar_video"],
        "timelineEvents": [],
        "shows": "Recording / Meet or Teams link. Transcript panel empty until STT or import.",
    },
    "record": {
        "apis": ["GET /api/v1/sessions/{id}/record", "PATCH /api/v1/sessions/{id}/record"],
        "entities": ["session_records", "attendance", "timeline_events"],
        "ports": ["storage"],
        "timelineEvents": ["session.recorded"],
        "shows": "Attendance, notes, board photos, link. Fan-out to each attendee timeline.",
    },
    "library": {
        "apis": ["GET /api/v1/content", "POST /api/v1/content"],
        "entities": ["content_items", "topics"],
        "ports": ["storage"],
        "timelineEvents": [],
        "shows": "Lessons, files, links. Visibility per cohort.",
    },
    "lesson": {
        "apis": ["GET /api/v1/content/{id}"],
        "entities": ["content_items", "topics"],
        "ports": ["storage"],
        "timelineEvents": ["content.viewed"],
        "shows": "Single lesson / module viewer.",
    },
    "assign-issue": {
        "apis": ["POST /api/v1/assignments", "GET /api/v1/assignments"],
        "entities": ["assignments", "cohorts", "topics"],
        "ports": ["whatsapp"],
        "timelineEvents": ["assignment.issued"],
        "shows": "Issue homework with due date.",
    },
    "assign-grade": {
        "apis": ["GET /api/v1/assignments/{id}/submissions", "POST /api/v1/assignments/{id}/grade"],
        "entities": ["assignments", "submissions"],
        "ports": ["storage"],
        "timelineEvents": ["assignment.graded"],
        "shows": "Submit, grade, return.",
    },
    "qbank": {
        "apis": ["GET /api/v1/questions", "POST /api/v1/questions"],
        "entities": ["questions", "topics"],
        "ports": ["storage"],
        "timelineEvents": [],
        "shows": "Item bank tagged by tenant taxonomy, not a hardcoded syllabus.",
    },
    "practice-build": {
        "apis": ["POST /api/v1/practice-sets", "GET /api/v1/practice-sets"],
        "entities": ["practice_sets", "questions"],
        "ports": ["whatsapp"],
        "timelineEvents": ["practice.assigned"],
        "shows": "Same-day or scheduled practice set from tags or hand-pick.",
    },
    "practice-play": {
        "apis": ["GET /api/v1/practice-sets/{id}/play", "POST /api/v1/practice-sets/{id}/attempt"],
        "entities": ["attempts", "practice_sets"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Student practice player.",
    },
    "practice-result": {
        "apis": ["GET /api/v1/attempts/{id}"],
        "entities": ["attempts", "timeline_events"],
        "ports": [],
        "timelineEvents": ["practice.completed"],
        "shows": "Score plus tagged misses. A row cannot close on a percentage alone.",
    },
    "test-setup": {
        "apis": ["POST /api/v1/tests", "GET /api/v1/tests"],
        "entities": ["tests", "questions"],
        "ports": [],
        "timelineEvents": ["test.scheduled"],
        "shows": "Timed paper setup.",
    },
    "test-runner": {
        "apis": ["GET /api/v1/tests/{id}/run", "POST /api/v1/tests/{id}/submit"],
        "entities": ["attempts", "tests"],
        "ports": [],
        "timelineEvents": ["test.submitted"],
        "shows": "Student test runner with timer.",
    },
    "analysis": {
        "apis": ["GET /api/v1/analysis/{cohortId}", "PATCH /api/v1/analysis/{id}/action"],
        "entities": ["attempts", "topics"],
        "ports": [],
        "timelineEvents": ["analysis.actioned"],
        "shows": "Most-missed items, tags, required action.",
    },
    "doubt-student": {
        "apis": ["GET /api/v1/doubts", "POST /api/v1/doubts"],
        "entities": ["doubts", "topics"],
        "ports": ["storage", "whatsapp"],
        "timelineEvents": ["doubt.asked"],
        "shows": "Photo or text doubt. Honest queue, not fake instant.",
    },
    "doubt-teacher": {
        "apis": ["GET /api/v1/doubts/queue", "PATCH /api/v1/doubts/{id}"],
        "entities": ["doubts"],
        "ports": ["whatsapp"],
        "timelineEvents": ["doubt.answered"],
        "shows": "Teacher triage. SLA timer. WhatsApp ping on new / SLA, not a second inbox.",
    },
    "messages": {
        "apis": ["GET /api/v1/threads", "POST /api/v1/threads/{id}/messages"],
        "entities": ["messages"],
        "ports": ["whatsapp"],
        "timelineEvents": ["message.sent"],
        "shows": "In-platform threads so the record exists. WhatsApp may notify.",
    },
    "announce": {
        "apis": ["POST /api/v1/announcements", "GET /api/v1/announcements"],
        "entities": ["announcements", "cohorts"],
        "ports": ["whatsapp", "push", "email"],
        "timelineEvents": ["announcement.posted"],
        "shows": "One-to-cohort broadcast. Parent WhatsApp if opted in.",
    },
    "timeline": {
        "apis": ["GET /api/v1/students/{id}/timeline"],
        "entities": ["timeline_events"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Append-only event stream for one student. The ledger.",
    },
    "notif-prefs": {
        "apis": ["GET /api/v1/notifications/prefs", "PUT /api/v1/notifications/prefs"],
        "entities": ["notification_prefs"],
        "ports": ["whatsapp", "email", "push", "sms"],
        "timelineEvents": [],
        "shows": "Role-aware channel + event checklist: teacher, parent, admin. Student WhatsApp off unless owner enabled.",
    },
    "student-dash": {
        "apis": ["GET /api/v1/me/dashboard"],
        "entities": ["scheduled_sessions", "practice_sets", "doubts", "timeline_events"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Next session, open practice, doubts, this week.",
    },
    "teacher-dash": {
        "apis": ["GET /api/v1/teacher/dashboard"],
        "entities": ["cohorts", "attendance", "doubts", "practice_sets"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Cohort health: attendance, practice completion, doubt backlog.",
    },
    "owner": {
        "apis": ["GET /api/v1/owner/console", "GET /api/v1/usage"],
        "entities": ["usage_meters", "quota_policies", "workspaces"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Operating scorecard plus quota bars (80% / 100%). Feature kill switches.",
    },
    "reports": {
        "apis": ["GET /api/v1/reports", "POST /api/v1/reports/export"],
        "entities": ["timeline_events"],
        "ports": ["email", "storage"],
        "timelineEvents": ["report.sent"],
        "shows": "Parent/term reports and CSV. Parent WhatsApp when a report is ready.",
    },
    "mentor": {
        "apis": ["GET /api/v1/backlog", "POST /api/v1/backlog/{id}/book"],
        "entities": ["backlog_items", "scheduled_sessions"],
        "ports": ["whatsapp"],
        "timelineEvents": ["backlog.booked"],
        "shows": "Short slots on skipped work — not re-teaching.",
    },
    "billing": {
        "apis": ["GET /api/v1/plans", "POST /api/v1/invoices"],
        "entities": ["invoices", "plans"],
        "ports": ["payments_student"],
        "timelineEvents": ["invoice.issued"],
        "shows": "Student fee plans and invoices (tenant collecting from learners).",
    },
    "payments": {
        "apis": ["GET /api/v1/invoices/mine", "POST /api/v1/payments/checkout"],
        "entities": ["invoices"],
        "ports": ["payments_student", "whatsapp"],
        "timelineEvents": ["payment.captured", "payment.failed"],
        "shows": "Pay an invoice. Admin/parent WhatsApp on captured or failed.",
    },
    "subscription": {
        "apis": ["GET /api/v1/billing/subscription", "PATCH /api/v1/billing/quotas", "POST /api/v1/billing/whatsapp-pause"],
        "entities": ["usage_meters", "quota_policies"],
        "ports": ["payments_platform"],
        "timelineEvents": ["quota.warned", "quota.blocked"],
        "shows": "Tier, meters, caps at or below sold quota, channel matrix, 24h WhatsApp pause.",
    },
    "payouts": {
        "apis": ["GET /api/v1/payouts"],
        "entities": ["payouts", "staff_memberships"],
        "ports": ["payments_platform"],
        "timelineEvents": [],
        "shows": "Multi-teacher payout statements.",
    },
    "audit": {
        "apis": ["GET /api/v1/audit", "POST /api/v1/data-export"],
        "entities": ["audit_log"],
        "ports": ["storage"],
        "timelineEvents": [],
        "shows": "Staff mutation log and data export.",
    },
    "onboard-kind": {
        "apis": ["POST /api/v1/workspaces/current/template"],
        "entities": ["workspaces", "feature_flags"],
        "ports": [],
        "timelineEvents": [],
        "shows": "What kind of tutoring? Sets ~15 module toggles. Not a subject picker.",
    },
    "template-gallery": {
        "apis": ["GET /api/v1/templates", "POST /api/v1/workspaces/current/template"],
        "entities": ["feature_flags"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Named templates: exam-prep, 1-on-1, K-12, skills, music, everything.",
    },
    "automation": {
        "apis": ["GET /api/v1/automation-rules", "PATCH /api/v1/automation-rules/{id}"],
        "entities": ["automation_rules"],
        "ports": [],
        "timelineEvents": [],
        "shows": "Opt-in when → then rules. Opinion as choice, not law.",
    },
    "integrations": {
        "apis": ["GET /api/v1/integrations", "POST /api/v1/integrations/{name}/connect"],
        "entities": ["workspaces"],
        "ports": ["calendar_video", "whatsapp", "sms", "email", "payments_student", "payments_platform"],
        "timelineEvents": ["integration.disconnected"],
        "shows": "Connect Google, Teams, WhatsApp, SMS, email, payments. Freeze a port without deleting data.",
    },
}

DOMAINS = {
    "A": "Identity & access",
    "B": "Teaching & sessions",
    "C": "Practice & assessment",
    "D": "Record & communication",
    "E": "Progress & analytics",
    "F": "Business & operations",
    "G": "Configuration & templates",
}


def parse_screens() -> list[dict]:
    text = DEMO.read_text(encoding="utf-8")
    block = re.search(r"var S=\{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit("Could not find var S={...} in tutor-platform-demo.html")
    rows = re.findall(
        r"'([a-z0-9-]+)':\{t:'([^']+)',role:'(\w+)',frame:'(\w+)',mod:'(\w+)',dom:'(\w+)'\}",
        block.group(1),
    )
    screens = []
    for sid, title, role, frame, mod, dom in rows:
        extra = CONTRACTS.get(sid, {})
        role_seg = ROLE_PATH.get(role, role)
        route = f"/app/{role_seg}" if sid in {"student-dash", "parent-home", "owner"} else f"/app/{role_seg}/{sid}"
        screens.append(
            {
                "id": sid,
                "title": title,
                "route": route,
                "role": role,
                "frame": frame,
                "module": mod,
                "domain": dom,
                "domainName": DOMAINS[dom],
                "phase": PHASE_BY_MOD.get(mod, 4),
                "status": "empty",
                "demoKey": sid,
                "figmaNodeId": None,
                "apis": extra.get("apis", []),
                "entities": extra.get("entities", []),
                "ports": extra.get("ports", []),
                "timelineEvents": extra.get("timelineEvents", []),
                "shows": extra.get("shows", title),
                "own": "",
                "who": "",
                "why": "",
                "how": "",
                "when": "",
                "roles": [role],
            }
        )
    missing = set(CONTRACTS) - {s["id"] for s in screens}
    extra_ids = {s["id"] for s in screens} - set(CONTRACTS)
    if missing or extra_ids:
        raise SystemExit(f"Contract mismatch missing={sorted(missing)} extra={sorted(extra_ids)}")
    why = parse_why(text)
    missing_why = {s["id"] for s in screens} - set(why)
    extra_why = set(why) - {s["id"] for s in screens}
    if missing_why or extra_why:
        raise SystemExit(f"WHY mismatch missing={sorted(missing_why)} extra={sorted(extra_why)}")
    by_id = {s["id"]: s for s in screens}
    for sid, w in why.items():
        by_id[sid].update(w)
    return screens


def parse_why(text: str) -> dict[str, dict]:
    block = re.search(r"var WHY=\{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit("Could not find var WHY={...} in tutor-platform-demo.html")
    rows = re.findall(
        r"'([a-z0-9-]+)':\{own:'([^']*)',who:'([^']*)',why:'([^']*)',how:'([^']*)',when:'([^']*)'\}",
        block.group(1),
    )
    return {
        sid: {"own": own, "who": who, "why": why, "how": how, "when": when}
        for sid, own, who, why, how, when in rows
    }


def modules() -> list[dict]:
    return [
        {"id": "A1", "name": "Workspace & branding", "dependsOn": [], "phase": 0, "alwaysOn": True, "entities": ["workspaces"]},
        {"id": "A2", "name": "Student accounts", "dependsOn": ["A1"], "phase": 0, "alwaysOn": True, "entities": ["users", "identities"]},
        {"id": "A3", "name": "Staff accounts & roles", "dependsOn": ["A1"], "phase": 0, "alwaysOn": True, "entities": ["staff_memberships"]},
        {"id": "A4", "name": "Parent / guardian accounts", "dependsOn": ["A2"], "phase": 3, "alwaysOn": False, "entities": ["parent_links"]},
        {"id": "A5", "name": "Enrollment & cohorts", "dependsOn": ["A2", "A3"], "phase": 1, "alwaysOn": False, "entities": ["cohorts", "enrollments", "students"]},
        {"id": "B1", "name": "Scheduling & calendar", "dependsOn": ["A5"], "phase": 1, "alwaysOn": False, "entities": ["scheduled_sessions"]},
        {"id": "B2", "name": "Live session + video link", "dependsOn": ["B1"], "phase": 1, "alwaysOn": False, "entities": ["scheduled_sessions"]},
        {"id": "B3", "name": "Session record", "dependsOn": ["B2"], "phase": 1, "alwaysOn": False, "entities": ["session_records", "attendance"]},
        {"id": "B4", "name": "In-session engagement", "dependsOn": ["B2"], "phase": 3, "alwaysOn": False, "entities": []},
        {"id": "B5", "name": "Content library", "dependsOn": ["A1"], "phase": 2, "alwaysOn": False, "entities": ["content_items"]},
        {"id": "B6", "name": "Assignments", "dependsOn": ["A5"], "phase": 2, "alwaysOn": False, "entities": ["assignments", "submissions"]},
        {"id": "C1", "name": "Question bank", "dependsOn": ["A1"], "phase": 2, "alwaysOn": False, "entities": ["questions"]},
        {"id": "C2", "name": "Practice sets", "dependsOn": ["C1"], "phase": 2, "alwaysOn": False, "entities": ["practice_sets"]},
        {"id": "C3", "name": "Tests & mocks", "dependsOn": ["C1"], "phase": 3, "alwaysOn": False, "entities": ["tests"]},
        {"id": "C4", "name": "Auto-grading", "dependsOn": ["C2"], "phase": 2, "alwaysOn": False, "entities": ["attempts"]},
        {"id": "C5", "name": "Analysis & remediation", "dependsOn": ["C4"], "phase": 2, "alwaysOn": False, "entities": ["attempts"]},
        {"id": "C6", "name": "Adaptive practice", "dependsOn": ["C5"], "phase": 4, "alwaysOn": False, "entities": ["attempts"]},
        {"id": "D1", "name": "Doubts queue", "dependsOn": ["A2"], "phase": 3, "alwaysOn": False, "entities": ["doubts"]},
        {"id": "D2", "name": "Message threads", "dependsOn": ["A2", "A3"], "phase": 3, "alwaysOn": False, "entities": ["messages"]},
        {"id": "D3", "name": "Announcements", "dependsOn": ["A5"], "phase": 3, "alwaysOn": False, "entities": ["announcements"]},
        {"id": "D4", "name": "Student timeline", "dependsOn": ["A2"], "phase": 0, "alwaysOn": True, "entities": ["timeline_events"]},
        {"id": "D5", "name": "Notifications", "dependsOn": ["A2"], "phase": 1, "alwaysOn": False, "entities": ["notification_prefs", "notification_deliveries"]},
        {"id": "E1", "name": "Student dashboard", "dependsOn": ["D4"], "phase": 1, "alwaysOn": False, "entities": []},
        {"id": "E2", "name": "Teacher dashboard", "dependsOn": ["E1"], "phase": 2, "alwaysOn": False, "entities": []},
        {"id": "E3", "name": "Owner console", "dependsOn": ["E2"], "phase": 3, "alwaysOn": False, "entities": ["usage_meters"]},
        {"id": "E4", "name": "Reports & exports", "dependsOn": ["E1"], "phase": 3, "alwaysOn": False, "entities": []},
        {"id": "E5", "name": "Mentor / backlog", "dependsOn": ["C5", "A5"], "phase": 3, "alwaysOn": False, "entities": ["backlog_items"]},
        {"id": "F1", "name": "Student billing", "dependsOn": ["A5"], "phase": 4, "alwaysOn": False, "entities": ["invoices", "plans"]},
        {"id": "F2", "name": "Platform subscription & metering", "dependsOn": ["A1"], "phase": 0, "alwaysOn": True, "entities": ["usage_meters", "quota_policies"]},
        {"id": "F3", "name": "Payments", "dependsOn": ["F1"], "phase": 4, "alwaysOn": False, "entities": ["invoices"]},
        {"id": "F4", "name": "Trials, coupons, referrals", "dependsOn": ["F1"], "phase": 4, "alwaysOn": False, "entities": []},
        {"id": "F5", "name": "Multi-teacher payouts", "dependsOn": ["F1", "A3"], "phase": 4, "alwaysOn": False, "entities": ["payouts"]},
        {"id": "F6", "name": "Compliance & data", "dependsOn": ["A1"], "phase": 4, "alwaysOn": False, "entities": ["audit_log"]},
        {"id": "G1", "name": "Module toggle engine", "dependsOn": ["A1"], "phase": 0, "alwaysOn": True, "entities": ["feature_flags"]},
        {"id": "G2", "name": "Templates / presets", "dependsOn": ["G1"], "phase": 0, "alwaysOn": True, "entities": ["feature_flags"]},
        {"id": "G3", "name": "Custom fields & taxonomy", "dependsOn": ["G1"], "phase": 4, "alwaysOn": False, "entities": ["taxonomies", "topics"]},
        {"id": "G4", "name": "Automation rules", "dependsOn": ["G1"], "phase": 4, "alwaysOn": False, "entities": ["automation_rules"]},
        {"id": "G5", "name": "Integrations", "dependsOn": ["A1"], "phase": 4, "alwaysOn": False, "entities": []},
    ]


def parse_flows() -> list[dict]:
    text = DEMO.read_text(encoding="utf-8")
    templates = []
    for tid, name in [
        ("t1", "Exam-prep loop"),
        ("t2", "1-on-1 subject tutor"),
        ("t3", "K-12 homework help"),
        ("t4", "Skills / cohort course"),
        ("t5", "Music / arts"),
        ("t6", "Everything"),
    ]:
        head = re.search(
            rf"id:'{tid}',short:'([^']+)',name:'([^']+)',tint:'([^']+)',tier:'([^']+)',\s*shape:'([^']*)',\s*blurb:'([^']*)'",
            text,
        )
        if not head:
            raise SystemExit(f"{tid} header not found")
        block = re.search(rf"id:'{tid}'.*?steps:\[(.*?)\]\s*\}}", text, re.S)
        if not block:
            raise SystemExit(f"{tid} steps not found")
        raw = re.findall(
            r"\['([a-z0-9-]+)','(\w+)','(\w+)'(?:,'([^']*)')?\]",
            block.group(1),
        )
        steps = []
        tour = []
        roles: list[str] = []
        for sid, role, stage, auto in raw:
            steps.append({
                "screen": sid,
                "role": role,
                "stage": stage,
                "auto": auto or None,
            })
            if role not in roles:
                roles.append(role)
            if not auto and sid not in tour:
                tour.append(sid)
        templates.append({
            "id": tid,
            "short": head.group(1),
            "name": head.group(2),
            "tint": head.group(3),
            "tier": head.group(4),
            "shape": head.group(5),
            "blurb": head.group(6),
            "roles": roles,
            "steps": steps,
            "tour": tour,
        })
    return templates


def attach_swim_roles(screens: list[dict], flows: list[dict]) -> None:
    acc: dict[str, list[str]] = {s["id"]: [] for s in screens}
    for f in flows:
        for st in f["steps"]:
            sid, role = st["screen"], st["role"]
            if sid in acc and role not in acc[sid]:
                acc[sid].append(role)
    for s in screens:
        s["roles"] = acc[s["id"]] or [s["role"]]


def entities() -> list[dict]:
    spine = [
        "workspaces", "users", "identities", "sessions_auth", "staff_memberships",
        "students", "parent_links", "cohorts", "enrollments", "scheduled_sessions",
        "attendance", "session_records", "transcript_events", "timeline_events",
        "feature_flags", "audit_log", "taxonomies", "topics",
    ]
    later = [
        "questions", "attempts", "doubts", "messages", "invoices", "usage_meters",
        "quota_policies", "notification_prefs", "notification_deliveries",
        "content_items", "assignments", "submissions", "practice_sets", "tests",
        "announcements", "plans", "payouts", "automation_rules", "backlog_items",
    ]
    out = [{"id": e, "tier": "spine"} for e in spine]
    out += [{"id": e, "tier": "later"} for e in later]
    return out


def ports() -> list[dict]:
    return [
        {"id": "calendar_video", "env": "VIDEO_PROVIDER", "default": "mock", "live": "google | microsoft"},
        {"id": "sms", "env": "SMS_PROVIDER", "default": "mock", "live": "msg91"},
        {"id": "email", "env": "EMAIL_PROVIDER", "default": "mock", "live": "ses | postmark"},
        {"id": "storage", "env": "STORAGE_PROVIDER", "default": "local", "live": "s3 | r2"},
        {"id": "payments_student", "env": "PAYMENTS_STUDENT_PROVIDER", "default": "mock", "live": "razorpay"},
        {"id": "payments_platform", "env": "PAYMENTS_PLATFORM_PROVIDER", "default": "mock", "live": "stripe"},
        {"id": "push", "env": "PUSH_PROVIDER", "default": "mock", "live": "fcm"},
        {"id": "whatsapp", "env": "WHATSAPP_PROVIDER", "default": "mock", "live": "meta_cloud",
         "roles": ["teacher", "parent", "admin"], "studentDefault": "off"},
    ]


def env_vars() -> list[dict]:
    return [
        {"name": "DATABASE_URL", "comment": "PostgreSQL DSN. No SQLite."},
        {"name": "SMS_PROVIDER", "comment": "mock | msg91"},
        {"name": "EMAIL_PROVIDER", "comment": "mock | ses | postmark"},
        {"name": "VIDEO_PROVIDER", "comment": "mock | google | microsoft"},
        {"name": "STORAGE_PROVIDER", "comment": "local | s3 | r2"},
        {"name": "PAYMENTS_STUDENT_PROVIDER", "comment": "mock | razorpay"},
        {"name": "PAYMENTS_PLATFORM_PROVIDER", "comment": "mock | stripe"},
        {"name": "PUSH_PROVIDER", "comment": "mock | fcm"},
        {"name": "WHATSAPP_PROVIDER", "comment": "mock | meta_cloud"},
        {"name": "SPECIFY_FEATURE_DIRECTORY", "comment": "Override active Spec Kit feature path"},
    ]


def apis(screens: list[dict]) -> list[str]:
    seen = []
    for s in screens:
        for a in s["apis"]:
            if a not in seen:
                seen.append(a)
    return [{"id": a, "status": "planned"} for a in seen]


def main() -> None:
    OUT.mkdir(exist_ok=True)
    screens = parse_screens()
    flows = parse_flows()
    attach_swim_roles(screens, flows)
    mods = modules()
    ents = entities()
    prt = ports()
    env = env_vars()
    api_list = apis(screens)
    (OUT / "screens.json").write_text(json.dumps(screens, indent=2) + "\n", encoding="utf-8")
    (OUT / "modules.json").write_text(json.dumps(mods, indent=2) + "\n", encoding="utf-8")
    (OUT / "flows.json").write_text(json.dumps(flows, indent=2) + "\n", encoding="utf-8")
    (OUT / "entities.json").write_text(json.dumps(ents, indent=2) + "\n", encoding="utf-8")
    (OUT / "ports.json").write_text(json.dumps(prt, indent=2) + "\n", encoding="utf-8")
    (OUT / "env.json").write_text(json.dumps(env, indent=2) + "\n", encoding="utf-8")
    (OUT / "apis.json").write_text(json.dumps(api_list, indent=2) + "\n", encoding="utf-8")
    (OUT / "embed.js").write_text(
        "window.TUTOROS_CATALOG=" + json.dumps({
            "screens": screens,
            "modules": mods,
            "flows": flows,
            "entities": ents,
            "ports": prt,
            "apis": api_list,
            "note": "Demo is UI gold and incomplete. Catalog is generated from tutor-platform-demo.html. Role HTML files are generated children.",
        }) + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {len(screens)} screens")


if __name__ == "__main__":
    main()
