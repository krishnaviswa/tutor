"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { Empty, Err } from "./bits";

type Row = {
  id: string;
  title: string;
  body: string;
  cohort_id?: string | null;
  scheduled_at?: string;
  channels?: string[];
};
type Cohort = { id: string; name: string };

const ANNOUNCE_TEMPLATES = [
  { label: "Custom announcement…", title: "", body: "" },
  {
    label: "Class Schedule Update",
    title: "Class Schedule Update",
    body: "Please check the updated session timing on your week calendar.",
  },
  {
    label: "Mock Test Reminder",
    title: "Upcoming Mock Test Reminder",
    body: "Our next benchmark mock test is scheduled this weekend. Revise the core practice set beforehand.",
  },
  {
    label: "New Study Material Added",
    title: "New Study Material Uploaded",
    body: "New revision notes and worked examples have been added to the content library.",
  },
] as const;

export function AnnounceScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [template, setTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/announcements"), api("/api/v1/cohorts")])
      .then(([a, c]) => {
        setRows(Array.isArray(a) ? (a as Row[]) : []);
        setCohorts(Array.isArray(c) ? (c as Cohort[]) : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  const cohortMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of cohorts) map[c.id] = c.name;
    return map;
  }, [cohorts]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, cohort_id: cohortId || null, channels: ["in_app"] }),
      });
      setTitle("");
      setBody("");
      setTemplate("");
      setShowCompose(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Announcements</h2>
          <span className="k">Broadcasts write the timeline, then mock channels</span>
        </div>
        <button
          type="button"
          className={showCompose ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowCompose((prev) => !prev)}
        >
          {showCompose ? "Close form" : "+ New Announcement"}
        </button>
      </div>

      <Err message={error} />

      {showCompose ? (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: 14 }}>
          <h3>Publish announcement</h3>
          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Template</span>
              <select
                className="field__in"
                value={template}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplate(val);
                  const found = ANNOUNCE_TEMPLATES.find((t) => t.label === val);
                  if (found && found.title) {
                    setTitle(found.title);
                    setBody(found.body);
                  }
                }}
              >
                {ANNOUNCE_TEMPLATES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement headline"
                required
              />
            </label>

            <label className="field">
              <span>Target audience</span>
              <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                <option value="">Whole workspace</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Message body</span>
            <textarea
              className="field__in"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Write the announcement details…"
            />
          </label>

          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button className="hot hot--btn" type="submit" disabled={busy} style={{ width: "auto", margin: 0 }}>
              {busy ? "Publishing…" : "Publish"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowCompose(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <Empty>No announcements yet. Click &ldquo;+ New Announcement&rdquo; to broadcast a notice.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="list__i">
            <div className="gr">
              <div className="t">{r.title}</div>
              <div className="s">{r.body}</div>
              <div className="s muted">
                {[
                  r.cohort_id && cohortMap[r.cohort_id] ? cohortMap[r.cohort_id] : "Whole workspace",
                  r.scheduled_at ? formatWhen(r.scheduled_at) : "",
                  (r.channels || []).map((ch) => (ch === "in_app" ? "In-app timeline" : ch)).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
