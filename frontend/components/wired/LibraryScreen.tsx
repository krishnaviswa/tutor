"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Item = { id: string; title: string; body?: string; topic_id?: string | null };

export function LibraryScreen() {
  const [rows, setRows] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>("student");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/content")
      .then((data) => setRows(data as Item[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "student"))
      .catch(() => undefined);
    load();
  }, []);

  const canWrite = role === "teacher" || role === "owner";

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/content", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      setTitle("");
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
      {canWrite ? (
        <div className="card">
          <label className="field">
            <span>Title</span>
            <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea className="field__in" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          </label>
          <button className="hot hot--btn" type="button" disabled={busy || !title} onClick={() => void create()}>
            Add item
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <Empty>No content yet.</Empty>
      ) : (
        rows.map((it) => (
          <Link key={it.id} href={`${catalogRoute("lesson")}?id=${it.id}`} className="hot hot--row">
            <div className="t">{it.title}</div>
            <div className="s muted">{it.body?.slice(0, 80) || "Open lesson"}</div>
          </Link>
        ))
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
      <h2>Content library</h2>
      <span className="k">Materials hang off tenant topics</span>
      {list}
    </>
  );
}
