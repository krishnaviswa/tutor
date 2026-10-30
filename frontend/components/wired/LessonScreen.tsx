"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err, Loading } from "./bits";

type Item = {
  id: string;
  title: string;
  body: string;
  kind?: string;
  duration_label?: string;
  notes?: string[];
  next_practice?: { id: string; title: string } | null;
};

export function LessonScreen() {
  const params = useSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const done = () => {
      if (!cancelled) setReady(true);
    };
    const id = params.get("id");
    if (id) {
      api(`/api/v1/content/${id}`)
        .then((row) => {
          if (!cancelled) setItem(row as Item);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        })
        .finally(done);
      return () => {
        cancelled = true;
      };
    }
    api("/api/v1/content")
      .then((rows) => {
        if (cancelled) return;
        const all = rows as Item[];
        if (all[0]) setItem(all[0]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(done);
    return () => {
      cancelled = true;
    };
  }, [params]);

  const notes = item?.notes?.length ? item.notes : item?.body ? [item.body] : [];
  const next = item?.next_practice;

  return (
    <>
      <AppBar title="Lesson" />
      <div className="appwrap">
        <Err message={error} />
        {!ready ? (
          <Loading>Loading the lesson…</Loading>
        ) : !item ? (
          error ? null : <Empty>No lessons in the library yet.</Empty>
        ) : (
          <>
            <div className="stage" style={{ aspectRatio: "16/9" }}>
              {item.kind === "video" ? "▶" : item.kind || "notes"}
            </div>
            <h2 style={{ margin: "16px 0 4px" }}>{item.title}</h2>
            <div className="muted" style={{ marginBottom: 12 }}>
              {[item.kind, item.duration_label].filter(Boolean).join(" · ") || "Lesson"}
            </div>
            {notes.length ? (
              <div className="card">
                <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                  {notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">No notes yet.</p>
            )}
            <Link href={catalogRoute("practice-play")} className="hot hot--card">
              <div className="k">Next</div>
              <div style={{ fontWeight: 600, marginTop: 3 }}>{next?.title || "Practice"}</div>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
