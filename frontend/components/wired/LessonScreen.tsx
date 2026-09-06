"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Item = { id: string; title: string; body: string };

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
              ▶
            </div>
            <h2 style={{ fontSize: "1.1rem", margin: "12px 0 4px" }}>{item.title}</h2>
            <p className="muted" style={{ marginBottom: 12, whiteSpace: "pre-wrap" }}>
              {item.body || "No notes yet."}
            </p>
            <Link href={catalogRoute("practice-play")} className="hot hot--card">
              <div className="k" style={{ color: "var(--tint)" }}>Next</div>
              <div style={{ fontWeight: 600, marginTop: 3 }}>Practice</div>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
