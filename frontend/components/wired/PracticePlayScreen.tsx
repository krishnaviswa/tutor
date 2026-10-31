"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type SetRow = { id: string; title: string; question_ids?: string[]; tag?: string };
type Play = {
  id: string;
  title: string;
  questions: { id: string; stem: string; choices: string[]; difficulty?: string }[];
};

function formatDifficulty(diff?: string): string {
  if (!diff) return "Core Concept";
  return diff.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PracticePlayScreen() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [play, setPlay] = useState<Play | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/practice-sets")
      .then((rows) => setSets(Array.isArray(rows) ? (rows as SetRow[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function start(id: string) {
    setError("");
    try {
      const row = (await api(`/api/v1/practice-sets/${id}/play`)) as Play;
      setPlay(row);
      setAnswers({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submit() {
    if (!play) return;
    setBusy(true);
    setError("");
    try {
      const att = (await api(`/api/v1/practice-sets/${play.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      })) as { id: string };
      router.push(`${catalogRoute("practice-result")}?attempt=${att.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = play?.questions.length ?? 0;

  return (
    <>
      <AppBar
        title="Daily Practice"
        extra={
          play ? (
            <span className="pill is-info">
              {answeredCount} of {totalQuestions} Answered
            </span>
          ) : (
            <span className="pill">{sets.length} Sets Available</span>
          )
        }
      />
      <div className="appwrap">
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>{play ? play.title : "Topic Practice Sets"}</h2>
            <span className="k">
              {play
                ? "Select the best answer for each question below and submit for instant scoring"
                : "Choose a practice set to reinforce class concepts at your own pace"}
            </span>
          </div>
          <div className="page-toolbar__actions">
            {play ? (
              <button type="button" className="btn btn--sm" onClick={() => setPlay(null)}>
                ← All Practice Sets
              </button>
            ) : (
              <Link href={catalogRoute("doubt-student")} className="btn btn--sm">
                Ask a Doubt
              </Link>
            )}
          </div>
        </div>

        <Err message={error} />

        {!play ? (
          sets.length === 0 ? (
            <Empty>No practice sets assigned yet.</Empty>
          ) : (
            sets.map((s) => {
              const count = (s.question_ids || []).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="hot hot--card"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => void start(s.id)}
                >
                  <div className="sb" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.title}</span>
                    <span className="pill is-info">{count} Questions</span>
                  </div>
                  <div className="muted">
                    Estimated time: ~{Math.max(count * 2, 5)} mins · Instant feedback on submission
                  </div>
                </button>
              );
            })
          )
        ) : (
          <>
            {play.questions.map((q, i) => (
              <div key={q.id} className="card">
                <div className="sb" style={{ marginBottom: 8 }}>
                  <span className="k">
                    Question {i + 1} of {totalQuestions}
                  </span>
                  <span className={`pill ${answers[q.id] ? "is-good" : ""}`}>
                    {answers[q.id] ? "Answered" : formatDifficulty(q.difficulty)}
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
                  <div className="k">Submission Summary</div>
                  <div className="s" style={{ color: "var(--ink)" }}>
                    <b>{answeredCount} answered</b> · <b>{Math.max(totalQuestions - answeredCount, 0)} unanswered</b> — submitting records your score and unlocks the solution breakdown.
                  </div>
                </div>
                <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Scoring Practice…" : "Submit Practice Set"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
