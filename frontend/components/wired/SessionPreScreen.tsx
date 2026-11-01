"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";
import { Err } from "./bits";

const TZ = "Asia/Kolkata";
const AV_PAL = ["#0071E3", "#5E5CE6", "#FF9F0A", "#FF375F", "#64D2FF", "#30B0C7", "#8E8E93"];

const TOPIC_PRESETS = [
  "Kinematics & Relative Velocity",
  "Electrostatics & Gauss Law",
  "Organic Reaction Mechanisms",
  "Cell Division & Genetics",
  "Calculus — Definite Integration",
  "Problem-Solving & Doubt Clearing",
];

const VIDEO_PRESETS = [
  { id: "meet-a", label: "Google Meet — Room A", url: "https://meet.google.com/tutor-room-a" },
  { id: "zoom-main", label: "Zoom Classroom — Studio 1", url: "https://zoom.us/j/tutor-studio-1" },
  { id: "in-app", label: "In-App Audio + Live Whiteboard", url: "https://classroom.tutoros.app/live" },
];

type SessionRow = {
  id: string;
  workspace_id: string;
  cohort_id?: string | null;
  student_id?: string | null;
  student_ids?: string[];
  mode?: string;
  title: string;
  starts_at: string | null;
  subject_label?: string;
  library_item_id?: string | null;
  teacher_user_id?: string | null;
};

const CLASS_LOCK = "Only the assigned teacher or the owner can change this class.";

type StudentRow = {
  id: string;
  display_name: string;
};

type CohortRow = {
  id: string;
  name: string;
  student_ids?: string[];
};

type ContentRow = {
  id: string;
  title: string;
  subject_label?: string;
  file_kind?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || " ") + (parts[1]?.[0] || "")).toUpperCase();
}

function avColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PAL[h % AV_PAL.length];
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Time to be scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function choiceStatus(draft: string, saved: string): "Not chosen" | "Not saved" | "Saved" {
  if (!draft) return "Not chosen";
  if (draft !== saved) return "Not saved";
  return "Saved";
}

function choiceTone(label: string): string {
  if (label === "Saved") return "is-good";
  if (label === "Not saved") return "is-warn";
  return "is-info";
}

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, index) => id === b[index]);
}

function isOneOnOne(sess: SessionRow): boolean {
  return sess.mode === "1-on-1" || Boolean(sess.student_id) || !sess.cohort_id;
}

function humanVideoBadge(url: string | null): { label: string; tone: string } {
  if (!url) return { label: "Not generated yet", tone: "warn" };
  const match = VIDEO_PRESETS.find((p) => p.url === url);
  if (match) return { label: `${match.label} · Ready`, tone: "good" };
  if (url.includes("meet.google.com")) return { label: "Google Meet · Ready", tone: "good" };
  if (url.includes("zoom.us")) return { label: "Zoom Classroom · Ready", tone: "good" };
  return { label: "Classroom Link · Ready", tone: "good" };
}

function roomLabel(url: string | null): string {
  if (!url) return "";
  const match = VIDEO_PRESETS.find((p) => p.url === url);
  return match ? `${match.label} (${match.url})` : url;
}

function presetForUrl(url: string | null): string {
  if (!url) return VIDEO_PRESETS[0].id;
  const match = VIDEO_PRESETS.find((p) => p.url === url);
  return match ? match.id : "current";
}

function detailText(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (!Array.isArray(detail)) return "";
  return detail
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg || "");
      return "";
    })
    .filter((part) => part.trim())
    .join(" ");
}

/** One sentence. FastAPI `detail` only — never the raw JSON body. */
function saveError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").trim();
  const jsonStart = raw.indexOf("{");
  const arrayStart = raw.indexOf("[");
  const start = jsonStart >= 0 && (arrayStart < 0 || jsonStart < arrayStart) ? jsonStart : arrayStart;
  let detail = "";
  if (start >= 0) {
    try {
      const body = JSON.parse(raw.slice(start)) as { detail?: unknown };
      detail = detailText(body.detail);
    } catch {
      detail = "";
    }
  }
  if (!detail) {
    const stripped = raw.replace(/^\d{3}\s+/, "").trim();
    if (stripped && !stripped.startsWith("{") && !stripped.startsWith("[")) detail = stripped;
  }
  if (!detail) return "Could not save the pre-class setup.";
  const sentence = detail.endsWith(".") ? detail.slice(0, -1) : detail;
  return `Could not save the pre-class setup: ${sentence}.`;
}

