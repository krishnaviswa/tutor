"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { TEMPLATE_KINDS, templateName, type TemplateKind } from "@/lib/template-kinds";
import { Err, apiDetail } from "./bits";

type Ws = { id: string; name: string; slug: string; kind: string };

export function WsetupScreen() {
  const [ws, setWs] = useState<Ws | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState("exam-prep");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [created, setCreated] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const loadSeq = useRef(0);
  const dirty = useRef(false);

  function applyWorkspace(row: Ws) {
    setWs(row);
    setName(row.name || "");
    setSlug(row.slug || "");
    setKind(row.kind || "exam-prep");
  }

  useEffect(() => {
    const seq = ++loadSeq.current;
    api("/api/v1/workspaces/current")
      .then((row) => {
        if (seq !== loadSeq.current || dirty.current) return;
        applyWorkspace(row as Ws);
      })
      .catch((err) => {
        if (seq === loadSeq.current) setError(apiDetail(err));
      });
  }, []);

  function touch() {
    dirty.current = true;
    setSaved("");
    setCreated("");
  }

  const pending = saveBusy || createBusy;
  const kindOptions: TemplateKind[] = TEMPLATE_KINDS.some((item) => item.id === kind)
    ? TEMPLATE_KINDS
    : [...TEMPLATE_KINDS, { id: kind, name: templateName(kind), blurb: "" }];

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!ws || pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setSaved("");
      setCreated("");
      setError("Enter a workspace name.");
      return;
    }
    const nextSlug = slug.trim().toLowerCase();
    const body: Record<string, string> = {};
    if (trimmed !== ws.name) body.name = trimmed;
    if (nextSlug !== ws.slug.toLowerCase()) body.slug = slug.trim();
    if (kind !== ws.kind) body.kind = kind;
    if (Object.keys(body).length === 0) {
      setError("");
      setCreated("");
      setSaved(`Saved. ${ws.name} · ${ws.slug} · ${templateName(ws.kind)}.`);
      return;
    }
    if (!body.name) body.name = trimmed;
    setSaveBusy(true);
    setError("");
    setSaved("");
    setCreated("");
    const seq = ++loadSeq.current;
    try {
      const row = (await api("/api/v1/workspaces/current", {
        method: "PATCH",
        body: JSON.stringify(body),
      })) as Ws;
      if (seq !== loadSeq.current) return;
      dirty.current = false;
      applyWorkspace(row);
      setSaved(`Saved. ${row.name} · ${row.slug} · ${templateName(row.kind)}.`);
    } catch (err) {
      if (seq === loadSeq.current) setError(apiDetail(err));
    } finally {
      if (seq === loadSeq.current) setSaveBusy(false);
    }
  }

  async function create() {
    if (!ws || pending) return;
    const trimmed = name.trim();
    const nextSlug = slug.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter a workspace name.");
      return;
    }
    if (!nextSlug || nextSlug === ws.slug.toLowerCase()) {
      setCreated("");
      setError("Choose a different address. A new workspace needs its own, and this sign-in stays here.");
      return;
    }
    setCreateBusy(true);
    setError("");
    setSaved("");
    setCreated("");
    const seq = ++loadSeq.current;
    try {
      const row = (await api("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({ slug: slug.trim(), name: trimmed, kind }),
      })) as Ws;
      if (seq !== loadSeq.current) return;
      dirty.current = false;
      setName(ws.name);
      setSlug(ws.slug);
      setKind(ws.kind || "exam-prep");
      setCreated(
        `Created ${row.name} (${row.slug}). You are still signed in to ${ws.name}. This sign-in does not switch workspaces.`,
      );
    } catch (err) {
      if (seq === loadSeq.current) setError(apiDetail(err));
    } finally {
      if (seq === loadSeq.current) setCreateBusy(false);
    }
  }

  return (
    <>
      <h2 style={{ fontSize: "1.4rem", marginBottom: 4 }}>Create your workspace</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Name it and choose a setup. You can change both later.
      </p>
      <Err message={error} />
      {saved ? (
        <p className="muted" role="status">
          {saved}
        </p>
      ) : null}
      {created ? (
        <p className="muted" role="status">
          {created}
        </p>
      ) : null}
      {!ws && !error ? <p className="muted">Loading workspace…</p> : null}
      {ws ? (
        <form onSubmit={(e) => void save(e)}>
          <label className="field">
            <span>Program name</span>
            <input
              className="field__in"
              value={name}
              disabled={pending}
              onChange={(e) => {
                setName(e.target.value);
                touch();
              }}
            />
          </label>
          <label className="field">
            <span>Workspace address</span>
            <input
              className="field__in"
              value={slug}
              disabled={pending}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setSlug(e.target.value);
                touch();
              }}
            />
            <em>Letters, numbers, and hyphens. It has to be unique.</em>
          </label>
          <label className="field">
            <span>Tutoring setup</span>
            <select
              className="field__in"
              value={kind}
              disabled={pending}
              onChange={(e) => {
                setKind(e.target.value);
                touch();
              }}
            >
              {kindOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <em>Saving a different setup replaces which tools are on.</em>
          </label>
          <div className="row">
            <button className="hot hot--btn" type="submit" disabled={pending}>
              {saveBusy ? "Saving…" : "Save"}
            </button>
            <button className="btn btn--sm" type="button" disabled={pending} onClick={() => void create()}>
              {createBusy ? "Creating…" : "Create another workspace"}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Create another uses this name and address for a separate workspace. You stay signed in here.
          </p>
        </form>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <Link href={catalogRoute("onboard-kind")} className="hot hot--btn">
          Continue — choose a template
        </Link>
      </div>
    </>
  );
}
