/** Display helpers. Money on the API is paise (`amount_cents`): ₹100 is 10000. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const WHEN = {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
} as const;

const WHEN_CLOCK = {
  ...WHEN,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
} as const;

export function formatInr(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

/** Last 4 characters of a UUID. Any other id is returned unchanged. */
export function shortId(id: string | null | undefined): string {
  if (!id) return "";
  const trimmed = id.trim();
  if (!UUID_RE.test(trimmed)) return trimmed;
  return trimmed.slice(-4);
}

/** Replace full UUIDs in a sentence. Leaves the rest of the text alone. */
export function maskIds(text: string): string {
  return text.replace(UUID_IN_TEXT, (id) => shortId(id));
}

/**
 * `31 Oct 2026, 8:07 PM` in Asia/Kolkata.
 * A date with no clock (`2026-10-31`) stays a date, so a due day does not pick up 5:30 AM.
 * A clock with no zone is read as India time. A zoned instant is converted.
 */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (!trimmed) return "";
  const dateOnly = DATE_ONLY.exec(trimmed);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 6, 30))
    : parseStamp(trimmed);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", dateOnly ? WHEN : WHEN_CLOCK).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  if (!day || !month || !year) return "";
  if (dateOnly) return `${day} ${month} ${year}`;
  const hour = get("hour");
  const minute = get("minute");
  if (!hour || !minute) return `${day} ${month} ${year}`;
  const period = get("dayPeriod").replace(/\./g, "").toUpperCase();
  const suffix = period.startsWith("A") ? "AM" : period.startsWith("P") ? "PM" : period;
  return `${day} ${month} ${year}, ${hour}:${minute} ${suffix}`.replace(/\s+/g, " ").trim();
}

function parseStamp(value: string): Date | null {
  const hasZone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value);
  const wall = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
  const date = new Date(hasZone || !wall ? value : `${value}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}