function btnStyle(extra?: CSSProperties): CSSProperties {
  return { width: "auto", margin: 0, cursor: "pointer", ...extra };
}

export function SessionPreScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const paramId = params.get("session") || "";
  const [fallbackId, setFallbackId] = useState("");
  const sessionId = paramId || fallbackId;

  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [candidates, setCandidates] = useState<StudentRow[]>([]);
  const [materials, setMaterials] = useState<ContentRow[]>([]);
  const [cohortName, setCohortName] = useState("");
  const [mode, setMode] = useState<"cohort" | "1-on-1">("cohort");
  const [savedTopic, setSavedTopic] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const [loadedTopic, setLoadedTopic] = useState("");
  const [savedHandoutId, setSavedHandoutId] = useState("");
  const [draftHandoutId, setDraftHandoutId] = useState("");
  const [loadedHandoutId, setLoadedHandoutId] = useState("");
  const [draftStudentIds, setDraftStudentIds] = useState<string[]>([]);
  const [loadedStudentIds, setLoadedStudentIds] = useState<string[]>([]);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);
  const [draftPreset, setDraftPreset] = useState(VIDEO_PRESETS[0].id);
  const [loadedPreset, setLoadedPreset] = useState(VIDEO_PRESETS[0].id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setError("");
    try {
      const [sess, roster, coh, video, contentList, sessList] = await Promise.all([
        api(`/api/v1/sessions/${id}`) as Promise<SessionRow>,
        api("/api/v1/students") as Promise<StudentRow[]>,
        api("/api/v1/cohorts") as Promise<CohortRow[]>,
        api(`/api/v1/sessions/${id}/video`).catch(() => null) as Promise<{ video_url?: string | null } | null>,
        api("/api/v1/content").catch(() => []) as Promise<ContentRow[]>,
        api("/api/v1/sessions").catch(() => []) as Promise<SessionRow[]>,
      ]);
      setSession(sess);
      const people = Array.isArray(roster) ? roster : [];
      setStudents(people);
      setAllSessions(Array.isArray(sessList) ? sessList : [sess]);
      const items = Array.isArray(contentList) ? contentList : [];
      setMaterials(items);
      const match = Array.isArray(coh) ? coh.find((c) => c.id === sess.cohort_id) : undefined;
      setCohortName(match?.name || "");
      const oneOnOne = isOneOnOne(sess);
      setMode(oneOnOne ? "1-on-1" : "cohort");
      const byId = new Map(people.map((student) => [student.id, student]));
      const memberIds = match?.student_ids ?? [];
      setCandidates(
        memberIds.map((id) => byId.get(id) || { id, display_name: "Student" }),
      );
      const chosen = Array.isArray(sess.student_ids)
        ? sess.student_ids.filter((id) => id)
        : sess.student_id
          ? [sess.student_id]
          : [];
      setDraftStudentIds(chosen);
      setLoadedStudentIds(chosen);

      const topicSaved = (sess.subject_label || "").trim();
      setSavedTopic(topicSaved);
      setDraftTopic(topicSaved);
      setLoadedTopic(topicSaved);

      const handoutSaved = (sess.library_item_id || "").trim();
      setSavedHandoutId(handoutSaved);
      setDraftHandoutId(handoutSaved);
      setLoadedHandoutId(handoutSaved);

      const url = video?.video_url || null;
      const presetShown = presetForUrl(url);
      setSavedVideoUrl(url);
      setDraftPreset(presetShown);
      setLoadedPreset(presetShown);
    } catch (err) {
      setError(saveError(err).replace("save the pre-class setup", "load this session"));
    }
  }, []);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((row) => {
        const person = row as { id?: string; role?: string };
        setMe({ id: person.id || "", role: person.role || "" });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api("/api/v1/sessions")
      .then((rows) => {
        const list = Array.isArray(rows) ? (rows as SessionRow[]) : [];
        setAllSessions(list);
        if (!paramId && list[0]) setFallbackId(list[0].id);
      })
      .catch((err) => setError(saveError(err).replace("save the pre-class setup", "load sessions")));
  }, [paramId]);

  useEffect(() => {
    if (!sessionId) return;
    void load(sessionId);
  }, [sessionId, load]);

  function handleSelectSession(id: string) {
    setNotice("");
    setFallbackId(id);
    router.replace(`/app/faculty/session-pre?session=${encodeURIComponent(id)}`);
  }

  const topicChoices = useMemo(() => {
    const extraTopics = [savedTopic, draftTopic].filter((topic) => topic && !TOPIC_PRESETS.includes(topic));
    return [...new Set([...extraTopics, ...TOPIC_PRESETS])];
  }, [savedTopic, draftTopic]);
  const draftPresetObj = VIDEO_PRESETS.find((p) => p.id === draftPreset) ?? null;
  const showCurrentLink = Boolean(savedVideoUrl) && !VIDEO_PRESETS.some((p) => p.url === savedVideoUrl);
  const dirty =
    draftTopic !== loadedTopic ||
    draftHandoutId !== loadedHandoutId ||
    draftPreset !== loadedPreset ||
    !sameIds(draftStudentIds, loadedStudentIds);
  const topicPill = choiceStatus(draftTopic, savedTopic);
  const handoutPill = choiceStatus(draftHandoutId, savedHandoutId);
  const chosenStudents = useMemo(() => {
    const byId = new Map(students.map((student) => [student.id, student]));
    return draftStudentIds.map((id) => byId.get(id) || candidates.find((student) => student.id === id) || { id, display_name: "Student" });
  }, [draftStudentIds, students, candidates]);
  const shown = useMemo(() => chosenStudents.slice(0, 6), [chosenStudents]);
  const extra = Math.max(0, chosenStudents.length - shown.length);
  const classCount = mode === "1-on-1" ? Math.min(draftStudentIds.length, 1) : draftStudentIds.length;
  const readyCount = [Boolean(sessionId), Boolean(savedTopic), Boolean(savedHandoutId), Boolean(savedVideoUrl)].filter(
    Boolean,
  ).length;
  const statusLabel = dirty ? "Unsaved changes" : readyCount === 4 ? "All 4 Steps Ready" : `${readyCount} of 4 Ready`;
  const statusTone = dirty ? "is-warn" : readyCount === 4 ? "is-good" : "is-info";
  const badge = humanVideoBadge(savedVideoUrl);
  const readOnly = Boolean(
    me &&
      (me.role === "teacher" || me.role === "assistant") &&
      session?.teacher_user_id &&
      session.teacher_user_id !== me.id,
  );

  function toggleStudent(id: string) {
    if (readOnly) return;
    setDraftStudentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setNotice("");
  }

  async function saveSetup() {
    if (!sessionId || saving || readOnly) return;
    const studentIds =
      mode === "1-on-1" ? draftStudentIds.filter(Boolean).slice(0, 1) : [...draftStudentIds];
    const snapshot = { topic: draftTopic, handoutId: draftHandoutId, preset: draftPreset, studentIds };
    const handout = materials.find((item) => item.id === snapshot.handoutId);
    const preset = VIDEO_PRESETS.find((item) => item.id === snapshot.preset);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const patch: { subject_label: string; student_ids: string[]; library_item_id?: string } = {
        subject_label: snapshot.topic,
        student_ids: snapshot.studentIds,
      };
      if (!snapshot.handoutId) patch.library_item_id = "";
      await api(`/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (handout && handout.id !== savedHandoutId) {
        await api(`/api/v1/sessions/${sessionId}/board/library`, {
          method: "POST",
          body: JSON.stringify({ content_id: handout.id }),
        });
      }
      if (preset && preset.url !== savedVideoUrl) {
        await api(`/api/v1/sessions/${sessionId}/video-link`, {
          method: "POST",
          body: JSON.stringify({ video_url: preset.url }),
        });
      }
      setNotice("Saved.");
      await load(sessionId);
    } catch (err) {
      const message = saveError(err);
      await load(sessionId);
      setDraftTopic(snapshot.topic);
      setDraftHandoutId(snapshot.handoutId);
      setDraftPreset(snapshot.preset);
      setDraftStudentIds(snapshot.studentIds);
      setNotice("");
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (!sessionId) {
    return (
      <>
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>Pre-Class Setup</h2>
            <span className="k">Prepare your classroom link, lesson handout, and student roster before starting class.</span>
          </div>
          <div className="page-toolbar__actions">
            <Link href="/app/faculty/schedule" className="hot hot--btn" style={btnStyle({ textDecoration: "none" })}>
              Open Schedule
            </Link>
          </div>
        </div>
        <div className="card">
          <p className="muted">No sessions scheduled yet — create a session on the calendar first.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Pre-Class Setup — {session?.title || "Session"}</h2>
          <span className="k">
            {session
              ? `${mode === "1-on-1" ? "1-on-1" : cohortName ? `Cohort class · ${cohortName}` : "Cohort class"} · `
              : ""}
            {formatWhen(session?.starts_at ?? null)} IST · Verify your pre-class checklist and launch the live board
          </span>
        </div>
        <div className="page-toolbar__actions">
          <Link href="/app/faculty/schedule" className="btn btn--sm" style={btnStyle({ textDecoration: "none" })}>
            Schedule
          </Link>
          <Link
            href={`/app/faculty/record?session=${encodeURIComponent(sessionId)}`}
            className="btn btn--sm"
            style={btnStyle({ textDecoration: "none" })}
          >
            Mark Attendance Roll
          </Link>
          <Link
            href={`/app/faculty/live-teacher?session=${encodeURIComponent(sessionId)}`}
            className="hot hot--btn"
            style={btnStyle({ textDecoration: "none" })}
          >
            Launch Live Board
          </Link>
        </div>
      </div>

      <Err message={error} />

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          <div className="card">
            <div className="sb" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Pre-Class Readiness Checklist</h3>
              <span className={`pill ${statusTone}`}>{statusLabel}</span>
            </div>

            <div className="form-grid">
              <label className="field form-grid__full">
                <span>1. Scheduled Session</span>
                <select
                  className="field__in"
                  value={sessionId}
                  onChange={(e) => handleSelectSession(e.target.value)}
                >
                  {allSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({formatWhen(s.starts_at)}) · {isOneOnOne(s) ? "1-on-1" : "Cohort class"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>2. Lesson Topic Focus</span>
                <select
                  className="field__in"
                  value={draftTopic}
                  disabled={readOnly}
                  onChange={(e) => {
                    setDraftTopic(e.target.value);
                    setNotice("");
                  }}
                >
                  <option value="">Choose a topic</option>
                  {topicChoices.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>3. Library Handout / Worksheet</span>
                <select
                  className="field__in"
                  value={draftHandoutId}
                  disabled={readOnly}
                  onChange={(e) => {
                    setDraftHandoutId(e.target.value);
                    setNotice("");
                  }}
                >
                  <option value="">No handout</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.subject_label ? `· ${m.subject_label}` : ""}
                    </option>
                  ))}
                  {draftHandoutId && !materials.some((m) => m.id === draftHandoutId) ? (
                    <option value={draftHandoutId}>Saved handout</option>
                  ) : null}
                </select>
              </label>
            </div>

            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <span className={`pill ${choiceTone(topicPill)}`}>Topic · {topicPill}</span>
              <span className={`pill ${choiceTone(handoutPill)}`}>Handout · {handoutPill}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              {readOnly ? null : (
                <button
                  type="button"
                  className="hot hot--btn"
                  style={btnStyle()}
                  disabled={saving}
                  onClick={() => void saveSetup()}
                >
                  {saving ? "Saving…" : "Save pre-class setup"}
                </button>
              )}
              <p role="status" className="muted" style={{ margin: "8px 0 0", fontSize: ".85rem" }}>
                {readOnly
                  ? CLASS_LOCK
                  : notice || "Saves the lesson topic, library handout, classroom room, and who is in this class."}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="sb" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>4. Classroom Video Link</h3>
              <span className={`pill is-${badge.tone}`}>{badge.label}</span>
            </div>

            <label className="field">
              <span>Select Classroom Room Preset</span>
              <select
                className="field__in"
                value={draftPreset}
                disabled={readOnly}
                onChange={(e) => {
                  setDraftPreset(e.target.value);
                  setNotice("");
                }}
              >
                {showCurrentLink ? <option value="current">Current classroom link</option> : null}
                {VIDEO_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="muted" style={{ fontSize: ".85rem", marginBottom: 12 }}>
              {savedVideoUrl
                ? `Saved classroom link: ${roomLabel(savedVideoUrl)}.`
                : "No classroom link is saved yet."}
              {draftPresetObj && draftPresetObj.url !== savedVideoUrl
                ? ` ${draftPresetObj.label} will be stored when you save.`
                : ""}
            </div>

            <div className="row" style={{ gap: 8 }}>
              <Link
                href={`/app/faculty/live-teacher?session=${encodeURIComponent(sessionId)}`}
                className="btn btn--sm"
                style={btnStyle({ textDecoration: "none" })}
              >
                Open Live Whiteboard →
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="sb">
              <h3 style={{ margin: 0 }}>Students in this class</h3>
              <span className="row" style={{ gap: 6 }}>
                <span className={`pill ${mode === "1-on-1" ? "is-good" : "is-info"}`}>
                  {mode === "1-on-1" ? "1-on-1" : "Cohort class"}
                </span>
                <span className="pill is-info">{classCount} in this class</span>
              </span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {mode === "1-on-1"
                ? classCount
                  ? "This is a 1-on-1. Only the student you chose is in this class."
                  : "This is a 1-on-1. Choose the one student for this class."
                : "You choose who is in this class. The cohort list is only the people you can pick."}
            </p>
            <div className="avrow" style={{ marginTop: 12 }}>
              {shown.map((st) => (
                <span
                  key={st.id}
                  className="av av--sm"
                  title={st.display_name}
                  style={{ background: avColor(st.display_name) }}
                >
                  {initials(st.display_name)}
                </span>
              ))}
              {extra > 0 ? (
                <span className="av av--sm" style={{ background: "var(--ink-faint)" }}>
                  +{extra}
                </span>
              ) : null}
              {classCount === 0 ? <span className="muted">No students selected yet</span> : null}
            </div>
            {mode === "1-on-1" ? (
              classCount === 0 ? (
                <label className="field" style={{ marginTop: 12 }}>
                  <span>Student</span>
                  <select
                    className="field__in"
                    value=""
                    onChange={(e) => {
                      setDraftStudentIds(e.target.value ? [e.target.value] : []);
                      setNotice("");
                    }}
                  >
                    <option value="">Choose a student</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {chosenStudents.slice(0, 1).map((st) => (
                    <div key={st.id} className="list__i" style={{ padding: "8px 0" }}>
                      <span className="av av--sm" style={{ background: avColor(st.display_name) }}>
                        {initials(st.display_name)}
                      </span>
                      <div className="gr">
                        <div className="t" style={{ fontSize: ".9rem" }}>{st.display_name}</div>
                        <div className="s">1-on-1 · In this class</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : candidates.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>No students in this cohort to pick.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {candidates.map((st) => {
                  const checked = draftStudentIds.includes(st.id);
                  return (
                    <label key={st.id} className="list__i" style={{ padding: "8px 0", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => toggleStudent(st.id)}
                        aria-label={st.display_name}
                      />
                      <span className="av av--sm" style={{ background: avColor(st.display_name) }}>
                        {initials(st.display_name)}
                      </span>
                      <div className="gr">
                        <div className="t" style={{ fontSize: ".9rem" }}>{st.display_name}</div>
                        <div className="s">{checked ? "In this class" : "Not in this class"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card card--wash">
            <div className="k" style={{ marginBottom: 6 }}>
              After Class Ends
            </div>
            <div className="t" style={{ marginBottom: 4 }}>
              Automatic Handout Release &amp; Attendance Roll
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>
              {classCount === 0 ? (
                "No students are selected yet."
              ) : (
                <>
                  Lesson notes for <b>{session?.title || "this class"}</b> release to {classCount} student
                  {classCount === 1 ? "" : "s"} chosen for this class, and you can mark the attendance roll in one click.
                </>
              )}
            </p>
            <div className="row" style={{ gap: 8 }}>
              <Link
                href={`/app/faculty/live-teacher?session=${encodeURIComponent(sessionId)}`}
                className="hot hot--btn"
                style={btnStyle({ textDecoration: "none" })}
              >
                Start Live Class
              </Link>
              <Link
                href={`/app/faculty/record?session=${encodeURIComponent(sessionId)}`}
                className="btn btn--sm"
                style={btnStyle({ textDecoration: "none" })}
              >
                Go to Attendance Roll
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
