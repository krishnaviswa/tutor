/**
 * The session is an httpOnly cookie set by the API (`tutoros_token`).
 * This module never writes that value where page script can read it.
 * `TOKEN_KEY` is removed if an older build left a bearer behind.
 */

export const TOKEN_KEY = "tutoros_token";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  window.localStorage.removeItem(TOKEN_KEY);
  return null;
}

export function setToken(_value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-TutorOS-Cookie": "1" },
    });
  } catch {
    /* the page still leaves */
  }
}
