"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CohortChat } from "@/components/studio/CohortChat";
import { HourlyBillingPanel } from "@/components/studio/HourlyBillingPanel";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err, rupees } from "./bits";

const SUBJECT_TRACKS = ["Physics", "Chemistry", "Mathematics", "Biology", "General"] as const;
const SCHEDULE_CADENCES = [
  "Mon–Fri · 4:00 PM",
  "Tue/Thu/Sat · 6:00 PM",
  "Weekend Fast-Track · 10:00 AM",
] as const;

type Cohort = {
  id: string;
  name: string;
  student_ids: string[];
  invite_token?: string;
  waitlist?: string[];
  billing_mode?: string;
  hourly_rate_cents?: number;
};
type Student = { id: string; display_name: string };
type StaffRow = { id: string; display_name: string; role: string };

export function CohortBuilderScreen() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  const [subjectTrack, setSubjectTrack] = useState<string>(SUBJECT_TRACKS[0]);
  const [cadence, setCadence] = useState<string>(SCHEDULE_CADENCES[0]);
  const [teacherName, setTeacherName] = useState<string>("Sudhakshina");
  const [name, setName] = useState<string>(`${SUBJECT_TRACKS[0]} · ${SCHEDULE_CADENCES[0]}`);
  const [picked, setPicked] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState<boolean>(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState("");

  function load() {
    Promise.all([
      api("/api/v1/cohorts"),
      api("/api/v1/students"),
      api("/api/v1/staff").catch(() => []),
    ])
      .then(([c, s, st]) => {
        const cohortRows = Array.isArray(c) ? (c as Cohort[]) : [];
        const studentRows = Array.isArray(s) ? (s as Student[]) : [];
        const staffRows = Array.isArray(st) ? (st as StaffRow[]) : [];
        setCohorts(cohortRows);
        setStudents(studentRows);
        setStaff(staffRows);
        const firstTeacher = staffRows.find((m) => m.role === "teacher") || staffRows[0];
        if (firstTeacher?.display_name) {
          setTeacherName(firstTeacher.display_name);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  function updatePreset(nextSubject: string, nextCadence: string, nextTeacher: string) {
    setSubjectTrack(nextSubject);
    setCadence(nextCadence);
    setTeacherName(nextTeacher);
    setName(`${nextSubject} (${nextCadence}) — ${nextTeacher}`);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const cohortTitle = name.trim() || `${subjectTrack} · ${cadence}`;
      const row = (await api("/api/v1/cohorts", {
        method: "POST",
        body: JSON.stringify({ name: cohortTitle }),
      })) as Cohort;
      if (picked.length) {
        await api(`/api/v1/cohorts/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({ student_ids: picked }),
        });
      }
      setPicked([]);
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const studentById = new Map(students.map((s) => [s.id, s.display_name]));
  const teacherOptions = staff.length
    ? staff.map((m) => m.display_name)
    : ["Sudhakshina", "Prof. Rajesh Verma", "Ananya Nair"];

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Cohorts &amp; Student Batches</h2>
          <span className="k">
            View active student batches, configure hourly or flat-plan billing, and launch new subject cohorts
          </span>
        </div>
        <div className="page-toolbar__actions">
          <button
            type="button"
            className="hot hot--btn"
            onClick={() => setShowCreate((prev) => !prev)}
          >
            {showCreate ? "Hide Cohort Builder" : "+ New Cohort"}
          </button>
          <Link href={catalogRoute("schedule")} className="btn btn--sm">
            Go to Schedule
          </Link>
        </div>
      </div>

      <Err message={error} />

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="stat__v">{cohorts.length}</div>
          <div className="stat__l">Active Cohorts</div>
        </div>
        <div className="stat">
          <div className="stat__v">{students.length}</div>
          <div className="stat__l">Workspace Students</div>
        </div>
        <div className="stat">
          <div className="stat__v">
            {cohorts.reduce((acc, c) => acc + (c.waitlist?.length || 0), 0)}
          </div>
          <div className="stat__l">Waitlisted Students</div>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* Left / Primary Column: Active Cohorts List First */}
        <div>
          <div className="sb" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Active Batches ({cohorts.length})</h3>
          </div>
          {cohorts.length === 0 ? (
            <Empty>No cohorts created yet. Use the form to create your first batch.</Empty>
          ) : (
            cohorts.map((c) => {
              const enrolledNames = (c.student_ids || [])
                .map((sid) => studentById.get(sid))
                .filter(Boolean);
              const isHourly = c.billing_mode === "hourly";
              return (
                <div key={c.id} className="card">
                  <div className="sb" style={{ flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div className="t">{c.name}</div>
                      <div className="s muted" style={{ marginTop: 4 }}>
                        {(c.student_ids || []).length} enrolled student
                        {(c.student_ids || []).length === 1 ? "" : "s"}
                        {enrolledNames.length ? ` (${enrolledNames.slice(0, 3).join(", ")})` : ""}
                        {(c.waitlist || []).length > 0 ? ` · ${(c.waitlist || []).length} on waitlist` : ""}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className={`pill ${isHourly ? "is-info" : "is-good"}`}>
                        {isHourly && c.hourly_rate_cents
                          ? `Hourly · ${rupees(c.hourly_rate_cents)}/hr`
                          : "Standard Term Plan"}
                      </span>
                      <button
                        className="btn btn--sm"
                        type="button"
                        onClick={() => setOpenId(openId === c.id ? "" : c.id)}
                      >
                        {openId === c.id ? "Hide Details" : "Billing & Class Chat"}
                      </button>
                    </div>
                  </div>
                  {openId === c.id ? (
                    <div style={{ marginTop: 12 }}>
                      <HourlyBillingPanel cohortId={c.id} />
                      <CohortChat cohortId={c.id} title="Class Announcements & Chat" />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Constrained Creation Form */}
        <div>
          <form onSubmit={onCreate} className="card">
            <div className="sb" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{showCreate ? "Create New Cohort" : "Quick Cohort Builder"}</h3>
              <span className="pill is-info">Preset Composer</span>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Subject / Track</span>
                <select
                  className="field__in"
                  value={subjectTrack}
                  onChange={(e) => updatePreset(e.target.value, cadence, teacherName)}
                >
                  {SUBJECT_TRACKS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Schedule Cadence</span>
                <select
                  className="field__in"
                  value={cadence}
                  onChange={(e) => updatePreset(subjectTrack, e.target.value, teacherName)}
                >
                  {SCHEDULE_CADENCES.map((cad) => (
                    <option key={cad} value={cad}>
                      {cad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field form-grid__full">
                <span>Lead Teacher</span>
                <select
                  className="field__in"
                  value={teacherName}
                  onChange={(e) => updatePreset(subjectTrack, cadence, e.target.value)}
                >
                  {teacherOptions.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field form-grid__full">
                <span>Cohort Title</span>
                <input
                  className="field__in"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <em>Auto-composed from your subject, schedule cadence, and teacher selection above.</em>
              </label>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <span>Enroll Students ({picked.length} selected)</span>
              <div className="chips">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip${picked.includes(s.id) ? " on" : ""}`}
                    onClick={() =>
                      setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))
                    }
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="card card--wash" style={{ padding: "12px 14px", marginBottom: 12 }}>
              <div className="k" style={{ marginBottom: 6 }}>Included with every cohort</div>
              <div className="s" style={{ color: "var(--ink)" }}>
                ✓ Shared class calendar &amp; 1-click room link · ✓ Scoped practice sets &amp; assessments · ✓ Student &amp; parent progress feed
              </div>
            </div>

            <button className="hot hot--btn" type="submit" disabled={busy}>
              {busy ? "Creating Cohort…" : "Create Cohort"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
