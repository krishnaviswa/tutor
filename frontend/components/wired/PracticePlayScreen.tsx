"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type SetRow = { id: string; title: string; question_ids?: string[] };
type Play = { id: string; title: string; questions: { id: string; stem: string; choices: string[] }[] };

export function PracticePlayScreen() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [play, setPlay] = useState<Play | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/practice-sets")
      .then((rows) => setSets(rows as SetRow[]))
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

  return (
    <>
      <AppBar title="Practice" />
      <div className="appwrap">
        <Err message={error} />
        {!play ? (
          sets.length === 0 ? (
            <Empty>No practice sets in this workspace.</Empty>
          ) : (
            sets.map((s) => (
              <button key={s.id} type="button" className="hot hot--card" style={{ width: "100%" }} onClick={() => void start(s.id)}>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div className="muted">{(s.question_ids || []).length} questions</div>
              </button>
            ))
          )
        ) : (
          <>
            <h3>{play.title}</h3>
            {play.questions.map((q, i) => (
              <div key={q.id} className="card">
                <div className="k">Q{i + 1}</div>
                <p style={{ margin: "8px 0" }}>{q.stem}</p>
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
            <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void submit()}>
              Submit
            </button>
          </>
        )}
      </div>
    </>
  );
}
