"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Console = {
  workspace?: { name: string; slug: string } | null;
  usage: { meter_key: string; used: number; cap: number; warn: boolean; block: boolean }[];
};

export function OwnerScreen() {
  const [data, setData] = useState<Console | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/v1/owner/console"), api("/api/v1/usage")])
      .then(([consoleRow, usageRow]) => {
        const c = consoleRow as Console;
        const meters = (usageRow as { meters?: Console["usage"] }).meters;
        setData({ ...c, usage: meters ?? c.usage });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <h2>{data?.workspace?.name || "Owner console"}</h2>
      <span className="k">Operating scorecard · same event log</span>
      <Err message={error} />
      {!data ? (
        <Empty>Loading…</Empty>
      ) : (
        <div className="grid g3" style={{ marginBottom: 14 }}>
          {data.usage.map((m) => (
            <div key={m.meter_key} className="stat">
              <div className="stat__v">
                {m.used}
                <span style={{ fontSize: ".9rem", color: "var(--ink-faint)" }}>/{m.cap}</span>
              </div>
              <div className="stat__l">{m.meter_key}</div>
              <div className="stat__d">
                {m.block ? <span className="pill is-bad">block</span> : m.warn ? <span className="pill is-warn">80%</span> : <span className="pill is-good">ok</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <Link href={catalogRoute("subscription")} className="hot hot--btn ghost">
          Plan & usage
        </Link>
        <Link href={catalogRoute("payouts")} className="btn btn--sm">
          Payouts
        </Link>
      </div>
    </>
  );
}
