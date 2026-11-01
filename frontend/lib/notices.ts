import { api } from "./api";

/** Workspace module D5. When it is off, callers must not request the inbox. */
export async function noticesModuleOn(): Promise<boolean> {
  const me = (await api("/api/v1/auth/me")) as { workspace_modules?: string[] | null };
  const mods = me.workspace_modules;
  if (Array.isArray(mods) && !mods.includes("D5")) return false;
  return true;
}
