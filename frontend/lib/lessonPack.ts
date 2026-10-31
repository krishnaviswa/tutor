/** Lesson-pack display shared by parent home and the payments screen. */

const FLAG_KEYS = ["submitted", "turned_in", "turnedIn", "has_submission"] as const;

export function formatPackHours(minutes: number): string {
  const negative = minutes < 0;
  const total = Math.round(Math.abs(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (hours > 0 || mins === 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (mins > 0) {
    parts.push(`${mins} ${mins === 1 ? "minute" : "minutes"}`);
  }
  const text = parts.join(" ");
  return negative ? `-${text}` : text;
}

function asMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** `lesson_pack.balance_minutes`, or `balance_minutes` on the pack payload itself. */
export function readBalanceMinutes(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const pack = obj.lesson_pack;
  if (pack && typeof pack === "object") {
    const nested = asMinutes((pack as Record<string, unknown>).balance_minutes);
    if (nested != null) return nested;
  }
  return asMinutes(obj.balance_minutes);
}

function flagOn(row: Record<string, unknown>): boolean | null {
  for (const key of FLAG_KEYS) {
    if (typeof row[key] === "boolean") return row[key];
  }
  if (typeof row.submission === "boolean") return row.submission;
  if (!("submission" in row)) return null;
  const submission = row.submission;
  if (typeof submission === "boolean") return submission;
  if (submission == null) return false;
  if (typeof submission !== "object") return null;
  return flagOn(submission as Record<string, unknown>);
}

/**
 * Latest assignment only when a submission flag is actually present.
 * A missing flag returns null so the page does not invent "done".
 */
export function readAssignment(payload: unknown): { title: string; turnedIn: boolean } | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const raw = "assignment" in row ? row.assignment : "latest_assignment" in row ? row.latest_assignment : undefined;
  if (typeof raw === "boolean") return { title: "", turnedIn: raw };
  if (raw == null || typeof raw !== "object") return null;
  const assignment = raw as Record<string, unknown>;
  const turnedIn = flagOn(assignment);
  if (turnedIn == null) return null;
  const title =
    typeof assignment.title === "string"
      ? assignment.title
      : typeof assignment.name === "string"
        ? assignment.name
        : "";
  return { title, turnedIn };
}

function startOf(item: unknown): string {
  if (typeof item === "string" && item.trim()) return item;
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  if (typeof row.start === "string" && row.start.trim()) return row.start;
  if (typeof row.starts_at === "string" && row.starts_at.trim()) return row.starts_at;
  return "";
}

function listFrom(data: unknown, depth: number): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (depth <= 0 || !data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["hours", "starts", "open_hours", "slots", "items"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = listFrom(value, depth - 1);
      if (nested) return nested;
    }
  }
  return null;
}

/** Each open hour is a 60-minute start. Unknown shapes yield an empty list. */
export function readOpenHourStarts(payload: unknown): string[] {
  const list = listFrom(payload, 2);
  if (!list) return [];
  const starts: string[] = [];
  for (const item of list) {
    const start = startOf(item);
    if (start && !starts.includes(start)) starts.push(start);
  }
  return starts;
}

const TZ = "Asia/Kolkata";

export function formatHourStart(start: string): string {
  const when = new Date(start);
  if (Number.isNaN(when.getTime())) return start;
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(when);
  return `${date} · ${time}`;
}

function detailText(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!Array.isArray(detail)) return "";
  const parts = detail
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg || "");
      return "";
    })
    .filter((part) => part.trim());
  return parts.join(" ");
}

/** Prefer FastAPI `detail` (the under-an-hour booking error) over the raw status body. */
export function explainApiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const jsonStart = raw.indexOf("{");
  const arrayStart = raw.indexOf("[");
  const start =
    jsonStart >= 0 && (arrayStart < 0 || jsonStart < arrayStart) ? jsonStart : arrayStart;
  if (start >= 0) {
    try {
      const body = JSON.parse(raw.slice(start)) as { detail?: unknown };
      const detail = detailText(body.detail ?? body);
      if (detail) return detail;
    } catch {
      /* keep the raw message */
    }
  }
  return raw;
}

export function isNotFound(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.startsWith("404");
}
