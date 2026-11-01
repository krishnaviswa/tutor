"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

const TOPIC_OPTIONS = [
  "Physics — Kinematics & Forces",
  "Physics — Electrostatics & Circuits",
  "Chemistry — Organic Mechanisms",
  "Mathematics — Calculus & Algebra",
  "Biology — Cell Biology & Genetics",
  "General Concept Check",
];

const QUESTION_TEMPLATES = [
  "Can you explain the step-by-step derivation for ",
  "Where did my calculation go wrong when solving ",
  "How do I decide which formula applies to ",
  "Can we cover a worked example of this in our next class: ",
];

type Doubt = {
  id: string;
  body: string;
  status: string;
  topic_id?: string | null;
  answer?: string | null;
  clarified?: boolean;
  notice_action?: string | null;
};

type ContentTopic = {
  id: string;
  title: string;
  subject_label?: string;
  topic_id?: string | null;
};

export function DoubtStudentScreen() {
  const [rows, setRows] = useState<Doubt[]>([]);
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>(TOPIC_OPTIONS[0]);
  const [body, setBody] = useState("");
  const [showAsk, setShowAsk] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([
      api("/api/v1/doubts") as Promise<Doubt[]>,
      api("/api/v1/content").catch(() => []) as Promise<ContentTopic[]>,
    ])
      .then(([data, contentRows]) => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        const extracted: { id: string; label: string }[] = [];
        for (const item of Array.isArray(contentRows) ? contentRows : []) {
          const label = item.subject_label ? `${item.subject_label} — ${item.title}` : item.title;
          if (label && !extracted.some((e) => e.label === label)) {
            extracted.push({ id: item.topic_id || "", label });
          }
        }
        setTopics(extracted);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  function applyTemplate(tpl: string) {
    setBody((prev) => (prev.trim() ? `${prev.trim()} ${tpl}` : `${tpl}${selectedTopic}?`));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const matchedTopic = topics.find((t) => t.label === selectedTopic);
      const formattedBody = body.startsWith("[") ? body : `[${selectedTopic}] ${body}`;
      await api("/api/v1/doubts", {
        method: "POST",
        body: JSON.stringify({
          body: formattedBody,
          topic_id: matchedTopic?.id || null,
        }),
      });
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const clarifiedCount = rows.filter((r) => r.clarified || r.status === "answered").length;
  const openCount = rows.length - clarifiedCount;
  const dropdownOptions = topics.length > 0
    ? [...topics.map((t) => t.label), ...TOPIC_OPTIONS]
    : TOPIC_OPTIONS;

  return (
    <>
      <AppBar
        title="My Doubts & Questions"
        extra={
          <span className="pill is-info">
            {openCount} Open · {clarifiedCount} Clarified
          </span>
        }
      />
      <div className="appwrap">
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>Ask Your Teacher &amp; Track Clarifications</h2>
            <span className="k">
              Pick a subject topic and question starter below, or review step-by-step answers from your teacher
            </span>
          </div>
          <div className="page-toolbar__actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setShowAsk((prev) => !prev)}
            >
              {showAsk ? "Hide Question Form" : "+ Ask a Question"}
            </button>
          </div>
        </div>

        <Err message={error} />

        {/* Progressive Disclosure: Active / Clarified Doubts List */}
        <div style={{ marginBottom: 16 }}>
          <div className="sb" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Your Questions ({rows.length})</h3>
          </div>
          {rows.length === 0 ? (
            <Empty>You haven&apos;t asked any questions yet. Use the form below to ask your teacher.</Empty>
          ) : (
            rows.map((r) => {
              const isClarified = Boolean(r.clarified || r.status === "answered");
              return (
                <div key={r.id} className="card">
                  <div className="sb" style={{ marginBottom: 6 }}>
                    <span className={`pill ${isClarified ? "is-good" : "is-warn"}`}>
                      {isClarified ? "Clarified by Teacher" : "In Teacher Queue"}
                    </span>
                    {r.notice_action ? (
                      <span className="pill">
                        {r.notice_action === "accept" ? "Marked Helpful" : "Dismissed"}
                      </span>
                    ) : null}
                  </div>
                  <div className="t">{r.body}</div>
                  {r.answer ? (
                    <div className="card card--wash" style={{ marginTop: 10, marginBottom: 0, padding: "12px 14px" }}>
                      <div className="k" style={{ marginBottom: 4 }}>Teacher&apos;s Explanation</div>
                      <p style={{ margin: 0 }}>{r.answer}</p>
                    </div>
                  ) : null}
                  {isClarified && !r.notice_action ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn--dark btn--sm"
                        onClick={() =>
                          void api(`/api/v1/doubts/${r.id}/notice`, {
                            method: "POST",
                            body: JSON.stringify({ action: "accept" }),
                          }).then(load)
                        }
                      >
                        Accept Clarification
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() =>
                          void api(`/api/v1/doubts/${r.id}/notice`, {
                            method: "POST",
                            body: JSON.stringify({ action: "ignore" }),
                          }).then(load)
                        }
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Constrained Question Composer */}
        {showAsk ? (
          <form onSubmit={onCreate} className="card">
            <div className="sb" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Ask a New Question</h3>
              <span className="pill is-info">Priority Teacher Queue</span>
            </div>

            <label className="field">
              <span>Subject &amp; Topic</span>
              <select
                className="field__in"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                {dropdownOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>Quick Question Starters (1-Click)</span>
              <div className="chips">
                {QUESTION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    className="chip"
                    onClick={() => applyTemplate(tpl)}
                  >
                    {tpl}…
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Your Question</span>
              <textarea
                className="field__in"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Describe which step or concept you would like your teacher to clarify…"
                required
              />
            </label>

            <button className="hot hot--btn" type="submit" disabled={busy}>
              {busy ? "Sending Question…" : "Send to Teacher Queue"}
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
