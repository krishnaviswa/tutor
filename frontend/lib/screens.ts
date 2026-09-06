import { CATALOG_SCREENS } from "./catalog-screens";

export type CatalogScreen = {
  id: string;
  title: string;
  route: string;
  role: string;
  status?: string;
};

export { CATALOG_SCREENS };

export const EXAM_PREP_HIDE = new Set(["staff-login"]);

export function catalogRoute(id: string): string {
  const row = CATALOG_SCREENS.find((s) => s.id === id);
  if (!row) throw new Error(`unknown catalog screen id: ${id}`);
  return row.route;
}
