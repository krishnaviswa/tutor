"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Err } from "./bits";

type Prefs = Record<string, Record<string, boolean>>;

export function NotifPrefsScreen() {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [error, setError] = useState("");
  const [role, setRole] = useState("student");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/notifications/prefs")
      .then((row) => setPrefs(row as Prefs))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "student"))
      .catch(() => undefined);
    load();
  }, []);

  async function save(next: Prefs) {
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/notifications/prefs", {
        method: "PUT",
        body: JSON.stringify({ prefs: next }),
      })) as Prefs;
      setPrefs(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const keys = Object.keys(prefs);

  return (
    <>
      <AppBar title="Notifications" />
      <div className="appwrap">
        <Err message={error} />
        {keys.map((who) => (
          <div key={who} className="card">
            <div className="k">{who}</div>
            {Object.entries(prefs[who] || {}).map(([ch, on]) => (
              <div key={ch} className="list__i">
                <div className="gr">
                  <div className="t">{ch}</div>
                  <div className="s">{who === "student" && ch === "whatsapp" ? "owner-gated default off" : "channel"}</div>
                </div>
                <button
                  type="button"
                  className={`pill ${on ? "is-good" : ""}`}
                  disabled={busy || (role !== "owner" && who === "student" && ch === "whatsapp")}
                  onClick={() =>
                    void save({
                      ...prefs,
                      [who]: { ...prefs[who], [ch]: !on },
                    })
                  }
                >
                  {on ? "on" : "off"}
                </button>
              </div>
            ))}
          </div>
        ))}
        <div className="card card--wash">
          <p className="muted">Timeline remains the ledger. Student WhatsApp stays off unless the owner enabled it.</p>
        </div>
      </div>
    </>
  );
}
