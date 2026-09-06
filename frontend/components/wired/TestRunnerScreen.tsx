"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

const LIMIT_SEC = 15 * 60;

type Test = { id: string; title: string };
type Run = { id: string; title: string; questions: { id: string; stem: string; choices: string[] }[] };

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
      .then((rows) => setTests(rows as Test[]))
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

  return (
    <>
      <AppBar title="Test" extra={run ? <span className="pill">{clock(left)}</span> : undefined} />
      <div className="appwrap">
        <Err message={error} />
        {!run ? (
          tests.length === 0 ? (
            <Empty>No tests.</Empty>
          ) : (
            tests.map((t) => (
              <button key={t.id} type="button" className="hot hot--card" style={{ width: "100%" }} onClick={() => void start(t.id)}>
                {t.title}
              </button>
            ))
          )
        ) : (
          <>
            <h3>{run.title}</h3>
            <p className="muted">Auto-submits at 00:00.</p>
            {run.questions.map((q, i) => (
              <div key={q.id} className="card">
                <div className="k">Q{i + 1}</div>
                <p style={{ margin: "8px 0" }}>{q.stem}</p>
                {(q.choices || []).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`qopt${answers[q.id] === c ? " sel" : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: c }))}
                  >
                    <i>•</i>
                    {c}
                  </button>
                ))}
              </div>
            ))}
            <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? "Submitting…" : "Submit test"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
