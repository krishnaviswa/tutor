/** Display names for the six template ids. Tool lists come from the API. */

export type TemplateKind = {
  id: string;
  name: string;
  blurb: string;
};

export const TEMPLATE_KINDS: TemplateKind[] = [
  {
    id: "exam-prep",
    name: "Exam-prep loop",
    blurb: "Concept, same-day practice, tagged analysis, and a mock.",
  },
  {
    id: "one-on-one",
    name: "1-on-1 subject tutor",
    blurb: "Sessions, homework, a shared record, and simple billing.",
  },
  {
    id: "k-12",
    name: "K-12 homework help",
    blurb: "Short sessions, doubts, light practice, and a parent who can see progress.",
  },
  {
    id: "skills",
    name: "Skills / cohort course",
    blurb: "Cohorts, a content library, projects, and a final assessment.",
  },
  {
    id: "music",
    name: "Music / arts",
    blurb: "Recurring lessons, a practice log, and guardian visibility.",
  },
  {
    id: "everything",
    name: "Everything",
    blurb: "Every tool on. A gallery to explore, not the usual starting point.",
  },
];

export type TemplateCard = TemplateKind & { modules: string[] };

export function templateName(id: string): string {
  return TEMPLATE_KINDS.find((t) => t.id === id)?.name ?? id;
}

export function cardsFromApi(rows: { id: string; modules: string[] }[]): TemplateCard[] {
  const modules = new Map(rows.map((row) => [row.id, row.modules]));
  const known = TEMPLATE_KINDS.filter((kind) => modules.has(kind.id)).map((kind) => ({
    ...kind,
    modules: modules.get(kind.id) ?? [],
  }));
  const extra = rows
    .filter((row) => !TEMPLATE_KINDS.some((kind) => kind.id === row.id))
    .map((row) => ({ id: row.id, name: row.id, blurb: "", modules: row.modules }));
  return [...known, ...extra];
}
