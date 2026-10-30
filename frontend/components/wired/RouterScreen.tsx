"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";
import { catalogRoute } from "@/lib/screens";

type Me = { role?: string; workspace?: { kind?: string; slug?: string } };

export function RouterScreen() {
  const [kind, setKind] = useState<string>("exam-prep");
  const [wsName, setWsName] = useState("TutorOS");

  useEffect(() => {
    if (!getToken()) return;
    api("/api/v1/auth/me")
      .then((row) => {
        const me = row as Me;
        if (me.workspace?.kind) setKind(me.workspace.kind);
        if (me.workspace?.slug) setWsName(me.workspace.slug);
      })
      .catch(() => undefined);
    api("/api/v1/workspaces/current")
      .then((w) => {
        const row = w as { name?: string; kind?: string };
        if (row.name) setWsName(row.name);
        if (row.kind) setKind(row.kind);
      })
      .catch(() => undefined);
  }, []);

  const hideStaff = kind === "exam-prep";
  const staffHref = hideStaff ? catalogRoute("teacher-dash") : catalogRoute("staff-login");

  return (
    <div className="role-doors">
      <section className="role-doors__copy">
        <p className="k" style={{ color: "rgba(255,255,255,.8)" }}>
          Europe · India · United States · China
        </p>
        <h1 style={{ color: "#fff", fontSize: "2.4rem", maxWidth: 460, marginTop: 12 }}>{wsName}</h1>
      </section>
      <section className="role-doors__panel">
        <h2 style={{ marginBottom: 6 }}>Choose a door</h2>
        <p className="muted" style={{ marginBottom: 18 }}>
          One workspace. Student, teacher, or parent.
        </p>
        <Link href={catalogRoute("student-login")} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>I’m here to learn</div>
          <div className="muted">Classes, practice, doubts, and your record</div>
        </Link>
        <Link href={staffHref} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>I’m a teacher</div>
          <div className="muted">Schedule, whiteboard, students, and the doubt queue</div>
        </Link>
        <Link href={catalogRoute("parent-link")} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>I’m a parent</div>
          <div className="muted">Activity, reports, and fees for your child</div>
        </Link>
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          Mock code 000000
          {hideStaff ? (
            <>
              {" "}
              · <Link href={catalogRoute("staff-login")}>other staff sign-in</Link>
            </>
          ) : null}
        </p>
      </section>
      <style>{`
        .role-doors {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr minmax(300px, 420px);
        }
        .role-doors__copy {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 48px 40px 180px;
        }
        .role-doors__panel {
          margin: 28px;
          padding: 28px 24px;
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          backdrop-filter: blur(16px);
          border-radius: 24px;
          border: 1px solid var(--line);
          align-self: center;
        }
        @media (max-width: 800px) {
          .role-doors { grid-template-columns: 1fr; }
          .role-doors__copy { min-height: 42vh; padding: 28px 20px 24px; }
          .role-doors__panel { margin: 0 16px 24px; }
        }
      `}</style>
    </div>
  );
}
