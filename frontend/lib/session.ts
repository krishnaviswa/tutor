/** JWT helpers. Never read localStorage during useState init — that hydrates unsigned on the server and signed on the client. */

export const TOKEN_KEY = "tutoros_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
