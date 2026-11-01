"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

const LIMIT_SEC = 15 * 60;

type Test = {
  id: string;
  title: string;
  question_ids?: string[];
  negative_mark?: boolean;
};
type Run = {
  id: string;
  title: string;
  negative_mark?: boolean;
  questions: { id: string; stem: string; choices: string[] }[];
};

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TestRunnerScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(LIMIT_SEC);

  useEffect(() => {
    api("/api/v1/tests")
      .then((rows) => setTests(Array.isArray(rows) ? (rows as Test[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function start(id: string) {
    setError("");
    try {
      setRun((await api(`/api/v1/tests/${id}/run`)) as Run);
      setAnswers({});
      setLeft(LIMIT_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const submit = useCallback(async () => {
    if (!run || busy) return;
    setBusy(true);
    setError("");
    try {
      const att = (await api(`/api/v1/tests/${run.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      })) as { id: string };
      router.push(`${catalogRoute("practice-result")}?attempt=${att.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }, [answers, busy, router, run]);

  useEffect(() => {
    if (!run) return;
    const t = window.setInterval(() => {
      setLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [run]);

  useEffect(() => {
    if (run && left === 0) void submit();
  }, [left, run, submit]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = run?.questions.length ?? 0;

  return (
    <>
      <AppBar
        title="Timed Assessment"
        extra={
          run ? (
            <span className={`pill ${left < 180 ? "is-bad" : "is-warn"}`}>
              ⏱ {clock(left)} left
            </span>
          ) : (
            <span className="pill">{tests.length} Tests</span>
          )
        }
      />
      <div className="appwrap">
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>{run ? run.title : "Scheduled Mock Tests & Assessments"}</h2>
            <span className="k">
              {run
                ? `Timed assessment in progress · ${answeredCount} of ${totalQuestions} answered · Auto-submits at 00:00`
                : "Select an assessment below to begin your timed test session"}
            </span>
          </div>
          {run ? (
            <div className="page-toolbar__actions">
              <button type="button" className="btn btn--sm" onClick={() => setRun(null)}>
                Exit Test
              </button>
            </div>
          ) : null}
        </div>

        <Err message={error} />

        {!run ? (
          tests.length === 0 ? (
            <Empty>No timed tests scheduled right now.</Empty>
          ) : (
            tests.map((t) => {
              const qCount = (t.question_ids || []).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  className="hot hot--card"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => void start(t.id)}
                >
                  <div className="sb" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{t.title}</span>
                    <div className="row" style={{ gap: 6 }}>
                      {qCount > 0 ? <span className="pill is-info">{qCount} Questions</span> : null}
                      <span className="pill">15 Mins</span>
                      <span className={`pill ${t.negative_mark ? "is-warn" : "is-good"}`}>
                        {t.negative_mark ? "Negative Marking" : "Standard Marking"}
                      </span>
                    </div>
                  </div>
                  <div className="muted">Click to launch timed test environment</div>
                </button>
              );
            })
          )
        ) : (
          <>
            {run.questions.map((q, i) => (
              <div key={q.id} className="card">
                <div className="sb" style={{ marginBottom: 8 }}>
                  <span className="k">
                    Question {i + 1} of {totalQuestions}
                  </span>
                  <span className={`pill ${answers[q.id] ? "is-good" : ""}`}>
                    {answers[q.id] ? "Saved" : "Unanswered"}
                  </span>
                </div>
                <p style={{ margin: "8px 0 12px", fontWeight: 500 }}>{q.stem}</p>
                {(q.choices || []).map((c, ci) => (
                  <button
                    key={c}
                    type="button"
                    className={`qopt${answers[q.id] === c ? " sel" : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: c }))}
                  >
                    <i>{"ABCD"[ci] || "•"}</i>
                    {c}
                  </button>
                ))}
              </div>
            ))}

            <div className="card card--wash" style={{ padding: "12px 14px" }}>
              <div className="sb" style={{ flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div className="k">Final Submission Preview</div>
                  <div className="s" style={{ color: "var(--ink)" }}>
                    <b>{answeredCount} answered</b> · <b>{Math.max(totalQuestions - answeredCount, 0)} unanswered</b> · Time remaining: <b>{clock(left)}</b>
                  </div>
                </div>
                <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Submitting Test…" : "Submit Test"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
