"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Err } from "@/components/wired/bits";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Me = { id: string; role: string };
type Staff = { id: string; display_name: string; role: string };
type Window = { weekday: string; start: string; end: string; note: string };
type Block = { date: string; start: string; end: string; available: boolean; note: string };

const btn = { width: "auto", margin: 0, cursor: "pointer" } as const;

export function AvailabilityScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [target, setTarget] = useState("");
  const [windows, setWindows] = useState<Record<string, Window[]>>({});
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const canEditOthers = me?.role === "owner";
  const readOnly = !!me && !canEditOthers && target !== "" && target !== me.id;

  const loadAvailability = useCallback(async (teacherId: string) => {
    const data = (await api(
      `/api/v1/availability?teacher_id=${encodeURIComponent(teacherId)}`,
    )) as { windows: Window[]; blocks: Block[] };
    const byDay: Record<string, Window[]> = {};
    for (const d of WEEKDAYS) byDay[d] = [];
    for (const w of data.windows || []) {
      if (!byDay[w.weekday]) byDay[w.weekday] = [];
      byDay[w.weekday].push({ ...w, note: w.note ?? "" });
    }
    setWindows(byDay);
    setBlocks((data.blocks || []).map((b) => ({ ...b, note: b.note ?? "" })));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/v1/auth/me") as Promise<Me>,
          api("/api/v1/staff").catch(() => []) as Promise<Staff[]>,
        ]);
        setMe(m);
        setStaff(Array.isArray(s) ? s : []);
        setTarget(m.id);
        await loadAvailability(m.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [loadAvailability]);

  async function pick(id: string) {
    setTarget(id);
    setMsg("");
    try {
      await loadAvailability(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function addWindow(day: string) {
    setWindows((w) => ({
      ...w,
      [day]: [...(w[day] || []), { weekday: day, start: "10:00", end: "10:30", note: "" }],
    }));
  }

  function setWindow(day: string, index: number, patch: Partial<Window>) {
    setWindows((w) => ({
      ...w,
      [day]: (w[day] || []).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeWindow(day: string, index: number) {
    setWindows((w) => ({
      ...w,
      [day]: (w[day] || []).filter((_, i) => i !== index),
    }));
  }

  async function save() {
    if (!target) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await api(`/api/v1/staff/${encodeURIComponent(target)}/availability`, {
        method: "PUT",
        body: JSON.stringify({
          windows: WEEKDAYS.flatMap((d) => windows[d] || []),
          blocks: blocks.filter((b) => b.date),
        }),
      });
      setMsg("Saved.");
      await loadAvailability(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Availability</h2>
      <span className="k">
        Staff see their own · owner sees and edits everyone
      </span>

      <div className="row" style={{ margin: "12px 0", gap: 8, alignItems: "center" }}>
        <label className="field" style={{ margin: 0, minWidth: 220 }}>
          <span>Staff member</span>
          <select
            value={target}
            onChange={(e) => void pick(e.target.value)}
            disabled={!canEditOthers}
          >
            {(canEditOthers ? staff : staff.filter((s) => s.id === me?.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name} · {s.role}
              </option>
            ))}
            {staff.length === 0 && me && <option value={me.id}>You</option>}
          </select>
        </label>
        {!readOnly && (
          <button
            type="button"
            className="hot hot--btn"
            style={btn}
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save availability"}
          </button>
        )}
        {msg && <span className="muted">{msg}</span>}
      </div>

      <Err message={error} />

      <div className="grid g2" style={{ alignItems: "start", gap: 16 }}>
        <div className="card">
          <h3>Weekly windows</h3>
          <p className="muted">15-minute grid. A day can hold more than one window.</p>
          {WEEKDAYS.map((d) => {
            const rows = windows[d] || [];
            return (
              <div key={d} className="list__i" style={{ padding: "6px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ width: 40 }}>{d}</strong>
                  {rows.length === 0 ? <span className="muted">no windows</span> : null}
                  {!readOnly && (
                    <button type="button" className="btn btn--sm" style={btn} onClick={() => addWindow(d)}>
                      Add
                    </button>
                  )}
                </div>
                {rows.map((w, index) => (
                  <div key={`${d}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <input
                      type="time"
                      step={900}
                      value={w.start}
                      disabled={readOnly}
                      onChange={(e) => setWindow(d, index, { start: e.target.value })}
                    />
                    <span className="muted">–</span>
                    <input
                      type="time"
                      step={900}
                      value={w.end}
                      disabled={readOnly}
                      onChange={(e) => setWindow(d, index, { end: e.target.value })}
                    />
                    {!readOnly && (
                      <button type="button" className="btn btn--sm" style={btn} onClick={() => removeWindow(d, index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div>
          <div className="card">
            <h3>Date exceptions</h3>
            {blocks.length === 0 && <p className="muted">No exceptions.</p>}
            {blocks.map((b, i) => (
              <div
                key={i}
                className="list__i"
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "6px 0" }}
              >
                <input
                  type="date"
                  value={b.date}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBlocks((bs) => bs.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))
                  }
                />
                <select
                  value={b.available ? "extra" : "off"}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBlocks((bs) =>
                      bs.map((x, j) => (j === i ? { ...x, available: e.target.value === "extra" } : x)),
                    )
                  }
                >
                  <option value="off">Time off</option>
                  <option value="extra">Extra slot</option>
                </select>
                <input
                  type="time"
                  value={b.start}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBlocks((bs) => bs.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                  }
                />
                <span className="muted">–</span>
                <input
                  type="time"
                  value={b.end}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBlocks((bs) => bs.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                  }
                />
                {!readOnly && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={btn}
                    onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={btn}
                  onClick={() =>
                    setBlocks((bs) => [
                      ...bs,
                      { date: "", start: "00:00", end: "23:45", available: false, note: "" },
                    ])
                  }
                >
                  + Add exception
                </button>
              </div>
            )}
          </div>
          <div className="card card--wash">
            <div className="k" style={{ marginBottom: 4 }}>On the calendar</div>
            <p className="muted">
              The schedule week grid can shade hours outside these windows so sessions land in open
              time. 1-on-1 bookings are checked against this availability.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
