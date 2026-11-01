"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Q = { id: string; stem: string; difficulty?: string; tags?: string[] };
type SetRow = { id: string; title: string; question_ids: string[] };

const TITLE_PRESETS = [
  "Daily Core Practice",
  "Topic Revision Drill",
  "Previous Year Questions (PYQ)",
  "Foundation Warm-up Set",
  "Stretch Problem Set",
] as const;

const DIFFICULTY_CHOICES = [
  { value: "core", label: "Core / Standard" },
  { value: "foundation", label: "Foundation / Easy" },
  { value: "stretch", label: "Stretch / Advanced" },
] as const;

export function PracticeBuildScreen() {
  const [sets, setSets] = useState<SetRow[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [titlePreset, setTitlePreset] = useState<string>(TITLE_PRESETS[0]);
  const [title, setTitle] = useState<string>(TITLE_PRESETS[0]);
  const [autoDifficulty, setAutoDifficulty] = useState("core");
  const [autoLimit, setAutoLimit] = useState("5");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/practice-sets"), api("/api/v1/questions")])
      .then(([s, q]) => {
        setSets(Array.isArray(s) ? (s as SetRow[]) : []);
        setQuestions(Array.isArray(q) ? (q as Q[]) : []);
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
        body: JSON.stringify({ title: title.trim() || "Practice set", question_ids: picked }),
      });
      setPicked([]);
      setShowBuilder(false);
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
        body: JSON.stringify({
          title: title.trim() || "Practice set",
          auto_assemble: { difficulty: autoDifficulty, limit: Number(autoLimit) || 5 },
        }),
      });
      setShowBuilder(false);
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
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Practice set builder</h2>
          <span className="k">{sets.length} sets · hand-pick or auto-assemble from the question bank</span>
        </div>
        <button
          type="button"
          className={showBuilder ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowBuilder((prev) => !prev)}
        >
          {showBuilder ? "Close builder" : "+ Build Practice Set"}
        </button>
      </div>

      <Err message={error} />

      {showBuilder ? (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: 14 }}>
          <h3>Create practice set</h3>
          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Set template</span>
              <select
                className="field__in"
                value={titlePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitlePreset(val);
                  if (val !== "__custom__") setTitle(val);
                }}
              >
                {TITLE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="__custom__">Custom title…</option>
              </select>
            </label>
            <label className="field">
              <span>Set title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitlePreset("__custom__");
                }}
                required
              />
            </label>
          </div>

          <div className="grid g2" style={{ gap: 10, marginTop: 4 }}>
            <label className="field">
              <span>Auto-assemble difficulty</span>
              <select
                className="field__in"
                value={autoDifficulty}
                onChange={(e) => setAutoDifficulty(e.target.value)}
              >
                {DIFFICULTY_CHOICES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Auto-assemble size</span>
              <select
                className="field__in"
                value={autoLimit}
                onChange={(e) => setAutoLimit(e.target.value)}
              >
                <option value="5">5 questions</option>
                <option value="10">10 questions</option>
                <option value="15">15 questions</option>
                <option value="20">20 questions</option>
              </select>
            </label>
          </div>

          <div className="k" style={{ margin: "10px 0 8px" }}>
            Or hand-pick questions ({picked.length} selected)
          </div>
          {questions.length === 0 ? (
            <p className="muted">No questions in the bank yet.</p>
          ) : (
            questions.map((q) => (
              <label key={q.id} className="list__i" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} />
                <div className="gr">
                  <div className="t">{q.stem}</div>
                  {q.difficulty ? <div className="s muted">Difficulty: {q.difficulty}</div> : null}
                </div>
              </label>
            ))
          )}

          <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
            <button className="hot hot--btn" type="submit" disabled={busy} style={{ width: "auto", margin: 0 }}>
              Save hand-picked set
            </button>
            <button
              className="btn btn--dark btn--sm"
              type="button"
              disabled={busy}
              style={{ width: "auto", margin: 0 }}
              onClick={() => void autoAssemble()}
            >
              Auto-assemble ({autoLimit} · {autoDifficulty})
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowBuilder(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {sets.length === 0 ? (
        <Empty>No practice sets yet. Click &ldquo;+ Build Practice Set&rdquo; to create one.</Empty>
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
