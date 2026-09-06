"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Test = { id: string; title: string };
type Run = { id: string; title: string; questions: { id: string; stem: string; choices: string[] }[] };

export function TestRunnerScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submit() {
    if (!run) return;
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar title="Test" />
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
              Submit test
            </button>
          </>
        )}
      </div>
    </>
  );
}
