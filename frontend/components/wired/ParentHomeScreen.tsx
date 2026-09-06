"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Av, Empty, Err } from "./bits";

type Home = {
  children: { student_id: string; display_name: string }[];
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
                  <div className="s">Linked in this workspace only</div>
                </div>
              </div>
              <span className="pill is-good">linked</span>
            </div>
          )}
        </div>
        <Link href={catalogRoute("timeline")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Activity</div>
          <div className="muted">Same timeline the teacher writes</div>
        </Link>
        <Link href={catalogRoute("reports")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Progress & marksheet</div>
          <div className="muted">Not a second gradebook</div>
        </Link>
        <Link href={catalogRoute("practice-result")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Test result</div>
          <div className="muted">Outcome only</div>
        </Link>
        <Link href={catalogRoute("payments")} className="hot hot--card">
          <div className="k" style={{ color: "var(--crimson)" }}>Fees & receipts</div>
        </Link>
        <Link href={catalogRoute("messages")} className="hot hot--card">
          <div className="k" style={{ color: "var(--tint)" }}>Message the teacher</div>
        </Link>
      </div>
    </>
  );
}
