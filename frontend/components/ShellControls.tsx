"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { MarkdownView } from "@/components/MarkdownView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";

type Notice = { id: string; body?: string };

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ShellControls() {
  const [open, setOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [rows, setRows] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const closeTerms = useCallback(() => setTermsOpen(false), []);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const data = (await api("/api/v1/notifications/inbox")) as Notice[];
        if (stop) return;
        const list = Array.isArray(data) ? data : [];
        setCount(list.length);
        setRows(list.slice(0, 8));
      } catch {
        if (!stop) {
          setCount(0);
          setRows([]);
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="shell-controls">
      <ThemeToggle />
      <span className="shell-bell">
        <button
          type="button"
          className="theme-btn shell-icon-btn"
          aria-label={count > 0 ? `${count} unread` : "No unread"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <BellIcon />
          {count > 0 ? (
            <span className="notice-badge" aria-hidden="true">
              {count}
            </span>
          ) : null}
        </button>
        {open ? (
          <div className="notice-pop" role="status">
            {rows.length === 0 ? <p>Nothing unread.</p> : rows.map((row) => <p key={row.id}>{row.body || "Update"}</p>)}
          </div>
        ) : null}
      </span>
      <button type="button" className="theme-btn" onClick={() => setTermsOpen(true)}>
        Terms
      </button>
      {termsOpen ? <TermsDialog onClose={closeTerms} /> : null}
    </div>
  );
}

function TermsDialog({ onClose }: { onClose: () => void }) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stop = false;
    let seq = 0;

    async function load(initial: boolean) {
      const mine = ++seq;
      if (initial) {
        setMarkdown("");
        setError("");
      }
      setLoading(true);
      try {
        const data = (await api("/api/v1/terms", { cache: "no-store" })) as { markdown?: string };
        if (stop || mine !== seq) return;
        setMarkdown(typeof data.markdown === "string" ? data.markdown : "");
        setError("");
      } catch (err) {
        if (stop || mine !== seq) return;
        const message = err instanceof Error ? err.message : "";
        setError(message.includes("404") ? "The terms file is not on disk." : "Could not load terms.");
        if (initial) setMarkdown("");
      } finally {
        if (!stop && mine === seq) setLoading(false);
      }
    }

    void load(true);

    function onFocus() {
      void load(false);
    }

    window.addEventListener("focus", onFocus);
    return () => {
      stop = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Dialog title="Terms and conditions" onClose={onClose}>
      {error ? <p className="terms-err">{error}</p> : null}
      {markdown ? <MarkdownView source={markdown} /> : null}
      {loading && !markdown && !error ? <p className="muted">Loading…</p> : null}
    </Dialog>
  );
}
