"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import "./comms.css";

type CohortMessage = {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  meta?: Record<string, unknown>;
};

type StudentRow = { id: string; user_id?: string; display_name: string };
type StaffRow = { id: string; user_id?: string; display_name?: string; name?: string; role?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timeMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatWhen(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CohortChat({ cohortId, title }: { cohortId: string; title?: string }) {
  const [messages, setMessages] = useState<CohortMessage[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [delivery, setDelivery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api("/api/v1/students").catch(() => []) as Promise<StudentRow[]>,
      api("/api/v1/staff").catch(() => []) as Promise<StaffRow[]>,
    ]).then(([studs, staffRows]) => {
      if (!alive) return;
      setStudents(Array.isArray(studs) ? studs : []);
      setStaff(Array.isArray(staffRows) ? staffRows : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const nameByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const st of students) {
      if (st.id && st.display_name) map[st.id] = st.display_name;
      if (st.user_id && st.display_name) map[st.user_id] = st.display_name;
    }
    for (const member of staff) {
      const label = member.display_name || member.name;
      if (!label || UUID_RE.test(label)) continue;
      if (member.id) map[member.id] = label;
      if (member.user_id) map[member.user_id] = label;
    }
    return map;
  }, [students, staff]);

  function resolveSenderName(message: CohortMessage): string {
    const metaName =
      typeof message.meta?.sender_name === "string"
        ? message.meta.sender_name
        : typeof message.meta?.display_name === "string"
          ? message.meta.display_name
          : "";
    if (metaName && !UUID_RE.test(metaName)) return metaName;
    const mapped = nameByUserId[message.sender_user_id];
    if (mapped && !UUID_RE.test(mapped)) return mapped;
    const roleHint = typeof message.meta?.role === "string" ? message.meta.role : "";
    if (roleHint === "student") return "Student";
    if (!message.sender_user_id || UUID_RE.test(message.sender_user_id)) return "Faculty";
    return message.sender_user_id;
  }

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/v1/cohorts/${encodeURIComponent(cohortId)}/messages`);
      if (!Array.isArray(data)) {
        setLoadError("Could not read class messages.");
        return;
      }
      const rows = (data as CohortMessage[])
        .slice()
        .sort((a, b) => timeMs(a.created_at) - timeMs(b.created_at));
      setMessages(rows);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, [cohortId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setSendError("");
    try {
      await api(`/api/v1/cohorts/${encodeURIComponent(cohortId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setBody((current) => (current.trim() === text ? "" : current));
      setDelivery("Sent");
      await load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const draftEmpty = body.trim().length === 0;

  return (
    <section className="studio-chat" aria-label={title || "Class chat"}>
      {title ? <h2 className="studio-chat__title">{title}</h2> : null}
      {loadError ? (
        <p className="studio-chat__error" role="alert">
          {loadError}
        </p>
      ) : null}
      {sendError ? (
        <p className="studio-chat__error" role="alert">
          {sendError}
        </p>
      ) : null}
      <ul className="studio-chat__list" ref={listRef} role="log" aria-live="polite">
        {!loadError && messages.length === 0 ? (
          <li>
            <p className="studio-chat__empty">No messages in this class yet.</p>
          </li>
        ) : null}
        {messages.map((message) => (
          <li key={message.id} className="studio-msg">
            <div className="studio-msg__meta">
              <span>{resolveSenderName(message)}</span>
              <time dateTime={message.created_at}>{formatWhen(message.created_at)}</time>
            </div>
            <p className="studio-msg__body">{message.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="studio-chat__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="studio-chat__input-label">
          <span className="studio-sr">Message</span>
          <textarea
            className="studio-chat__input"
            value={body}
            rows={2}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message"
          />
        </label>
        <button className="studio-chat__send" type="submit" disabled={draftEmpty || busy} aria-busy={busy}>
          {busy ? "Sending" : delivery || "Send"}
        </button>
      </form>
    </section>
  );
}
