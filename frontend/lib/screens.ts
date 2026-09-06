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
