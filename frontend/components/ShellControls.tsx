"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";

type Notice = { id: string; body?: string };

export function ShellControls() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notice[]>([]);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const data = (await api("/api/v1/notifications/inbox")) as Notice[];
        if (!stop) setRows(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        if (!stop) setRows([]);
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
      <button
        type="button"
        className="theme-btn"
        aria-label={rows.length ? `${rows.length} notices` : "No new notices"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Notices{rows.length ? ` ${rows.length}` : ""}
      </button>
      {open ? (
        <div className="notice-pop" role="status">
          {rows.length === 0 ? (
            <p>No new notices.</p>
          ) : (
            rows.map((row) => <p key={row.id}>{row.body || "Notice"}</p>)
          )}
        </div>
      ) : null}
      <ThemeToggle />
    </div>
  );
}
