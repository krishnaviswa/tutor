"use client";

import { useCallback, useEffect, useState } from "react";
import { ClassNotices } from "@/components/studio/ClassNotices";
import { api } from "@/lib/api";
import {
  explainApiError,
  formatHourStart,
  formatPackHours,
  isNotFound,
  readAssignment,
  readBalanceMinutes,
  readOpenHourStarts,
} from "@/lib/lessonPack";
import { formatWhen, shortId } from "@/lib/format";
import { AppBar, Av, Empty, Err, Loading, rupees } from "./bits";

type FeeFact = { amount_cents: number; due_on?: string; status: string; receipt_id?: string | null; label?: string };

type Child = {
  student_id: string;
  display_name: string;
  attendance?: { present: number; total: number };
  latest_practice?: { score: number; total: number; title: string } | null;
  latest_test?: { score: number; max: number; title: string } | null;
  fee_due?: { amount_cents: number; due_on: string; status: string } | null;
  fees?: { visible?: boolean; due?: FeeFact | null; latest_receipt?: FeeFact | null };
  latest_class_note?: { text: string; session_title?: string; recorded_at?: string | null } | null;
  fee_visible?: boolean;
  activity_summary?: string;
};

type Home = {
  children: Child[];
  hub: string[];
  lesson_pack?: { balance_minutes?: number };
  assignment?: unknown;
};

async function packMinutesFor(home: Home, studentId: string | undefined): Promise<number | null> {
  const child = home.children?.[0];
  const onHome = readBalanceMinutes(child) ?? readBalanceMinutes(home);
  if (onHome != null || !studentId) return onHome;
  try {
    const pack = await api(`/api/v1/students/${encodeURIComponent(studentId)}/lesson-pack`);
    return readBalanceMinutes(pack);
  } catch {
    return null;
  }
}

