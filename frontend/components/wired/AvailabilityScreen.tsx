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
  const [windows, setWindows] = useState<Record<string, Window | null>>({});
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
    const byDay: Record<string, Window | null> = {};
    for (const d of WEEKDAYS) byDay[d] = null;
    for (const w of data.windows || []) byDay[w.weekday] = { ...w, note: w.note ?? "" };
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

  function toggleDay(day: string) {
    setWindows((w) => ({
      ...w,
      [day]: w[day] ? null : { weekday: day, start: "18:30", end: "20:00", note: "" },
    }));
  }

  function setDay(day: string, patch: Partial<Window>) {
    setWindows((w) => (w[day] ? { ...w, [day]: { ...w[day]!, ...patch } } : w));
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
          windows: WEEKDAYS.map((d) => windows[d]).filter(Boolean),
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
          {WEEKDAYS.map((d) => {
            const w = windows[d];
            return (
              <div
                key={d}
                className="list__i"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 6, width: 70 }}>
                  <input
                    type="checkbox"
                    checked={!!w}
                    disabled={readOnly}
                    onChange={() => toggleDay(d)}
                  />
                  {d}
                </label>
                {w ? (
                  <>
                    <input
                      type="time"
                      value={w.start}
                      disabled={readOnly}
                      onChange={(e) => setDay(d, { start: e.target.value })}
                    />
                    <span className="muted">–</span>
                    <input
                      type="time"
                      value={w.end}
                      disabled={readOnly}
                      onChange={(e) => setDay(d, { end: e.target.value })}
                    />
                  </>
                ) : (
                  <span className="muted">unavailable</span>
                )}
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
                      { date: "", start: "00:00", end: "23:59", available: false, note: "" },
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
