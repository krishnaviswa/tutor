"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { shortId } from "@/lib/format";
import { Dialog } from "@/components/Dialog";
import { Empty, Err } from "./bits";

type Question = {
  id: string;
  stem: string;
  choices: string[];
  answer?: string;
  topic_id?: string | null;
  difficulty?: string;
  tags?: string[];
  usage_count?: number;
};

type TopicRow = {
  id: string;
  name?: string;
  title?: string;
};

const DIFFICULTY_OPTIONS = [
  { value: "core", label: "Core / Standard" },
  { value: "foundation", label: "Foundation / Easy" },
  { value: "stretch", label: "Stretch / Advanced" },
] as const;

const PRESET_TAGS = [
  { value: "pyq", label: "PYQ (Past Paper)" },
  { value: "numerical", label: "Numerical" },
  { value: "conceptual", label: "Conceptual" },
  { value: "review", label: "Review" },
] as const;

const FALLBACK_TOPICS = [
  "Mechanics & Kinematics",
  "Electrodynamics",
  "Thermodynamics",
  "Organic Chemistry",
  "Physical Chemistry",
  "Calculus & Algebra",
  "Cell Biology & Genetics",
  "Reading & Comprehension",
];

function difficultyLabel(value?: string): string {
  const found = DIFFICULTY_OPTIONS.find((d) => d.value === value);
  return found ? found.label : value || "Core / Standard";
}

export function QbankScreen() {
  const [rows, setRows] = useState<Question[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [stem, setStem] = useState("");
  const [optionA, setOptionA] = useState("Option A");
  const [optionB, setOptionB] = useState("Option B");
  const [optionC, setOptionC] = useState("Option C");
  const [optionD, setOptionD] = useState("Option D");
  const [answer, setAnswer] = useState("Option A");
  const [difficulty, setDifficulty] = useState("core");
  const [topicId, setTopicId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Question | null>(null);

  const structuredChoices = useMemo(
    () => [optionA, optionB, optionC, optionD].map((s) => s.trim()).filter(Boolean),
    [optionA, optionB, optionC, optionD],
  );

  const resolvedAnswer = useMemo(() => {
    if (structuredChoices.includes(answer)) return answer;
    return structuredChoices[0] || "";
  }, [structuredChoices, answer]);

  function load() {
    Promise.all([
      api("/api/v1/questions") as Promise<Question[]>,
      api("/api/v1/topics").catch(() => []) as Promise<TopicRow[]>,
    ])
      .then(([qData, tData]) => {
        setRows(Array.isArray(qData) ? qData : []);
        setTopics(Array.isArray(tData) ? tData : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (structuredChoices.length < 2) {
      setError("Provide at least 2 answer choices.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const isRealTopic = topics.some((t) => t.id === topicId);
      const presetTopicTag = !isRealTopic && topicId.startsWith("preset:") ? topicId.slice(7) : "";
      const finalTags = presetTopicTag && !selectedTags.includes(presetTopicTag)
        ? [...selectedTags, presetTopicTag]
        : selectedTags;

      await api("/api/v1/questions", {
        method: "POST",
        body: JSON.stringify({
          stem,
          choices: structuredChoices,
          answer: resolvedAnswer,
          topic_id: isRealTopic ? topicId : undefined,
          difficulty: difficulty || "core",
          tags: finalTags,
        }),
      });
      setStem("");
      setOptionA("Option A");
      setOptionB("Option B");
      setOptionC("Option C");
      setOptionD("Option D");
      setAnswer("Option A");
      setDifficulty("core");
      setTopicId("");
      setSelectedTags([]);
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const topicMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of topics) {
      map[t.id] = t.title || t.name || "Topic";
    }
    return map;
  }, [topics]);

  const filteredRows = useMemo(() => {
    if (difficultyFilter === "all") return rows;
    return rows.filter((r) => (r.difficulty || "core") === difficultyFilter);
  }, [rows, difficultyFilter]);

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Question bank</h2>
          <span className="k">{rows.length} items · tagged by tenant topics, not a syllabus</span>
        </div>
        <button
          type="button"
          className={showCreate ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowCreate((prev) => !prev)}
        >
          {showCreate ? "Close form" : "+ Add Question"}
        </button>
      </div>

      <Err message={error} />

      {showCreate ? (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: 14 }}>
          <h3>New question</h3>
          <label className="field">
            <span>Question stem</span>
            <input
              className="field__in"
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Enter the question prompt…"
              required
            />
          </label>

          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Option A</span>
              <input
                className="field__in"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="First choice"
                required
              />
            </label>
            <label className="field">
              <span>Option B</span>
              <input
                className="field__in"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Second choice"
                required
              />
            </label>
            <label className="field">
              <span>Option C</span>
              <input
                className="field__in"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                placeholder="Third choice (optional)"
              />
            </label>
            <label className="field">
              <span>Option D</span>
              <input
                className="field__in"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                placeholder="Fourth choice (optional)"
              />
            </label>
          </div>

          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Correct answer</span>
              <select
                className="field__in"
                value={resolvedAnswer}
                onChange={(e) => setAnswer(e.target.value)}
              >
                {structuredChoices.map((choice, idx) => (
                  <option key={`${idx}-${choice}`} value={choice}>
                    {String.fromCharCode(65 + idx)}: {choice}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Difficulty</span>
              <select
                className="field__in"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Topic</span>
              <select
                className="field__in"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                <option value="">General / Unspecified</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || t.name || shortId(t.id)}
                  </option>
                ))}
                {topics.length === 0 &&
                  FALLBACK_TOPICS.map((label) => (
                    <option key={label} value={`preset:${label}`}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="field" style={{ marginTop: 6 }}>
            <span>Question tags</span>
            <div className="chips" style={{ marginTop: 6 }}>
              {PRESET_TAGS.map((tag) => {
                const active = selectedTags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    type="button"
                    className={`chip${active ? " on" : ""}`}
                    onClick={() => toggleTag(tag.value)}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="hot hot--btn" type="submit" disabled={busy} style={{ width: "auto", margin: 0 }}>
              {busy ? "Saving…" : "Save question"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="chips" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`chip${difficultyFilter === "all" ? " on" : ""}`}
          onClick={() => setDifficultyFilter("all")}
        >
          All ({rows.length})
        </button>
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`chip${difficultyFilter === opt.value ? " on" : ""}`}
            onClick={() => setDifficultyFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <Empty>No questions match this view yet. Click &ldquo;+ Add Question&rdquo; to add one.</Empty>
      ) : (
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Question stem</th>
                <th>Options</th>
                <th>Difficulty</th>
                <th>Tags</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.stem}</div>
                    {r.topic_id && topicMap[r.topic_id] ? (
                      <div className="s muted">{topicMap[r.topic_id]}</div>
                    ) : null}
                  </td>
                  <td className="muted">{(r.choices || []).join(" · ")}</td>
                  <td>
                    <span className="pill">{difficultyLabel(r.difficulty)}</span>
                  </td>
                  <td className="muted">
                    {(r.tags || []).length ? (r.tags || []).join(", ") : "—"}
                  </td>
                  <td className="muted">{r.usage_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <Dialog title={open.stem} onClose={() => setOpen(null)}>
          {(open.choices || []).map((c) => (
            <div key={c} className={`qopt${c === open.answer ? " sel" : ""}`}>
              <i>✓</i>
              {c}
            </div>
          ))}
          <p className="muted" style={{ marginTop: 8 }}>
            Correct answer: <b>{open.answer}</b> · {difficultyLabel(open.difficulty)}
          </p>
        </Dialog>
      ) : null}
    </>
  );
}
