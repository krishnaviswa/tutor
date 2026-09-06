"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Row = { name: string; connected: boolean; provider: string };

export function IntegrationsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function load() {
    api("/api/v1/integrations")
      .then((data) => setRows(data as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function connect(name: string) {
    setBusy(name);
    setError("");
    try {
      await api(`/api/v1/integrations/${name}/connect`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <h2>Integrations</h2>
      <span className="k">Mock OAuth · no live Google/Meta</span>
      <Err message={error} />
      {rows.length === 0 ? (
        <Empty>No ports listed.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.name} className="list__i">
            <div className="gr">
              <div className="t">{r.name}</div>
              <div className="s">{r.provider}</div>
            </div>
            {r.connected ? (
              <span className="pill is-good">connected</span>
            ) : (
              <button className="btn btn--sm" type="button" disabled={busy === r.name} onClick={() => void connect(r.name)}>
                Connect mock
              </button>
            )}
          </div>
        ))
      )}
    </>
  );
}
