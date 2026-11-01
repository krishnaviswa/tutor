"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Err } from "@/components/wired/bits";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_SET = new Set<string>(WEEKDAYS);
const PX_PER_MIN = 56 / 60;
const SNAP = 15;
const MIN_MINUTES = 15;
const NEW_MINUTES = 60;
const DAY_START = 8 * 60;
const DAY_END = 21 * 60;
const DAY_MAX = 23 * 60 + 45;

type Me = { id: string; role: string };
type Staff = { id: string; display_name: string; role: string };
type Window = { key: string; weekday: string; start: string; end: string; note: string };
type Block = {
  key: string;
  date: string;
  start: string;
  end: string;
  available: boolean;
  note: string;
};
type Mode = "week" | "date";
type Edge = "move" | "start" | "end";

type Drag = {
  pointerId: number;
  key: string;
  edge: Edge;
  originY: number;
  originStart: number;
  originEnd: number;
  originDay: string;
};

const btn = { width: "auto", margin: 0, cursor: "pointer" } as const;

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `k${keySeq}`;
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function toHHMM(mins: number) {
  const clamped = Math.max(0, Math.min(DAY_MAX, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && otherStart < end;
}

function isoToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function labelDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function snapDelta(dy: number) {
  return Math.round(dy / PX_PER_MIN / SNAP) * SNAP;
}

function columnDay(clientX: number, clientY: number) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (el instanceof HTMLElement && el.dataset.day) return el.dataset.day;
  }
  return null;
}

