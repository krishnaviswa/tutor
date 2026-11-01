import fs from "fs";
import path from "path";

/** Load e2e/.env without overriding variables already set in the shell. */
export function loadEnvFile(file = path.join(__dirname, "..", ".env")): void {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const REQUIRED = [
  "E2E_BASE_URL",
  "E2E_API_BASE",
  "E2E_WORKSPACE_ID",
  "E2E_OTP_CODE",
  "E2E_DEMO_PASSWORD",
  "E2E_OWNER_USERNAME",
  "E2E_TEACHER_USERNAME",
  "E2E_ASSISTANT_USERNAME",
  "E2E_STUDENT_USERNAME",
  "E2E_PARENT_USERNAME",
  "E2E_OWNER_PHONE",
  "E2E_TEACHER_PHONE",
  "E2E_ASSISTANT_PHONE",
  "E2E_STUDENT_PHONE",
  "E2E_PARENT_PHONE",
  "E2E_STUDENT_EMAIL",
  "E2E_TEACHER_EMAIL",
  "E2E_PARENT_EMAIL",
  "E2E_STUDENT_DISPLAY_NAME",
] as const;

function required(name: (typeof REQUIRED)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy e2e/.env.example to e2e/.env and fill the local demo seed. See e2e/README.md.`,
    );
  }
  return value;
}

export type DemoRole = "owner" | "teacher" | "assistant" | "student" | "parent";

export const env = {
  baseURL: required("E2E_BASE_URL"),
  apiBase: required("E2E_API_BASE"),
  workspaceId: required("E2E_WORKSPACE_ID"),
  otp: required("E2E_OTP_CODE"),
  demoPassword: required("E2E_DEMO_PASSWORD"),
  studentDisplayName: required("E2E_STUDENT_DISPLAY_NAME"),
  username: {
    owner: required("E2E_OWNER_USERNAME"),
    teacher: required("E2E_TEACHER_USERNAME"),
    assistant: required("E2E_ASSISTANT_USERNAME"),
    student: required("E2E_STUDENT_USERNAME"),
    parent: required("E2E_PARENT_USERNAME"),
  } satisfies Record<DemoRole, string>,
  phone: {
    owner: required("E2E_OWNER_PHONE"),
    teacher: required("E2E_TEACHER_PHONE"),
    assistant: required("E2E_ASSISTANT_PHONE"),
    student: required("E2E_STUDENT_PHONE"),
    parent: required("E2E_PARENT_PHONE"),
  } satisfies Record<DemoRole, string>,
  email: {
    student: required("E2E_STUDENT_EMAIL"),
    teacher: required("E2E_TEACHER_EMAIL"),
    parent: required("E2E_PARENT_EMAIL"),
  },
};

/** Catalog routes. Ids match catalog/screens.json. Do not invent ids. */
export const routes = {
  home: "/",
  router: "/app/student/router",
  studentLogin: "/app/student/student-login",
  staffLogin: "/app/faculty/staff-login",
  studentDash: "/app/student",
  teacherDash: "/app/faculty/teacher-dash",
  owner: "/app/admin",
  parentHome: "/app/parent",
  parentLink: "/app/parent/parent-link",
  schedule: "/app/faculty/schedule",
  sessions: "/app/faculty/sessions",
  record: "/app/faculty/record",
  roster: "/app/admin/roster",
  payments: "/app/student/payments",
  billing: "/app/admin/billing",
  profile: "/app/faculty/profile",
  reports: "/app/faculty/reports",
  practicePlay: "/app/student/practice-play",
  operator: "/operator",
} as const;
