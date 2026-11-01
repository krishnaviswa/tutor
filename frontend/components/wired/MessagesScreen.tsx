"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CohortChat } from "@/components/studio/CohortChat";
import { api } from "@/lib/api";
import { AppBar, Err, Loading } from "./bits";

type ChatLine = { id: string; body: string };
type Thread = {
  id: string;
  student_id?: string | null;
  last_body?: string;
  unread?: boolean;
  messages?: ChatLine[];
};
type StudentRow = { id: string; user_id?: string; display_name: string };
type ContentRow = { id: string; title: string; kind?: string };
type Role = string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function MessagesScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [libraryItems, setLibraryItems] = useState<ContentRow[]>([]);
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
  const logRef = useRef<HTMLDivElement>(null);

  const samples: Thread[] = [
    { id: "ex-1", last_body: "Could we revisit the last example before Thursday?", student_id: "Example · after class" },
    { id: "ex-2", last_body: "I sent the notes from today’s session.", student_id: "Example · class notes" },
  ];

  async function load(): Promise<Thread[]> {
    try {
      const data = await api("/api/v1/threads");
      const list = Array.isArray(data) ? (data as Thread[]) : [];
      setThreads(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "teacher"))
      .catch(() => undefined);
    api("/api/v1/cohorts")
      .then((rows) => {
        const list = Array.isArray(rows) ? (rows as { id: string; name: string }[]) : [];
        setCohorts(list);
        if (list[0]) setCohortId(list[0].id);
      })
      .catch(() => undefined);
    api("/api/v1/students")
      .then((rows) => {
        const list = Array.isArray(rows) ? (rows as StudentRow[]) : [];
        setStudents(list);
      })
      .catch(() => undefined);
    api("/api/v1/content")
      .then((rows) => {
        const list = Array.isArray(rows) ? (rows as ContentRow[]) : [];
        setLibraryItems(list);
      })
      .catch(() => undefined);
    load();
  }, []);

  const studentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of students) {
      if (s.id) map[s.id] = s.display_name;
      if (s.user_id) map[s.user_id] = s.display_name;
    }
    return map;
  }, [students]);

  function resolveThreadTitle(rawId?: string | null): string {
    if (!rawId) return "Conversation";
    if (studentNameMap[rawId]) return studentNameMap[rawId];
    if (UUID_RE.test(rawId)) return "Student conversation";
    return rawId;
  }

  function chooseStudent(id: string) {
    setStudentId(id);
    if (!id) return;
    const existing = threads.find((thread) => thread.student_id === id);
    if (existing) {
      setSel(existing);
      return;
    }
    setSel({ id: "new", student_id: id, messages: [] });
  }

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const open = sel && sel.id !== "new" && threads.some((thread) => thread.id === sel.id) ? sel : null;
    const threadId = open ? open.id : "new";
    const sid = open ? open.student_id || undefined : studentId || undefined;
    try {
      const saved = (await api(`/api/v1/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body,
          ...(sid ? { student_id: sid } : {}),
          ...(attachment.trim() ? { attachment: attachment.trim() } : {}),
        }),
      })) as { thread_id?: string };
      setBody("");
      const next = await load();
      const opened = next.find((thread) => thread.id === saved.thread_id) || null;
      setSel(opened);
      setStudentId(opened?.student_id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = threads.length ? threads : samples;
  const active = sel && (sel.id === "new" || threads.some((thread) => thread.id === sel.id)) ? sel : shown[0];
  const example = active ? active.id !== "new" && !threads.some((thread) => thread.id === active.id) : false;
  const transcript =
    active?.messages && active.messages.length
      ? active.messages
      : active?.last_body
        ? [{ id: `${active.id}-last`, body: active.last_body }]
        : [];

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [active?.id, active?.messages?.length, active?.last_body, body]);

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
              <b>{resolveThreadTitle(t.student_id)}</b>
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
            {transcript.length ? (
              transcript.map((line) => (
                <div className="bubble" key={line.id}>
                  {line.body}
                  <small>{active?.unread ? "Unread" : "On the record"}</small>
                </div>
              ))
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
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <button className="hot hot--btn" type="submit" disabled={busy || !body.trim()} aria-busy={busy}>
              Send
            </button>
          </form>
          {role !== "student" && role !== "parent" ? (
            <label className="field" style={{ margin: "0 12px 12px" }}>
              <span>Student for a new thread</span>
              <select className="field__in" value={studentId} onChange={(e) => chooseStudent(e.target.value)}>
                <option value="">Active thread student (or select student)…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field" style={{ margin: "0 12px 8px" }}>
            <span>Attachment (Library material)</span>
            <select
              className="field__in"
              value={attachment}
              onChange={(e) => setAttachment(e.target.value)}
            >
              <option value="">No attachment</option>
              {libraryItems.map((item) => (
                <option key={item.id} value={item.title || item.id}>
                  {item.title}
                  {item.kind ? ` (${item.kind.toUpperCase()})` : ""}
                </option>
              ))}
            </select>
          </label>
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
