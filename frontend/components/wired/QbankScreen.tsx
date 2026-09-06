"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Question = { id: string; stem: string; choices: string[]; answer?: string; topic_id?: string | null };

export function QbankScreen() {
  const [rows, setRows] = useState<Question[]>([]);
  const [stem, setStem] = useState("");
  const [choices, setChoices] = useState("A, B");
  const [answer, setAnswer] = useState("A");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Question | null>(null);

  function load() {
    api("/api/v1/questions")
      .then((data) => setRows(data as Question[]))
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
      await api("/api/v1/questions", {
        method: "POST",
        body: JSON.stringify({
          stem,
          choices: choices.split(",").map((s) => s.trim()).filter(Boolean),
          answer,
        }),
      });
      setStem("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Question bank</h2>
      <span className="k">{rows.length} items · tagged by tenant topics, not a syllabus</span>
      <Err message={error} />
      <form className="card" onSubmit={onCreate} style={{ marginBottom: 12 }}>
        <label className="field">
          <span>Stem</span>
          <input className="field__in" value={stem} onChange={(e) => setStem(e.target.value)} required />
        </label>
        <label className="field">
          <span>Choices (comma)</span>
          <input className="field__in" value={choices} onChange={(e) => setChoices(e.target.value)} />
        </label>
        <label className="field">
          <span>Answer</span>
          <input className="field__in" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </label>
        <button className="hot hot--btn" type="submit" disabled={busy}>
          New item
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>No questions yet.</Empty>
      ) : (
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Stem</th>
                <th>Choices</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)} style={{ cursor: "pointer" }}>
                  <td>{r.stem}</td>
                  <td className="muted">{(r.choices || []).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? (
        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ margin: 0 }}>{open.stem}</h3>
          {(open.choices || []).map((c) => (
            <div key={c} className={`qopt${c === open.answer ? " sel" : ""}`}>
              <i>✓</i>
              {c}
            </div>
          ))}
          <p className="muted">Answer: {open.answer}</p>
        </div>
      ) : null}
    </>
  );
}
