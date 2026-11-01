"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Ws = { name: string; branding?: { logo?: string; accent?: string; tagline?: string } };

const ACCENTS = ["#2E7D4F", "#2C6C88", "#6A4C93", "#A4384A", "#AF6C22", "#1f6f5c"];

function markOf(name: string): string {
  const letter = name.trim().slice(0, 1).toUpperCase();
  return letter || "T";
}

export function BrandingScreen() {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const loadSeq = useRef(0);

  function applyWorkspace(row: Ws) {
    setName(row.name || "");
    setTagline(row.branding?.tagline || "");
    setAccent(row.branding?.accent || ACCENTS[0]);
  }

  useEffect(() => {
    const seq = ++loadSeq.current;
    api("/api/v1/workspaces/current")
      .then((row) => {
        if (seq !== loadSeq.current) return;
        applyWorkspace(row as Ws);
      })
      .catch((e) => {
        if (seq === loadSeq.current) setError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setSaved("");
      setError("Enter the workspace name learners will see.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    const seq = ++loadSeq.current;
    try {
      const row = (await api("/api/v1/workspaces/current/branding", {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmed,
          tagline: tagline.trim(),
          accent,
          logo: markOf(trimmed),
        }),
      })) as Ws;
      if (seq !== loadSeq.current) return;
      applyWorkspace(row);
      setSaved("Saved. Sign-in shows this name and headline.");
    } catch (err) {
      if (seq === loadSeq.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (seq === loadSeq.current) setBusy(false);
    }
  }

  const mark = markOf(name);

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <form onSubmit={save}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: 14 }}>Make it yours</h2>
        <Err message={error} />
        {saved ? <p className="muted">{saved}</p> : null}
        <label className="field">
          <span>Workspace name</span>
          <input
            className="field__in"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved("");
            }}
          />
        </label>
        <label className="field">
          <span>Login-page headline</span>
          <input
            className="field__in"
            value={tagline}
            onChange={(e) => {
              setTagline(e.target.value);
              setSaved("");
            }}
          />
        </label>
        <div className="field">
          <span>Accent</span>
          <div className="palette" style={{ gridTemplateColumns: "repeat(6, 32px)" }}>
            {ACCENTS.map((c) => (
              <b
                key={c}
                className={c === accent ? "c" : undefined}
                style={{ background: c }}
                onClick={() => {
                  setAccent(c);
                  setSaved("");
                }}
              />
            ))}
          </div>
        </div>
        <button className="hot hot--btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <div style={{ marginTop: 12 }}>
          <Link href={catalogRoute("roster")} className="hot--link">
            Add students
          </Link>
        </div>
      </form>
      <div className="card">
        <div className="k" style={{ marginBottom: 10 }}>Live preview — student login</div>
        <div style={{ background: "var(--sunk)", borderRadius: 16, padding: 22, textAlign: "center" }}>
          <span className="av av--lg" style={{ background: accent, borderRadius: 16, margin: "0 auto" }}>
            {mark}
          </span>
          <div className="t" style={{ margin: "12px 0 4px" }}>{name.trim() || "Your workspace"}</div>
          <div className="muted">{tagline.trim() || "Your workspace, on the record."}</div>
        </div>
      </div>
    </div>
  );
}
