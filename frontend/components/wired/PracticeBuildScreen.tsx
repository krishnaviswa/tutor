"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Q = { id: string; stem: string };
type SetRow = { id: string; title: string; question_ids: string[] };

export function PracticeBuildScreen() {
  const [sets, setSets] = useState<SetRow[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [title, setTitle] = useState("Practice set");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/practice-sets"), api("/api/v1/questions")])
      .then(([s, q]) => {
        setSets(s as SetRow[]);
        setQuestions(q as Q[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/practice-sets", {
        method: "POST",
        body: JSON.stringify({ title, question_ids: picked }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function autoAssemble() {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/practice-sets", {
        method: "POST",
        body: JSON.stringify({ title, auto_assemble: { difficulty: "core", limit: 5 } }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <>
      <h2>Practice set builder</h2>
      <span className="k">{sets.length} sets · hand-pick from the bank</span>
      <Err message={error} />
      <form className="card" onSubmit={onCreate}>
        <label className="field">
          <span>Title</span>
          <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="k" style={{ marginBottom: 8 }}>Questions</div>
        {questions.map((q) => (
          <label key={q.id} className="list__i" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} />
            <div className="gr">
              <div className="t">{q.stem}</div>
            </div>
          </label>
        ))}
        <button className="hot hot--btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>
          Save set
        </button>
        <button
          className="hot hot--btn"
          type="button"
          disabled={busy}
          style={{ marginTop: 10, marginLeft: 8 }}
          onClick={() => void autoAssemble()}
        >
          Auto-assemble core
        </button>
      </form>
      {sets.length === 0 ? (
        <Empty>No practice sets yet.</Empty>
      ) : (
        sets.map((s) => (
          <div key={s.id} className="card">
            <div className="sb">
              <div>
                <div className="t">{s.title}</div>
                <div className="s muted">{(s.question_ids || []).length} items</div>
              </div>
              <Link href={catalogRoute("practice-play")} className="hot--link">
                Student play
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}
