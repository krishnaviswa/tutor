"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Thread = { id: string; student_id?: string | null; last_body?: string };
type Role = string;

export function MessagesScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sel, setSel] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/threads")
      .then((data) => setThreads(data as Thread[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "teacher"))
      .catch(() => undefined);
    load();
  }, []);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const threadId = sel?.id || "new";
      await api(`/api/v1/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, student_id: studentId || sel?.student_id || undefined }),
      });
      setBody("");
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
      {threads.length === 0 ? <Empty>No threads yet. Send the first message.</Empty> : null}
      {threads.map((t) => (
        <button
          key={t.id}
          type="button"
          className={sel?.id === t.id ? "hot hot--row" : "card"}
          style={{ width: "100%", textAlign: "left" }}
          onClick={() => setSel(t)}
        >
          <div className="t">{t.last_body || t.id}</div>
          <div className="s muted">{t.student_id}</div>
        </button>
      ))}
      <div className="card">
        {role !== "student" && role !== "parent" ? (
          <label className="field">
            <span>Student id (new thread)</span>
            <input className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          </label>
        ) : null}
        <label className="field">
          <span>Message</span>
          <textarea className="field__in" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        </label>
        <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void send()}>
          Send
        </button>
      </div>
    </>
  );

  if (role === "parent" || role === "student") {
    return (
      <>
        <AppBar title="Chat" />
        <div className="appwrap">{list}</div>
      </>
    );
  }

  return (
    <>
      <h2>Message threads</h2>
      <span className="k">On the record · not a second inbox</span>
      {list}
    </>
  );
}
