"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Av, Empty, Err, rupees } from "./bits";

type Child = {
  student_id: string;
  display_name: string;
  attendance?: { present: number; total: number };
  latest_practice?: { score: number; total: number; title: string } | null;
  latest_test?: { score: number; max: number; title: string } | null;
  fee_due?: { amount_cents: number; due_on: string; status: string } | null;
  activity_summary?: string;
};

type Home = {
  children: Child[];
  hub: string[];
};

export function ParentHomeScreen() {
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/parent/home")
      .then((row) => setData(row as Home))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const child = data?.children?.[0];
  const att = child?.attendance;
  const practice = child?.latest_practice;
  const test = child?.latest_test;
  const fee = child?.fee_due;

  return (
    <>
      <AppBar title="Family" extra={<span className="pill">guardian</span>} />
      <div className="appwrap">
        <Err message={error} />
        <div className="card">
          <div className="k">Your children</div>
          {!child ? (
            <Empty>No linked child. Accept a parent-link first.</Empty>
          ) : (
            <div className="list__i" style={{ border: 0, padding: "8px 0 0" }}>
              <div className="row" style={{ flexWrap: "nowrap", gap: 10 }}>
                <Av name={child.display_name} />
                <div className="gr">
                  <div className="t">{child.display_name}</div>
                  <div className="s">{child.activity_summary || "Linked in this workspace only"}</div>
                </div>
              </div>
              <span className="pill is-good">linked</span>
            </div>
          )}
        </div>
        {child ? (
          <div className="grid g3" style={{ marginBottom: 10 }}>
            <div className="stat">
              <div className="stat__v">{att ? `${att.present} / ${att.total}` : "—"}</div>
              <div className="stat__l">Attendance</div>
            </div>
            <div className="stat">
              <div className="stat__v">{practice ? `${practice.score} / ${practice.total}` : "—"}</div>
              <div className="stat__l">Latest practice</div>
              <div className="stat__d">
                <span className="muted">{practice?.title || ""}</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat__v">{test ? `${test.score} / ${test.max}` : "—"}</div>
              <div className="stat__l">Latest test</div>
              <div className="stat__d">
                <span className="muted">{test?.title || ""}</span>
              </div>
            </div>
          </div>
        ) : null}
        <Link href={catalogRoute("timeline")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Activity</div>
          <div style={{ fontWeight: 600, margin: "3px 0" }}>{child?.activity_summary || "Same timeline the teacher writes"}</div>
          <div className="muted">Tap for the full log</div>
        </Link>
        <Link href={catalogRoute("reports")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Progress & marksheet</div>
          <div style={{ fontWeight: 600, margin: "3px 0" }}>Term report</div>
          <div className="muted">Attendance, practice, mock, teacher note</div>
        </Link>
        <Link href={catalogRoute("practice-result")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Test result</div>
          <div style={{ fontWeight: 600, margin: "3px 0" }}>
            {practice ? `${practice.title} · ${practice.score} / ${practice.total}` : "Outcome only"}
          </div>
          <div className="muted">Same practice-result screen</div>
        </Link>
        <Link href={catalogRoute("payments")} className="hot hot--card">
          <div className="k" style={{ color: "var(--crimson)" }}>Fees & receipts</div>
          <div style={{ fontWeight: 600, margin: "3px 0" }}>
            {fee ? `${rupees(fee.amount_cents)} due ${fee.due_on}` : "No open invoice"}
          </div>
          <div className="muted">{fee?.status || "Pay, then history + receipts"}</div>
        </Link>
        <Link href={catalogRoute("messages")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Message the teacher</div>
          <div className="muted" style={{ marginTop: 3 }}>On the record · usually within a day</div>
        </Link>
      </div>
    </>
  );
}
