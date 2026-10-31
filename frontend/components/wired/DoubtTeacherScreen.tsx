"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err } from "./bits";

const QUICK_ANSWERS = [
  "Start by drawing the free-body diagram and resolving forces along the incline before substituting values.",
  "Use conservation of momentum first to find the common velocity, then apply energy conservation.",
  "Check the sign convention in step 2 — the restoring force is opposite to displacement.",
  "Great question! I have added a worked step-by-step example to your class notes and we will review it in today's session.",
];

type Doubt = {
  id: string;
  student_id: string;
  body: string;
  status: string;
  answer?: string | null;
  queue_position?: number;
  sla_hours?: number;
};

type StudentRow = {
  id: string;
  display_name: string;
};

function humanStatus(status: string): { label: string; tone: string } {
  if (status === "answered" || status === "clarified") {
    return { label: "Clarified", tone: "is-good" };
  }
  return { label: "Open in Queue", tone: "is-warn" };
}

export function DoubtTeacherScreen() {
  const [rows, setRows] = useState<Doubt[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "answered">("all");
  const [sel, setSel] = useState<Doubt | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([
      api("/api/v1/doubts/queue") as Promise<Doubt[]>,
      api("/api/v1/students").catch(() => []) as Promise<StudentRow[]>,
    ])
      .then(([data, studs]) => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        setStudents(Array.isArray(studs) ? studs : []);
        if (!sel && list.length > 0) {
          const firstOpen = list.find((r) => r.status === "open") || list[0];
          setSel(firstOpen);
          setAnswer(firstOpen.answer || "");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve() {
    if (!sel) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/doubts/${sel.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "answered", answer }),
      });
      setAnswer("");
      setSel(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const studentById = new Map(students.map((s) => [s.id, s.display_name]));
  const openCount = rows.filter((r) => r.status === "open").length;
  const answeredCount = rows.filter((r) => r.status === "answered").length;

  const filteredRows = rows.filter((r) => {
    if (filter === "open") return r.status === "open";
    if (filter === "answered") return r.status === "answered";
    return true;
  });

  function resolveStudentName(studentId: string, idx?: number): string {
    return studentById.get(studentId) || (idx != null ? `Student ${idx + 1}` : "Enrolled Student");
  }

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Student Doubts Queue</h2>
          <span className="k">
            {openCount} open question{openCount === 1 ? "" : "s"} waiting · Review student questions in priority order and send step-by-step clarifications
          </span>
        </div>
        <div className="page-toolbar__actions">
          <div className="chips">
            <button
              type="button"
              className={`chip${filter === "all" ? " on" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              className={`chip${filter === "open" ? " on" : ""}`}
              onClick={() => setFilter("open")}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              className={`chip${filter === "answered" ? " on" : ""}`}
              onClick={() => setFilter("answered")}
            >
              Clarified ({answeredCount})
            </button>
          </div>
          <Link href={catalogRoute("mentor")} className="btn btn--sm">
            Mentor Follow-Ups
          </Link>
        </div>
      </div>

      <Err message={error} />

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {filteredRows.length === 0 ? (
            <Empty>No student doubts in this view.</Empty>
          ) : (
            filteredRows.map((r, idx) => {
              const sName = resolveStudentName(r.student_id, idx);
              const badge = humanStatus(r.status);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={sel?.id === r.id ? "hot hot--row" : "card"}
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setSel(r);
                    setAnswer(r.answer || "");
                  }}
                >
                  <div className="sb" style={{ marginBottom: 6 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <Av name={sName} />
                      <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{sName}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {r.queue_position != null ? (
                        <span className="pill is-info">Priority #{r.queue_position}</span>
                      ) : null}
                      {r.sla_hours != null ? (
                        <span className="pill">Waiting {r.sla_hours}h</span>
                      ) : null}
                      <span className={`pill ${badge.tone}`}>{badge.label}</span>
                    </div>
                  </div>
                  <div className="t">{r.body}</div>
                  {r.answer ? (
                    <div className="s muted" style={{ marginTop: 6 }}>
                      Clarification sent: {r.answer}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="card">
          {sel ? (
            <>
              <div className="sb" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Av name={resolveStudentName(sel.student_id)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{resolveStudentName(sel.student_id)}</div>
                    <div className="s muted">
                      {sel.queue_position != null ? `Queue Priority #${sel.queue_position} · ` : ""}
                      {humanStatus(sel.status).label}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn--sm" onClick={() => setSel(null)}>
                  Close
                </button>
              </div>

              <div className="card card--wash" style={{ padding: "12px 14px", marginBottom: 12 }}>
                <div className="k" style={{ marginBottom: 4 }}>Student Question</div>
                <div className="t">{sel.body}</div>
              </div>

              <div className="field">
                <span>Quick Clarification Templates (1-Click Insert)</span>
                <div className="chips">
                  {QUICK_ANSWERS.map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      className={`chip${answer === tpl ? " on" : ""}`}
                      onClick={() => setAnswer(tpl)}
                    >
                      {tpl.slice(0, 44)}…
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Step-by-Step Clarification</span>
                <textarea
                  className="field__in"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder="Write a clear explanation, formula hint, or worked step…"
                />
              </label>

              <div className="row" style={{ gap: 8 }}>
                <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void resolve()}>
                  {busy ? "Sending Clarification…" : "Mark Clarified & Notify Student"}
                </button>
                <Link href={catalogRoute("mentor")} className="btn btn--sm">
                  Book 1-on-1 Slot Instead
                </Link>
              </div>
            </>
          ) : (
            <p className="muted">
              Select a student question on the left to write a clarification or insert a quick response template.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
