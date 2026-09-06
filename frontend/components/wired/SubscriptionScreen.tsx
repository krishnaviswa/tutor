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

  function load() {
    api("/api/v1/billing/subscription")
      .then((row) => setData(row as Sub))
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
          </div>
        ))
      )}
      <button className="hot hot--btn" type="button" onClick={() => void pause()}>
        {paused ? "Resume WhatsApp" : "Pause WhatsApp"}
      </button>
    </>
  );
}
