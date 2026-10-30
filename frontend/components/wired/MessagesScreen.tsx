"use client";

import { useEffect, useRef, useState } from "react";
import { CohortChat } from "@/components/studio/CohortChat";
import { api } from "@/lib/api";
import { AppBar, Err, Loading } from "./bits";

type Thread = { id: string; student_id?: string | null; last_body?: string; unread?: boolean };
type Role = string;

export function MessagesScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sel, setSel] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [delivery, setDelivery] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const samples: Thread[] = [
    { id: "ex-1", last_body: "Could we revisit the last example before Thursday?", student_id: "Example · after class" },
    { id: "ex-2", last_body: "I sent the notes from today’s session.", student_id: "Example · class notes" },
  ];

  function load() {
    api("/api/v1/threads")
      .then((data) => setThreads(data as Thread[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "teacher"))
      .catch(() => undefined);
    api("/api/v1/cohorts")
      .then((rows) => {
        const list = rows as { id: string; name: string }[];
        setCohorts(list);
        if (list[0]) setCohortId(list[0].id);
      })
      .catch(() => undefined);
    load();
  }, []);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const real = sel && threads.some((t) => t.id === sel.id) ? sel : null;
      const threadId = real?.id || "new";
      await api(`/api/v1/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body,
          student_id: studentId || real?.student_id || undefined,
          ...(attachment.trim() ? { attachment: attachment.trim() } : {}),
        }),
      });
      setBody("");
      setDelivery("Sent");
      load();
    } catch (err) {
      setDelivery("");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = threads.length ? threads : samples;
  const active = sel && threads.some((t) => t.id === sel.id) ? sel : shown[0];
  const example = active ? !threads.some((t) => t.id === active.id) : false;

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [active?.id, active?.last_body, delivery, body]);

  const list = (
    <>
      <Err message={error} />
      {!ready ? <Loading>Loading messages…</Loading> : null}
      <div className="chat">
        <div className="chat__list" aria-label="Threads">
          {shown.map((t) => (
            <button
              key={t.id}
              type="button"
              className={active?.id === t.id ? "chat__person on" : "chat__person"}
              onClick={() => setSel(t)}
            >
              <b>{t.student_id || "Conversation"}</b>
              <span>{t.last_body || "No messages yet"}</span>
            </button>
          ))}
        </div>
        <section className="chat__thread" aria-label="Conversation">
          <div className="chat__log" ref={logRef}>
            {example ? (
              <p className="muted" style={{ margin: "0 0 8px" }}>
                Example thread, so the inbox isn’t an empty page. A message you send is saved.
              </p>
            ) : null}
            {active?.last_body ? (
              <div className="bubble">
                {active.last_body}
                <small>{active.unread ? "Unread" : "On the record"}</small>
              </div>
            ) : (
              <p className="muted">Write the first note in this thread.</p>
            )}
            {body.trim() && busy ? (
              <div className="bubble bubble--mine">
                {body}
                <small>Sending…</small>
              </div>
            ) : null}
          </div>
          <form
            className="chat__compose"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <textarea
              rows={2}
              value={body}
              placeholder="Write a message"
              onChange={(event) => {
                setBody(event.target.value);
                if (delivery) setDelivery("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <button className="hot hot--btn" type="submit" disabled={busy || !body.trim()} aria-busy={busy}>
              {busy ? "Sending" : delivery || "Send"}
            </button>
          </form>
          {role !== "student" && role !== "parent" ? (
            <label className="field" style={{ margin: "0 12px 12px" }}>
              <span>Student id for a new thread</span>
              <input className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </label>
          ) : null}
          {attachment !== undefined ? (
            <label className="field" style={{ margin: "0 12px 8px" }}>
              <span>Attachment</span>
              <input
                className="field__in"
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
                placeholder="Optional path"
              />
            </label>
          ) : null}
        </section>
      </div>
      {role !== "parent" && cohorts.length > 0 ? (
        <div className="card" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Class chat</span>
            <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {cohortId ? <CohortChat cohortId={cohortId} /> : null}
        </div>
      ) : null}
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
