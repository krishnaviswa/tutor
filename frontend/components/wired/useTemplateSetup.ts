"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cardsFromApi, type TemplateCard } from "@/lib/template-kinds";
import { apiDetail } from "./bits";

type ApiTemplate = { id: string; modules: string[] };
type WorkspaceKind = { kind?: string };

export function useTemplateSetup() {
  const [rows, setRows] = useState<ApiTemplate[]>([]);
  const [currentKind, setCurrentKind] = useState("");
  const [sel, setSel] = useState("exam-prep");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState("");
  const [busy, setBusy] = useState(false);
  const [kindLoaded, setKindLoaded] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const wsSeq = useRef(0);
  const picked = useRef(false);

  useEffect(() => {
    const seq = ++wsSeq.current;
    let alive = true;
    api("/api/v1/workspaces/current")
      .then((row) => {
        if (!alive || seq !== wsSeq.current) return;
        const kind = ((row as WorkspaceKind).kind || "").trim();
        setCurrentKind(kind);
        if (!picked.current && kind) setSel(kind);
      })
      .catch((err) => {
        if (alive && seq === wsSeq.current) setError(apiDetail(err));
      })
      .finally(() => {
        if (alive) setKindLoaded(true);
      });
    api("/api/v1/templates")
      .then((data) => {
        if (!alive) return;
        setRows(data as ApiTemplate[]);
      })
      .catch((err) => {
        if (alive) setError(apiDetail(err));
      })
      .finally(() => {
        if (alive) setTemplatesLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  function choose(id: string) {
    picked.current = true;
    setSel(id);
    setApplied("");
    setError("");
  }

  async function apply() {
    if (!sel || busy) return;
    setBusy(true);
    setError("");
    setApplied("");
    picked.current = true;
    const seq = ++wsSeq.current;
    try {
      const row = (await api("/api/v1/workspaces/current/template", {
        method: "POST",
        body: JSON.stringify({ kind: sel }),
      })) as { kind?: string };
      if (seq !== wsSeq.current) return;
      const kind = (row.kind || sel).trim();
      setCurrentKind(kind);
      setSel(kind);
      setApplied(kind);
      setKindLoaded(true);
    } catch (err) {
      if (seq === wsSeq.current) setError(apiDetail(err));
    } finally {
      if (seq === wsSeq.current) setBusy(false);
    }
  }

  const cards: TemplateCard[] = cardsFromApi(rows);

  return {
    cards,
    currentKind,
    sel,
    choose,
    apply,
    error,
    applied,
    busy,
    kindLoaded,
    templatesLoaded,
  };
}
