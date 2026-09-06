"use client";

import { API_BASE } from "@/lib/api";
import { CATALOG_SCREENS, EXAM_PREP_HIDE } from "@/lib/screens";
import { MOCK_TENANTS, OTP_CODE } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export function CatalogIndex() {
  const screens = CATALOG_SCREENS.filter((s) => !EXAM_PREP_HIDE.has(s.id));
  const staff = CATALOG_SCREENS.find((s) => s.id === "staff-login");
  return (
    <main className="frame">
      <p className="eyebrow">TutorOS · local shells</p>
      <h1>All 47 catalog screens</h1>
      <p className="lede">
        This is not a 48th screen. Product home is <a href="/app/student/router">/app/student/router</a>.
        Each link is an existing catalog route. Demo HTML remains UI gold until a screen is wired. API:{" "}
        <code>{API_BASE}</code>. OTP <code>{OTP_CODE}</code>.
      </p>
      <dl className="mocks">
        <div><dt>Default tenant</dt><dd>{exam.label} ({exam.kind})</dd></div>
        <div><dt>Workspace id</dt><dd>{exam.workspaceId}</dd></div>
        <div><dt>Teacher phone</dt><dd>{exam.phones.teacher}</dd></div>
        <div><dt>Student phone</dt><dd>{exam.phones.student}</dd></div>
        <div><dt>Parent phone</dt><dd>{exam.phones.parent}</dd></div>
        <div><dt>Owner phone</dt><dd>{exam.phones.owner}</dd></div>
        <div><dt>Teacher email</dt><dd>{exam.emails.teacher}</dd></div>
        <div><dt>Student id</dt><dd>{exam.studentId}</dd></div>
        <div><dt>Session id</dt><dd>{exam.sessionId}</dd></div>
        <div><dt>Cohort id</dt><dd>{exam.cohortId}</dd></div>
        <div><dt>Mock video</dt><dd>mock://meet/&lt;session id&gt; after Attach mock video link</dd></div>
      </dl>
      <p className="phones">
        Exam-prep faculty signs in with teacher OTP on any faculty screen. staff-login is omitted
        here because the exam-prep template hides it. Switch tenant to language or music on a
        screen if you need staff-login.
      </p>
      <nav className="catalog-nav" aria-label="All catalog screens">
        {screens.map((s) => (
          <a key={s.id} href={s.route}>
            {s.id}
          </a>
        ))}
        {staff ? (
          <a href={staff.route} title="Hidden on exam-prep nav; still a catalog screen">
            staff-login (other templates)
          </a>
        ) : null}
      </nav>
    </main>
  );
}
