"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Ws = { id: string; name: string; slug: string; kind: string };

export function WsetupScreen() {
  const [ws, setWs] = useState<Ws | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/workspaces/current")
      .then((row) => {
        const w = row as Ws;
        setWs(w);
        setName(w.name);
        setSlug(w.slug);
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
      await api("/api/v1/workspaces/current", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({ slug, name, kind: "exam-prep" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 style={{ fontSize: "1.4rem", marginBottom: 4 }}>Create your workspace</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Always-on core stays on. This JWT still binds one workspace_id.
      </p>
      <Err message={error} />
      <form onSubmit={save}>
        <label className="field">
          <span>Program name</span>
          <input className="field__in" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Workspace slug</span>
          <input className="field__in" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <em>Current {ws?.id}</em>
        </label>
        <div className="row">
          <button className="hot hot--btn" type="submit" disabled={busy}>
            Save name
          </button>
          <button className="btn btn--sm" type="button" disabled={busy} onClick={() => void create()}>
            Create another (slug)
          </button>
        </div>
      </form>
      <div style={{ marginTop: 16 }}>
        <Link href={catalogRoute("onboard-kind")} className="hot hot--btn">
          Continue — choose a template
        </Link>
      </div>
    </>
  );
}
