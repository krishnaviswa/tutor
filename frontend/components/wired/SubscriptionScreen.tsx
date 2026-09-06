"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Sub = {
  meters: { meter_key: string; used: number; cap: number; warn: boolean; block: boolean }[];
};

export function SubscriptionScreen() {
  const [data, setData] = useState<Sub | null>(null);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState("");

  function load() {
    api("/api/v1/billing/subscription")
      .then((row) => {
        const sub = row as Sub;
        setData(sub);
        const next: Record<string, number> = {};
        for (const m of sub.meters) next[m.meter_key] = m.cap;
        setDraft(next);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function pause() {
    setError("");
    try {
      await api("/api/v1/billing/whatsapp-pause", {
        method: "POST",
        body: JSON.stringify({ paused: !paused }),
      });
      setPaused(!paused);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveCap(meterKey: string) {
    setSaving(meterKey);
    setError("");
    try {
      await api("/api/v1/billing/quotas", {
        method: "PATCH",
        body: JSON.stringify({ meter_key: meterKey, cap: draft[meterKey] }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving("");
    }
  }

  return (
    <>
      <h2>Subscription & quotas</h2>
      <span className="k">Caps throttle paid sends · always-on core stays on</span>
      <Err message={error} />
      {!data ? (
        <Empty>Loading…</Empty>
      ) : (
        data.meters.map((m) => (
          <div key={m.meter_key} className="card">
            <div className="sb">
              <div className="t">{m.meter_key}</div>
              <span className={`pill ${m.block ? "is-bad" : m.warn ? "is-warn" : "is-good"}`}>
                {m.used}/{m.cap}
              </span>
            </div>
            <label className="field" style={{ marginTop: 8 }}>
              <span>Cap</span>
              <input
                className="field__in"
                type="number"
                min={0}
                value={draft[m.meter_key] ?? m.cap}
                onChange={(e) => setDraft((d) => ({ ...d, [m.meter_key]: Number(e.target.value) }))}
              />
            </label>
            <button
              className="btn btn--sm"
              type="button"
              disabled={saving === m.meter_key}
              onClick={() => void saveCap(m.meter_key)}
            >
              {saving === m.meter_key ? "Saving…" : "Save cap"}
            </button>
          </div>
        ))
      )}
      <button className="hot hot--btn" type="button" onClick={() => void pause()}>
        {paused ? "Resume WhatsApp" : "Pause WhatsApp"}
      </button>
    </>
  );
}
