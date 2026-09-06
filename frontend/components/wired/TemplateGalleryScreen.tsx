"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Tpl = { id: string; modules: string[] };

export function TemplateGalleryScreen() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api("/api/v1/templates")
      .then((data) => setRows(data as Tpl[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function apply(kind: string) {
    setBusy(kind);
    setError("");
    try {
      await api("/api/v1/workspaces/current/template", {
        method: "POST",
        body: JSON.stringify({ kind }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <h2>Template gallery</h2>
      <span className="k">Each = a toggle-set + starter taxonomy</span>
      <Err message={error} />
      <div className="grid g2">
        {rows.map((t) => (
          <div key={t.id} className="card">
            <div className="sb">
              <h3 style={{ margin: 0 }}>{t.id}</h3>
              <span className="pill">{t.modules.length} modules</span>
            </div>
            <button className="hot hot--btn ghost" type="button" disabled={busy === t.id} onClick={() => void apply(t.id)}>
              Apply
            </button>
          </div>
        ))}
      </div>
      <Link href={catalogRoute("branding")} className="hot hot--btn" style={{ marginTop: 8 }}>
        Branding
      </Link>
    </>
  );
}
