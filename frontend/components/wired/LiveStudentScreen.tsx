"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Live = {
  session: { id: string; title: string };
  view: string;
  video_url?: string | null;
  engagement: { kind: string }[];
};

export function LiveStudentScreen() {
  const params = useSearchParams();
  const [sessionId, setSessionId] = useState(params.get("session") || "");
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params.get("session");
    if (id) setSessionId(id);
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    api(`/api/v1/sessions/${sessionId}/live`)
      .then((row) => setLive(row as Live))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [sessionId]);

  return (
    <div className="studio" style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {!sessionId ? (
        <div style={{ padding: 16 }}>
          <p className="muted">Join from the waiting room so attendance is recorded.</p>
          <Link href={catalogRoute("join")} className="hot hot--btn">
            Open join
          </Link>
        </div>
      ) : null}
      <div className="vmain" style={{ aspectRatio: "3/4", flex: 1 }}>
        {live?.session.title || "Waiting"} · {live?.view || "student"}
        <div style={{ width: "100%" }}>{live?.video_url || "Join from the waiting room first"}</div>
      </div>
      <div className="dock" style={{ borderColor: "#2f5140", background: "#15241d" }}>
        <div style={{ fontSize: ".7rem", color: "#8fd3ab", letterSpacing: ".08em", textTransform: "uppercase" }}>
          Live · mock
        </div>
        <div style={{ fontSize: ".86rem", color: "#eef4f1", margin: "6px 0 10px" }}>
          {(live?.engagement || []).slice(-1)[0]?.kind || "No poll yet"}
        </div>
      </div>
      <Err message={error} />
      <div className="ctrls">
        <Link href={catalogRoute("student-dash")} className="hot hot--btn" style={{ background: "#A4384A" }}>
          Leave
        </Link>
      </div>
    </div>
  );
}
