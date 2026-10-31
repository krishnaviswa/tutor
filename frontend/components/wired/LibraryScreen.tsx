"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Item = {
  id: string;
  title: string;
  body?: string;
  topic_id?: string | null;
  kind?: string;
  duration_label?: string;
  progress_pct?: number;
  playlist_ids?: string[];
  drip_at?: string | null;
  views?: number;
  board_label?: string;
  subject_label?: string;
  unit_label?: string;
};

type TopicRow = {
  id: string;
  name?: string;
  title?: string;
};

const BOARD_OPTIONS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board", "General"] as const;

const SUBJECT_OPTIONS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
] as const;

const PRESET_UNITS = [
  "Unit 1 · Foundations",
  "Unit 2 · Core Concepts",
  "Unit 3 · Problem Solving",
  "Unit 4 · Exam Revision",
  "Formula Sheet & Reference",
] as const;

export function LibraryScreen() {
  const [rows, setRows] = useState<Item[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fileKind, setFileKind] = useState("pdf");
  const [board, setBoard] = useState<string>("CBSE");
  const [subjectChoice, setSubjectChoice] = useState<string>("Physics");
  const [customSubject, setCustomSubject] = useState("");
  const [unitChoice, setUnitChoice] = useState<string>(PRESET_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>("student");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");

  function load() {
    Promise.all([
      api("/api/v1/content") as Promise<Item[]>,
      api("/api/v1/topics").catch(() => []) as Promise<TopicRow[]>,
    ])
      .then(([data, topicRows]) => {
        setRows(Array.isArray(data) ? data : []);
        const validTopics = Array.isArray(topicRows) ? topicRows : [];
        setTopics(validTopics);
        if (validTopics[0]) {
          const firstLabel = validTopics[0].title || validTopics[0].name;
          if (firstLabel) setUnitChoice(firstLabel);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "student"))
      .catch(() => undefined);
    load();
  }, []);

  const canWrite = role === "teacher" || role === "owner";

  const unitOptions = useMemo(() => {
    const topicLabels = topics
      .map((t) => (t.title || t.name || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...topicLabels, ...PRESET_UNITS]));
  }, [topics]);

  const kinds = useMemo(() => {
    const set = new Set(rows.map((r) => (r.kind || "notes").toLowerCase()));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const shown = rows.filter((r) => filter === "all" || (r.kind || "notes").toLowerCase() === filter);

  const resolvedSubject = subjectChoice === "__custom__" ? customSubject.trim() : subjectChoice;
  const resolvedUnit = unitChoice === "__custom__" ? customUnit.trim() : unitChoice;

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/content", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          file_kind: fileKind,
          board,
          subject: resolvedSubject,
          unit: resolvedUnit,
        }),
      });
      setTitle("");
      setBody("");
      setCustomSubject("");
      setCustomUnit("");
      setShowUpload(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const list = (
    <>
      <Err message={error} />
      {canWrite && showUpload ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>Upload study material</h3>
          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Electrostatics Formula Sheet"
              />
            </label>
            <label className="field">
              <span>File format</span>
              <select className="field__in" value={fileKind} onChange={(e) => setFileKind(e.target.value)}>
                {["pdf", "png", "svg", "drawio", "docx", "pptx", "xlsx"].map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Summary / Notes</span>
            <textarea
              className="field__in"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Key concepts covered in this material…"
            />
          </label>

          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Board</span>
              <select className="field__in" value={board} onChange={(e) => setBoard(e.target.value)}>
                {BOARD_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Subject</span>
              <select
                className="field__in"
                value={subjectChoice}
                onChange={(e) => setSubjectChoice(e.target.value)}
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
                <option value="__custom__">Custom subject…</option>
              </select>
            </label>

            <label className="field">
              <span>Unit / Topic</span>
              <select
                className="field__in"
                value={unitChoice}
                onChange={(e) => setUnitChoice(e.target.value)}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="__custom__">Custom unit…</option>
              </select>
            </label>
          </div>

          {subjectChoice === "__custom__" ? (
            <label className="field">
              <span>Custom subject</span>
              <input
                className="field__in"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter subject name"
              />
            </label>
          ) : null}

          {unitChoice === "__custom__" ? (
            <label className="field">
              <span>Custom unit</span>
              <input
                className="field__in"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="Enter unit or topic title"
              />
            </label>
          ) : null}

          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button
              className="hot hot--btn"
              type="button"
              style={{ width: "auto", margin: 0 }}
              disabled={busy || !title.trim()}
              onClick={() => void create()}
            >
              {busy ? "Uploading…" : "Save material"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowUpload(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="chips" style={{ marginBottom: 12 }}>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip${filter === k ? " on" : ""}`}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "All" : k.toUpperCase()}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>No lessons yet. Click &ldquo;+ Upload Material&rdquo; to add study content.</Empty>
      ) : (
        <div className="lesson-grid">
          {shown.map((it) => {
            const pct = it.progress_pct ?? 0;
            const kind = it.kind || "notes";
            const dur = it.duration_label || "Open";
            return (
              <Link key={it.id} href={`${catalogRoute("lesson")}?id=${it.id}`} className="lesson-card">
                <span className="k">{kind}</span>
                <strong>{it.title}</strong>
                <span className="muted">
                  {dur}
                  {it.board_label ? ` · ${it.board_label}` : ""}
                  {it.subject_label ? ` · ${it.subject_label}` : ""}
                  {it.unit_label ? ` · ${it.unit_label}` : ""}
                </span>
                <span className="bar" aria-hidden="true">
                  <b style={{ width: `${Math.min(pct, 100)}%` }} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  if (role === "student" || role === "parent") {
    return (
      <>
        <AppBar title="Content" />
        <div className="appwrap">{list}</div>
      </>
    );
  }

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Content library</h2>
          <span className="k">Materials hang off tenant topics</span>
        </div>
        {canWrite ? (
          <button
            type="button"
            className={showUpload ? "btn btn--sm" : "hot hot--btn"}
            style={{ width: "auto", margin: 0, cursor: "pointer" }}
            onClick={() => setShowUpload((prev) => !prev)}
          >
            {showUpload ? "Close upload" : "+ Upload Material"}
          </button>
        ) : null}
      </div>
      {list}
    </>
  );
}
