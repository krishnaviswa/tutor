"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

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
  const [list, setList] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params.get("id");
    if (id) {
      api(`/api/v1/content/${id}`)
        .then((row) => setItem(row as Item))
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
      return;
    }
    api("/api/v1/content")
      .then((rows) => {
        const all = rows as Item[];
        setList(all);
        if (all[0]) setItem(all[0]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [params]);

  const notes = item?.notes?.length ? item.notes : item?.body ? [item.body] : [];
  const next = item?.next_practice;

  return (
    <>
      <AppBar title="Lesson" />
      <div className="appwrap">
        <Err message={error} />
        {!item ? (
          list.length === 0 ? (
            <Empty>No lessons in the library yet.</Empty>
          ) : null
        ) : (
          <>
            <div
              style={{
                background: "#11171a",
                borderRadius: 12,
                aspectRatio: "16/9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cdd6d3",
              }}
            >
              {item.kind === "video" ? "▶" : item.kind || "notes"}
            </div>
            <h2 style={{ fontSize: "1.1rem", margin: "12px 0 4px" }}>{item.title}</h2>
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
              <div className="k" style={{ color: "var(--tint)" }}>Next</div>
              <div style={{ fontWeight: 600, marginTop: 3 }}>{next?.title || "Practice"}</div>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
