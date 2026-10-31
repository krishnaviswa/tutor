"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Asg = {
  id: string;
  title: string;
  body: string;
  cohort_id?: string | null;
  due_at?: string | null;
  allow_resubmit?: boolean;
};
type Cohort = { id: string; name: string };

const ASSIGNMENT_TEMPLATES = [
  { label: "Custom assignment…", title: "", body: "" },
  {
    label: "Weekly Problem Sheet",
    title: "Weekly Problem Sheet",
    body: "Complete all worked solutions and upload clear scans before the deadline.",
  },
  {
    label: "Chapter Revision Exercise",
    title: "Chapter Revision Exercise",
    body: "Solve the core and stretch problems from this week's topic.",
  },
  {
    label: "Past Paper Timed Drill",
    title: "Past Paper Timed Drill",
    body: "Attempt under timed conditions and show step-by-step reasoning.",
  },
] as const;

export function AssignIssueScreen() {
  const [rows, setRows] = useState<Asg[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [template, setTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowResubmit, setAllowResubmit] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/assignments"), api("/api/v1/cohorts")])
      .then(([a, c]) => {
        setRows(Array.isArray(a) ? (a as Asg[]) : []);
        setCohorts(Array.isArray(c) ? (c as Cohort[]) : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  const cohortMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of cohorts) map[c.id] = c.name;
    return map;
  }, [cohorts]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/assignments", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          cohort_id: cohortId || null,
          due_at: dueAt || null,
          allow_resubmit: allowResubmit,
        }),
      });
      setTitle("");
      setBody("");
      setDueAt("");
      setAllowResubmit(false);
      setTemplate("");
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Assignments</h2>
          <span className="k">Issue · collect · grade · return</span>
        </div>
        <button
          type="button"
          className={showCreate ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowCreate((prev) => !prev)}
        >
          {showCreate ? "Close form" : "+ Issue Assignment"}
        </button>
      </div>

      <Err message={error} />

      {showCreate ? (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: 14 }}>
          <h3>Issue new assignment</h3>
          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Template</span>
              <select
                className="field__in"
                value={template}
                onChange={(e) => {
                  const chosen = e.target.value;
                  setTemplate(chosen);
                  const found = ASSIGNMENT_TEMPLATES.find((t) => t.label === chosen);
                  if (found && found.title) {
                    setTitle(found.title);
                    setBody(found.body);
                  }
                }}
              >
                {ASSIGNMENT_TEMPLATES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Instructions</span>
            <textarea
              className="field__in"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Instructions and submission expectations…"
            />
          </label>

          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Cohort</span>
              <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                <option value="">All cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Due date & time</span>
              <input
                className="field__in"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>
          </div>

          <label className="list__i" style={{ cursor: "pointer", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={allowResubmit}
              onChange={(e) => setAllowResubmit(e.target.checked)}
            />
            <span>Allow students to resubmit after feedback</span>
          </label>

          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="hot hot--btn" type="submit" disabled={busy} style={{ width: "auto", margin: 0 }}>
              {busy ? "Issuing…" : "Issue assignment"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <Empty>No assignments issued yet. Click &ldquo;+ Issue Assignment&rdquo; above to create one.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card">
            <div className="sb">
              <div>
                <div className="t">{r.title}</div>
                <div className="s muted">{r.body}</div>
                <div className="s muted">
                  {[
                    r.cohort_id && cohortMap[r.cohort_id] ? cohortMap[r.cohort_id] : "All cohorts",
                    r.due_at && formatWhen(r.due_at) ? `Due ${formatWhen(r.due_at)}` : null,
                    r.allow_resubmit ? "Resubmission allowed" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Link href={`${catalogRoute("assign-grade")}?id=${r.id}`} className="hot--link">
                Grade
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}