export function ParentHomeScreen() {
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState("");
  const [packMinutes, setPackMinutes] = useState<number | null>(null);
  const [openHours, setOpenHours] = useState<string[] | null>(null);
  const [selectedHour, setSelectedHour] = useState<string>("");
  const [hoursNote, setHoursNote] = useState("");
  const [booking, setBooking] = useState("");
  const [bookedStart, setBookedStart] = useState("");

  const loadOpenHours = useCallback(async () => {
    try {
      const open = await api("/api/v1/parent/open-hours");
      const starts = readOpenHourStarts(open);
      setOpenHours(starts);
      setSelectedHour((prev) => (prev && starts.includes(prev) ? prev : starts[0] || ""));
      setHoursNote("");
    } catch (err) {
      if (isNotFound(err)) {
        setOpenHours(null);
        setHoursNote("");
        return;
      }
      setOpenHours([]);
      setHoursNote(explainApiError(err));
    }
  }, []);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const row = (await api("/api/v1/parent/home")) as Home;
        if (stop) return;
        setData(row);
        const studentId = row.children?.[0]?.student_id;
        const minutes = await packMinutesFor(row, studentId);
        if (!stop) setPackMinutes(minutes);
        if (!stop && studentId) await loadOpenHours();
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void load();
    return () => {
      stop = true;
    };
  }, [loadOpenHours]);

  async function book(start: string) {
    if (!start) return;
    setBooking(start);
    setHoursNote("");
    setBookedStart("");
    try {
      await api("/api/v1/parent/bookings", {
        method: "POST",
        body: JSON.stringify({ start }),
      });
    } catch (err) {
      setHoursNote(explainApiError(err));
      setBooking("");
      return;
    }
    setBookedStart(start);
    setBooking("");
    try {
      const row = (await api("/api/v1/parent/home")) as Home;
      setData(row);
      setPackMinutes(await packMinutesFor(row, row.children?.[0]?.student_id));
      await loadOpenHours();
    } catch {
      setOpenHours((current) => {
        const next = current ? current.filter((item) => item !== start) : current;
        if (next) setSelectedHour(next[0] || "");
        return next;
      });
    }
  }

  const child = data?.children?.[0];
  const att = child?.attendance;
  const practice = child?.latest_practice;
  const test = child?.latest_test;
  const fee = child?.fees?.due ?? child?.fee_due;
  const receipt = child?.fees?.latest_receipt;
  const note = child?.latest_class_note;
  const assignment = readAssignment(child) ?? readAssignment(data);
  const packLabel = packMinutes == null ? null : formatPackHours(packMinutes);

  return (
    <>
      <AppBar title="Family Overview" extra={<span className="pill">guardian</span>} />
      <div className="appwrap">
        {!data && !error ? <Loading>Loading your family overview…</Loading> : null}
        <Err message={error} />
        <ClassNotices />

        {data ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="k">Child Overview</div>
            {!child ? (
              <Empty>No linked child yet. Accept your guardian invite to link your child’s account.</Empty>
            ) : (
              <div className="list__i" style={{ border: 0, padding: "8px 0 0" }}>
                <div className="row" style={{ flexWrap: "nowrap", gap: 10 }}>
                  <Av name={child.display_name} />
                  <div className="gr">
                    <div className="t">{child.display_name}</div>
                    <div className="s">{child.activity_summary || "Active student in this workspace"}</div>
                  </div>
                </div>
                <span className="pill is-good">linked</span>
              </div>
            )}
          </div>
        ) : null}

        {child ? (
          <div className="grid g3" style={{ marginBottom: 12 }}>
            <div className="stat">
              <div className="stat__v">{att ? `${att.present} / ${att.total}` : "—"}</div>
              <div className="stat__l">Attendance</div>
            </div>
            <div className="stat">
              <div className="stat__v">{practice ? `${practice.score} / ${practice.total}` : "—"}</div>
              <div className="stat__l">Latest practice</div>
              <div className="stat__d">
                <span className="muted">{practice?.title || ""}</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat__v">{test ? `${test.score} / ${test.max}` : "—"}</div>
              <div className="stat__l">Latest test</div>
              <div className="stat__d">
                <span className="muted">{test?.title || ""}</span>
              </div>
            </div>
          </div>
        ) : null}

        {child ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div className="card" style={{ margin: 0 }}>
              <div className="k">Lesson Pack &amp; Book Next 1-on-1 Slot</div>
              {packLabel ? (
                <div style={{ margin: "8px 0 10px" }}>
                  <div className="stat__v">{packLabel} remaining</div>
                  <p className="muted" style={{ marginTop: 2 }}>
                    Booking reserves a 60-minute slot. Hours are only deducted once class is held.
                  </p>
                </div>
              ) : null}

              {openHours ? (
                <div style={{ marginTop: 10 }}>
                  <Err message={hoursNote} />
                  {bookedStart ? (
                    <p style={{ margin: "6px 0", fontWeight: 500 }}>
                      Booked {formatHourStart(bookedStart)}. Your pack balance stays intact until the session takes place.
                    </p>
                  ) : null}
                  {openHours.length === 0 && !hoursNote ? (
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      No open 60-minute slots available in the next 7 days.
                    </p>
                  ) : openHours.length > 0 ? (
                    <>
                      <label className="field">
                        <span>Available 60-minute slots (next 7 days)</span>
                        <select
                          className="field__in"
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(e.target.value)}
                        >
                          {openHours.map((start) => (
                            <option key={start} value={start}>
                              {formatHourStart(start)} (60 min)
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="hot hot--btn"
                        type="button"
                        disabled={booking !== "" || !selectedHour}
                        onClick={() => void book(selectedHour)}
                        style={{ marginTop: 8, width: "100%" }}
                      >
                        {booking ? "Booking slot…" : "Book Slot"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div className="k">Latest Teacher Note &amp; Homework Status</div>
              <div style={{ marginTop: 8 }}>
                {note?.text ? (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{note.session_title || "Recent Class"}</div>
                    <p style={{ margin: 0 }}>{note.text}</p>
                  </>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    No class summary note has been filed yet.
                  </p>
                )}
              </div>

              {assignment ? (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                  <div className="k">Homework Status</div>
                  <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
                    <div style={{ fontWeight: 600 }}>{assignment.title || "Current Assignment"}</div>
                    <span className={assignment.turnedIn ? "pill is-good" : "pill"}>
                      {assignment.turnedIn ? "Turned in" : "Not turned in"}
                    </span>
                  </div>
                </div>
              ) : null}

              {child.fee_visible !== false ? (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                  <div className="k">Tuition &amp; Receipts</div>
                  <div style={{ fontWeight: 600, margin: "4px 0" }}>
                    {fee ? `${rupees(fee.amount_cents)} due ${formatWhen(fee.due_on) || ""}` : "No open invoice"}
                  </div>
                  <div className="muted">
                    {fee?.status ? <span className="pill">{fee.status}</span> : null}{" "}
                    {receipt
                      ? `Latest receipt ${shortId(receipt.receipt_id)} · ${rupees(receipt.amount_cents)} paid`
                      : "No paid receipt yet"}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
