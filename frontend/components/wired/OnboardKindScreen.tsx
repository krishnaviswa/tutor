"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Tpl = { id: string; modules: string[] };

export function OnboardKindScreen() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [sel, setSel] = useState("exam-prep");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/templates")
      .then((data) => setRows(data as Tpl[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function apply() {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/workspaces/current/template", {
        method: "POST",
        body: JSON.stringify({ kind: sel }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 style={{ fontSize: "1.4rem", marginBottom: 4 }}>What kind of tutoring do you run?</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Arrangements of seven jobs — not a syllabus SKU.
      </p>
      <Err message={error} />
      <div className="grid g2">
        {rows.map((t) => (
          <button
            key={t.id}
            type="button"
            className={sel === t.id ? "card card--wash" : "card"}
            style={{ textAlign: "left", border: sel === t.id ? "1.5px solid var(--tint)" : undefined }}
            onClick={() => setSel(t.id)}
          >
            <h3 style={{ margin: 0 }}>{t.id}</h3>
            <p className="muted" style={{ marginTop: 6 }}>{t.modules.length} modules</p>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void apply()}>
          Apply template
        </button>
        <Link href={catalogRoute("branding")} className="btn btn--sm">
          Branding
        </Link>
      </div>
    </>
  );
}
