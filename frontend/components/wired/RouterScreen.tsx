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
  const staffLabel = hideStaff ? "I’m a teacher / staff" : "I’m a teacher / staff";
  const staffHint = hideStaff
    ? "Faculty console — exam-prep signs in on the destination, not staff-login"
    : "Staff sign-in with OTP";

  return (
    <div
      className="tint-accent"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "34px 24px",
        textAlign: "center",
        background: "var(--accent-wash)",
      }}
    >
      <span className="av av--lg" style={{ background: "var(--accent)", borderRadius: 14, width: 52, height: 52, fontSize: "1rem" }}>
        T
      </span>
      <h2 style={{ fontSize: "1.3rem", margin: "16px 0 4px" }}>{wsName}</h2>
      <p className="muted" style={{ marginBottom: 26 }}>
        One URL · three doors · one timeline
      </p>
      <div style={{ width: "100%", maxWidth: 280, textAlign: "left" }}>
        <Link href={catalogRoute("student-login")} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>I’m here to learn</div>
          <div className="muted">Student sign-in</div>
        </Link>
        <Link href={staffHref} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>{staffLabel}</div>
          <div className="muted">{staffHint}</div>
        </Link>
        <Link href={catalogRoute("parent-link")} className="hot hot--card">
          <div style={{ fontWeight: 600 }}>I’m a parent</div>
          <div className="muted">Follow my child</div>
        </Link>
      </div>
      {!hideStaff ? null : (
        <p className="muted" style={{ marginTop: 16, fontSize: ".72rem" }}>
          Other templates: <Link href={catalogRoute("staff-login")}>staff-login</Link>
        </p>
      )}
      <p className="muted" style={{ marginTop: 24, fontFamily: "var(--mono)", fontSize: ".68rem" }}>
        Powered by TutorOS · mock OTP 000000
      </p>
    </div>
  );
}
