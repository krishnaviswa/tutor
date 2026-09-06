"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Rule = { id: string; name: string; trigger: string; action: string; enabled: boolean };

export function AutomationScreen() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function load() {
    api("/api/v1/automation-rules")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRows(
          list.map((row) => {
            const r = row as Rule;
            return {
              id: r.id,
              name: r.name,
              trigger: r.trigger,
              action: r.action,
              enabled: r.enabled,
            };
          }),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(r: Rule) {
    setBusy(r.id);
    setError("");
    try {
      await api(`/api/v1/automation-rules/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: r.enabled ? 0 : 1 }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <h2>Automation</h2>
      <span className="k">Rules fire after timeline writes · channels stay mock</span>
      <Err message={error} />
      {rows.length === 0 ? (
        <Empty>No rules in this workspace.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="list__i">
            <div className="gr">
              <div className="t">{r.name}</div>
              <div className="s">
                {r.trigger} → {r.action}
              </div>
            </div>
            <button className={`pill ${r.enabled ? "is-good" : ""}`} type="button" disabled={busy === r.id} onClick={() => void toggle(r)}>
              {r.enabled ? "on" : "off"}
            </button>
          </div>
        ))
      )}
    </>
  );
}