export function AvailabilityScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [target, setTarget] = useState("");
  const [windows, setWindows] = useState<Record<string, Window[]>>({});
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [mode, setMode] = useState<Mode>("week");
  const [onDate, setOnDate] = useState("");
  const [paint, setPaint] = useState<"off" | "extra">("off");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const dragRef = useRef<Drag | null>(null);
  const gridStartRef = useRef(DAY_START);
  const pendingRef = useRef<{ pointerId: number; x: number; y: number; start: number; day: string } | null>(
    null,
  );
  const dataRef = useRef({ mode, onDate, paint });
  dataRef.current = { mode, onDate, paint };

  const canEditOthers = me?.role === "owner";
  const readOnly = !!me && !canEditOthers && target !== "" && target !== me.id;

  const loadAvailability = useCallback(async (teacherId: string) => {
    const data = (await api(
      `/api/v1/availability?teacher_id=${encodeURIComponent(teacherId)}`,
    )) as { windows: Omit<Window, "key">[]; blocks: Omit<Block, "key">[] };
    const byDay: Record<string, Window[]> = {};
    for (const d of WEEKDAYS) byDay[d] = [];
    for (const w of data.windows || []) {
      const day = WEEKDAY_SET.has(w.weekday) ? w.weekday : "";
      if (!day) continue;
      byDay[day].push({ key: newKey(), weekday: day, start: w.start, end: w.end, note: w.note ?? "" });
    }
    setWindows(byDay);
    setBlocks(
      (data.blocks || []).map((b) => ({
        key: newKey(),
        date: b.date,
        start: b.start,
        end: b.end,
        available: Boolean(b.available),
        note: b.note ?? "",
      })),
    );
    setSelected(null);
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

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const delta = snapDelta(e.clientY - drag.originY);
      const dur = drag.originEnd - drag.originStart;
      if (dataRef.current.mode === "week") {
        const day = drag.edge === "move" ? columnDay(e.clientX, e.clientY) || drag.originDay : drag.originDay;
        if (drag.edge === "move") {
          let start = drag.originStart + delta;
          let end = drag.originEnd + delta;
          if (start < 0) {
            start = 0;
            end = dur;
          }
          if (end > DAY_MAX) {
            end = DAY_MAX;
            start = end - dur;
          }
          if (start < 0 || end - start < MIN_MINUTES) return;
          placeWindow(drag.key, day, start, end);
        } else if (drag.edge === "start") {
          const start = drag.originStart + delta;
          if (start < 0 || drag.originEnd - start < MIN_MINUTES) return;
          placeWindow(drag.key, drag.originDay, start, drag.originEnd);
        } else {
          const end = drag.originEnd + delta;
          if (end > DAY_MAX || end - drag.originStart < MIN_MINUTES) return;
          placeWindow(drag.key, drag.originDay, drag.originStart, end);
        }
      } else if (drag.edge === "move") {
        let start = drag.originStart + delta;
        let end = drag.originEnd + delta;
        if (start < 0) {
          start = 0;
          end = dur;
        }
        if (end > DAY_MAX) {
          end = DAY_MAX;
          start = end - dur;
        }
        if (start < 0 || end - start < MIN_MINUTES) return;
        placeBlock(drag.key, start, end);
      } else if (drag.edge === "start") {
        const start = drag.originStart + delta;
        if (start < 0 || drag.originEnd - start < MIN_MINUTES) return;
        placeBlock(drag.key, start, drag.originEnd);
      } else {
        const end = drag.originEnd + delta;
        if (end > DAY_MAX || end - drag.originStart < MIN_MINUTES) return;
        placeBlock(drag.key, drag.originStart, end);
      }
    }
    function onUp(e: PointerEvent) {
      if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function placeWindow(key: string, day: string, startMin: number, endMin: number) {
    const targetDay = WEEKDAY_SET.has(day) ? day : "";
    const start = toHHMM(startMin);
    const end = toHHMM(endMin);
    setWindows((prev) => {
      let item: Window | null = null;
      let from = "";
      for (const d of WEEKDAYS) {
        const hit = (prev[d] || []).find((row) => row.key === key);
        if (hit) {
          item = hit;
          from = d;
          break;
        }
      }
      if (!item || !from) return prev;
      const dest = targetDay || from;
      const others = (prev[dest] || []).filter((row) => row.key !== key);
      if (others.some((row) => overlaps(start, end, row.start, row.end))) return prev;
      const next = { ...prev };
      next[from] = (next[from] || []).filter((row) => row.key !== key);
      next[dest] = [...(next[dest] || []).filter((row) => row.key !== key), { ...item, weekday: dest, start, end }];
      return next;
    });
  }

  function placeBlock(key: string, startMin: number, endMin: number) {
    const start = toHHMM(startMin);
    const end = toHHMM(endMin);
    setBlocks((prev) => {
      const item = prev.find((row) => row.key === key);
      if (!item) return prev;
      const others = prev.filter((row) => row.key !== key && row.date === item.date);
      if (others.some((row) => overlaps(start, end, row.start, row.end))) return prev;
      return prev.map((row) => (row.key === key ? { ...row, start, end } : row));
    });
  }

  async function pick(id: string) {
    setTarget(id);
    setMsg("");
    setSelected(null);
    try {
      await loadAvailability(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function showDateMode() {
    setMode("date");
    setSelected(null);
    setOnDate((current) => {
      if (current) return current;
      const dates = blocks.map((row) => row.date).filter(Boolean).sort();
      return dates[0] || isoToday();
    });
  }

  function beginDrag(e: React.PointerEvent, key: string, day: string, start: string, end: string, edge: Edge) {
    if (readOnly || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(key);
    setMsg("");
    dragRef.current = {
      pointerId: e.pointerId,
      key,
      edge,
      originY: e.clientY,
      originStart: toMin(start),
      originEnd: toMin(end),
      originDay: day,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function createAt(day: string, startMin: number) {
    const endMin = startMin + NEW_MINUTES;
    if (startMin < 0 || endMin > DAY_MAX) {
      setError("A new block is 60 minutes and has to finish by 23:45.");
      return;
    }
    const start = toHHMM(startMin);
    const end = toHHMM(endMin);
    const key = newKey();
    if (mode === "week") {
      const others = windows[day] || [];
      if (others.some((row) => overlaps(start, end, row.start, row.end))) {
        setError("That hour overlaps another block.");
        return;
      }
      setWindows((prev) => ({
        ...prev,
        [day]: [...(prev[day] || []), { key, weekday: day, start, end, note: "" }],
      }));
    } else {
      if (!onDate) return;
      const others = blocks.filter((row) => row.date === onDate);
      if (others.some((row) => overlaps(start, end, row.start, row.end))) {
        setError("That hour overlaps another block.");
        return;
      }
      setBlocks((prev) => [
        ...prev,
        { key, date: onDate, start, end, available: paint === "extra", note: "" },
      ]);
    }
    setSelected(key);
    setError("");
    setMsg("");
  }

  function onColumnDown(e: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".avail-block")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = gridStartRef.current + (e.clientY - rect.top) / PX_PER_MIN;
    const start = Math.floor(mins / SNAP) * SNAP;
    pendingRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start,
      day: e.currentTarget.dataset.day || "",
    };
  }

  function onColumnUp(e: React.PointerEvent<HTMLDivElement>) {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== e.pointerId) return;
    pendingRef.current = null;
    if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 5) return;
    createAt(pending.day, pending.start);
  }

  function removeSelected() {
    if (!selected || readOnly) return;
    if (mode === "week") {
      setWindows((prev) => {
        const next = { ...prev };
        for (const day of WEEKDAYS) next[day] = (next[day] || []).filter((row) => row.key !== selected);
        return next;
      });
    } else {
      setBlocks((prev) => prev.filter((row) => row.key !== selected));
    }
    setSelected(null);
    setMsg("");
  }

  function setSelectedAvailable(available: boolean) {
    if (!selected || readOnly || mode !== "date") return;
    setBlocks((prev) => prev.map((row) => (row.key === selected ? { ...row, available } : row)));
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
          windows: WEEKDAYS.flatMap((day) =>
            (windows[day] || []).map((row) => ({
              weekday: row.weekday,
              start: row.start,
              end: row.end,
              note: row.note,
            })),
          ),
          blocks: blocks
            .filter((row) => row.date)
            .map((row) => ({
              date: row.date,
              start: row.start,
              end: row.end,
              available: row.available,
              note: row.note,
            })),
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

  const columns =
    mode === "week"
      ? WEEKDAYS.map((day) => ({
          id: day,
          title: day,
          items: (windows[day] || []).map((row) => ({
            key: row.key,
            start: row.start,
            end: row.end,
            available: true,
            note: row.note,
          })),
        }))
      : [
          {
            id: onDate || "date",
            title: onDate ? labelDate(onDate) : "Pick a date",
            items: blocks
              .filter((row) => row.date === onDate)
              .map((row) => ({
                key: row.key,
                start: row.start,
                end: row.end,
                available: row.available,
                note: row.note,
              })),
          },
        ];

  let gridStart = DAY_START;
  let gridEnd = DAY_END;
  for (const col of columns) {
    for (const item of col.items) {
      gridStart = Math.min(gridStart, Math.floor(toMin(item.start) / SNAP) * SNAP);
      gridEnd = Math.max(gridEnd, Math.ceil(toMin(item.end) / SNAP) * SNAP);
    }
  }
  if (gridEnd <= gridStart) gridEnd = gridStart + 60;
  gridStartRef.current = gridStart;
  const gridPx = (gridEnd - gridStart) * PX_PER_MIN;

  const selectedWindow = WEEKDAYS.flatMap((day) => windows[day] || []).find((row) => row.key === selected);
  const selectedBlock = blocks.find((row) => row.key === selected);
  const selectedLabel = selectedWindow
    ? `${selectedWindow.weekday} ${selectedWindow.start}–${selectedWindow.end}`
    : selectedBlock
      ? `${labelDate(selectedBlock.date)} ${selectedBlock.start}–${selectedBlock.end}${
          selectedBlock.note ? ` · ${selectedBlock.note}` : ""
        }`
      : "";

  const lines: number[] = [];
  for (let m = gridStart; m <= gridEnd; m += SNAP) lines.push(m);
  const hours: number[] = [];
  for (let m = Math.ceil(gridStart / 60) * 60; m <= gridEnd; m += 60) hours.push(m);

  return (
    <>
      <h2>Availability</h2>
      <span className="k">Staff see their own · owner sees and edits everyone</span>

      <div className="row" style={{ margin: "12px 0", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label className="field" style={{ margin: 0, minWidth: 220 }}>
          <span>Staff member</span>
          <select value={target} onChange={(e) => void pick(e.target.value)} disabled={!canEditOthers}>
            {(canEditOthers ? staff : staff.filter((s) => s.id === me?.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name} · {s.role}
              </option>
            ))}
            {staff.length === 0 && me && <option value={me.id}>You</option>}
          </select>
        </label>
        {!readOnly && (
          <button type="button" className="hot hot--btn" style={btn} disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save availability"}
          </button>
        )}
        {msg && <span className="muted">{msg}</span>}
      </div>

      <Err message={error} />

      <div className="card">
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            className={mode === "week" ? "btn btn--dark btn--sm" : "btn btn--sm"}
            style={btn}
            onClick={() => {
              setMode("week");
              setSelected(null);
            }}
          >
            Every week
          </button>
          <button
            type="button"
            className={mode === "date" ? "btn btn--dark btn--sm" : "btn btn--sm"}
            style={btn}
            onClick={showDateMode}
          >
            One date
          </button>
          {mode === "date" && (
            <label className="field" style={{ margin: 0, minWidth: 180 }}>
              <span>Date</span>
              <input
                type="date"
                value={onDate}
                onChange={(e) => {
                  setOnDate(e.target.value);
                  setSelected(null);
                }}
              />
            </label>
          )}
          {mode === "date" && !readOnly && (
            <>
              <button
                type="button"
                className={paint === "off" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                style={btn}
                onClick={() => setPaint("off")}
              >
                Time off
              </button>
              <button
                type="button"
                className={paint === "extra" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                style={btn}
                onClick={() => setPaint("extra")}
              >
                Extra slot
              </button>
            </>
          )}
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {mode === "week"
            ? "Click an empty quarter to add an hour. Drag a block to another time or day. Drag the top or bottom edge to resize. Snaps to 15 minutes."
            : "This date only. Click an empty quarter to paint time off or an extra slot. Drag and resize the same way."}
        </p>

        <div className={`avail-cal${mode === "date" ? " is-one" : ""}${readOnly ? " is-readonly" : ""}`}>
          <div className="avail-cal__head">
            <div />
            {columns.map((col) => (
              <div key={col.id}>{col.title}</div>
            ))}
          </div>
          <div className="avail-cal__body">
            <div className="avail-cal__gutter" style={{ height: gridPx }}>
              {hours.map((m) => (
                <div key={m} className="avail-cal__tick" style={{ top: (m - gridStart) * PX_PER_MIN }}>
                  {toHHMM(m)}
                </div>
              ))}
            </div>
            {columns.map((col) => (
              <div
                key={col.id}
                className="avail-cal__col"
                data-day={col.id}
                style={{ height: gridPx }}
                onPointerDown={onColumnDown}
                onPointerUp={onColumnUp}
              >
                {lines.map((m) => (
                  <div
                    key={m}
                    className={m % 60 === 0 ? "avail-cal__line avail-cal__line--hour" : "avail-cal__line"}
                    style={{ top: (m - gridStart) * PX_PER_MIN }}
                  />
                ))}
                {col.items.map((item) => {
                  const top = (toMin(item.start) - gridStart) * PX_PER_MIN;
                  const height = Math.max((toMin(item.end) - toMin(item.start)) * PX_PER_MIN, 14);
                  const kind = item.available ? "is-open" : "is-off";
                  return (
                    <div
                      key={item.key}
                      className={`avail-block ${kind}${selected === item.key ? " is-selected" : ""}`}
                      style={{ top, height }}
                      onPointerDown={(e) => beginDrag(e, item.key, col.id, item.start, item.end, "move")}
                      aria-label={`${col.title} ${item.start} to ${item.end}${item.available ? "" : " time off"}`}
                    >
                      {!readOnly && (
                        <div
                          className="avail-block__edge avail-block__edge--top"
                          onPointerDown={(e) => beginDrag(e, item.key, col.id, item.start, item.end, "start")}
                        />
                      )}
                      {height > 22 ? (
                        <span className="avail-block__label">
                          {item.start}–{item.end}
                          {!item.available ? " off" : ""}
                        </span>
                      ) : null}
                      {!readOnly && (
                        <div
                          className="avail-block__edge avail-block__edge--bot"
                          onPointerDown={(e) => beginDrag(e, item.key, col.id, item.start, item.end, "end")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {selectedLabel ? (
          <div className="row" style={{ marginTop: 12, gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{selectedLabel}</strong>
            {mode === "date" && selectedBlock && !readOnly && (
              <>
                <button
                  type="button"
                  className={!selectedBlock.available ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btn}
                  onClick={() => setSelectedAvailable(false)}
                >
                  Time off
                </button>
                <button
                  type="button"
                  className={selectedBlock.available ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btn}
                  onClick={() => setSelectedAvailable(true)}
                >
                  Extra slot
                </button>
              </>
            )}
            {!readOnly && (
              <button type="button" className="btn btn--sm" style={btn} onClick={removeSelected}>
                Remove
              </button>
            )}
          </div>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            Select a block to remove it. Weekly blocks repeat; a date block is that day only.
          </p>
        )}
      </div>

      <div className="card card--wash">
        <div className="k" style={{ marginBottom: 4 }}>
          On the calendar
        </div>
        <p className="muted">
          The schedule week grid can shade hours outside these windows so sessions land in open time. 1-on-1
          bookings are checked against this availability.
        </p>
      </div>
    </>
  );
}
