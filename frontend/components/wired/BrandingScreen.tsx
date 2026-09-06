"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Ws = { name: string; branding?: { logo?: string; accent?: string; tagline?: string } };

const ACCENTS = ["#2E7D4F", "#2C6C88", "#6A4C93", "#A4384A", "#AF6C22", "#1f6f5c"];

export function BrandingScreen() {
  const [ws, setWs] = useState<Ws | null>(null);
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/workspaces/current")
      .then((row) => {
        const w = row as Ws;
        setWs(w);
        setTagline(w.branding?.tagline || "");
        setAccent(w.branding?.accent || ACCENTS[0]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/workspaces/current/branding", {
        method: "PATCH",
        body: JSON.stringify({ tagline, accent, logo: "T" }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <form onSubmit={save}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: 14 }}>Make it yours</h2>
        <Err message={error} />
        <label className="field">
          <span>Login-page headline</span>
          <input className="field__in" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </label>
        <div className="field">
          <span>Accent</span>
          <div className="palette" style={{ gridTemplateColumns: "repeat(6, 32px)" }}>
            {ACCENTS.map((c) => (
              <b
                key={c}
                className={c === accent ? "c" : undefined}
                style={{ background: c }}
                onClick={() => setAccent(c)}
              />
            ))}
          </div>
        </div>
        <button className="hot hot--btn" type="submit" disabled={busy}>
          Save
        </button>
        <div style={{ marginTop: 12 }}>
          <Link href={catalogRoute("roster")} className="hot--link">
            Add students
          </Link>
        </div>
      </form>
      <div className="card">
        <div className="k" style={{ marginBottom: 10 }}>Live preview — student login</div>
        <div style={{ background: "var(--accent-wash)", borderRadius: 14, padding: 22, textAlign: "center" }}>
          <span className="av av--lg" style={{ background: accent, borderRadius: 12, margin: "0 auto" }}>
            T
          </span>
          <div style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", margin: "12px 0 4px" }}>{ws?.name}</div>
          <div className="muted">{tagline || "Your workspace, on the record."}</div>
        </div>
      </div>
    </div>
  );
}
