/** Seed fixtures from backend/app/services/seed.py. OTP code is always 000000. */

export type TenantKey = "exam-prep" | "language-1on1" | "music";

export type MockTenant = {
  key: TenantKey;
  label: string;
  kind: string;
  workspaceId: string;
  phonePrefix: string;
  phones: {
    owner: string;
    teacher: string;
    assistant: string;
    student: string;
    parent: string;
  };
  emails: {
    owner: string;
    teacher: string;
    assistant: string;
    student: string;
    parent: string;
  };
  studentId: string;
  student2Id: string;
  student3Id: string;
  cohortId: string;
  emptyCohortId: string;
  sessionId: string;
  sessionNextId: string;
  sessionDraftId: string;
  topicId: string;
  questionId: string;
  question2Id: string;
  practiceSetId: string;
  testId: string;
  assignmentId: string;
  assignmentUngradedId: string;
  attemptPracticeId: string;
  contentId: string;
  invoiceOpenId: string;
  joinToken: string;
  joinTokenNext: string;
  parentLinkToken: string;
  parentLinkPending: string;
  threadId: string;
};

function tenant(
  key: TenantKey,
  label: string,
  kind: string,
  tag: string,
  prefix: string,
): MockTenant {
  return {
    key,
    label,
    kind,
    workspaceId: `aaaaaaaa-${tag}-4000-8000-000000000001`,
    phonePrefix: prefix,
    phones: {
      owner: `${prefix}o`,
      teacher: `${prefix}t`,
      assistant: `${prefix}a`,
      student: `${prefix}s`,
      parent: `${prefix}p`,
    },
    emails: {
      owner: `owner@${key}.sim`,
      teacher: `teacher@${key}.sim`,
      assistant: `assistant@${key}.sim`,
      student: `student@${key}.sim`,
      parent: `parent@${key}.sim`,
    },
    studentId: `cccccccc-${tag}-4000-8000-000000000020`,
    student2Id: `cccccccc-${tag}-4000-8000-000000000040`,
    student3Id: `cccccccc-${tag}-4000-8000-000000000066`,
    cohortId: `cccccccc-${tag}-4000-8000-000000000021`,
    emptyCohortId: `cccccccc-${tag}-4000-8000-000000000067`,
    sessionId: `cccccccc-${tag}-4000-8000-000000000022`,
    sessionNextId: `cccccccc-${tag}-4000-8000-000000000053`,
    sessionDraftId: `cccccccc-${tag}-4000-8000-000000000073`,
    topicId: `cccccccc-${tag}-4000-8000-000000000024`,
    questionId: `cccccccc-${tag}-4000-8000-000000000025`,
    question2Id: `cccccccc-${tag}-4000-8000-000000000042`,
    practiceSetId: `cccccccc-${tag}-4000-8000-000000000026`,
    testId: `cccccccc-${tag}-4000-8000-000000000030`,
    assignmentId: `cccccccc-${tag}-4000-8000-000000000029`,
    assignmentUngradedId: `cccccccc-${tag}-4000-8000-000000000074`,
    attemptPracticeId: `cccccccc-${tag}-4000-8000-000000000031`,
    contentId: `cccccccc-${tag}-4000-8000-000000000027`,
    invoiceOpenId: `cccccccc-${tag}-4000-8000-000000000036`,
    joinToken: `join-${key}`,
    joinTokenNext: `join-${key}-next`,
    parentLinkToken: `link-${key}`,
    parentLinkPending: `link-${key}-pending`,
    threadId: `thread-${key}`,
  };
}

export const MOCK_TENANTS: Record<TenantKey, MockTenant> = {
  "exam-prep": tenant("exam-prep", "Coaching exam-prep", "exam-prep", "0001", "+9101"),
  "language-1on1": tenant("language-1on1", "Language 1-on-1", "one-on-one", "0002", "+9102"),
  music: tenant("music", "Music studio", "music", "0003", "+9103"),
};

export const OTP_CODE = "000000";

export const ROLE_LOGIN: Record<string, { apiRole: string; phone: keyof MockTenant["phones"] }> = {
  student: { apiRole: "student", phone: "student" },
  faculty: { apiRole: "teacher", phone: "teacher" },
  admin: { apiRole: "owner", phone: "owner" },
  parent: { apiRole: "parent", phone: "parent" },
};

export const ALL_OTP_ROLES: { apiRole: string; phone: keyof MockTenant["phones"]; label: string }[] = [
  { apiRole: "owner", phone: "owner", label: "owner" },
  { apiRole: "teacher", phone: "teacher", label: "teacher" },
  { apiRole: "assistant", phone: "assistant", label: "assistant" },
  { apiRole: "student", phone: "student", label: "student" },
  { apiRole: "parent", phone: "parent", label: "parent" },
];

export type DemoPersonaRole = "teacher" | "owner" | "assistant" | "student" | "parent";

export type DemoPersona = {
  id: DemoPersonaRole;
  role: DemoPersonaRole;
  phoneKey: keyof MockTenant["phones"];
  name: string;
  roleTitle: string;
  label: string;
  phone: string;
  email: string;
  workspaceId: string;
};

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "teacher",
    role: "teacher",
    phoneKey: "teacher",
    name: "Sudhakshina",
    roleTitle: "Teacher",
    label: "Teacher — Sudhakshina (+9101t)",
    phone: MOCK_TENANTS["exam-prep"].phones.teacher,
    email: MOCK_TENANTS["exam-prep"].emails.teacher,
    workspaceId: MOCK_TENANTS["exam-prep"].workspaceId,
  },
  {
    id: "owner",
    role: "owner",
    phoneKey: "owner",
    name: "Vikram Nair",
    roleTitle: "Owner / Admin",
    label: "Owner / Admin — Vikram Nair (+9101o)",
    phone: MOCK_TENANTS["exam-prep"].phones.owner,
    email: MOCK_TENANTS["exam-prep"].emails.owner,
    workspaceId: MOCK_TENANTS["exam-prep"].workspaceId,
  },
  {
    id: "assistant",
    role: "assistant",
    phoneKey: "assistant",
    name: "Rohan Deshmukh",
    roleTitle: "Teaching Assistant",
    label: "Teaching Assistant — Rohan Deshmukh (+9101a)",
    phone: MOCK_TENANTS["exam-prep"].phones.assistant,
    email: MOCK_TENANTS["exam-prep"].emails.assistant,
    workspaceId: MOCK_TENANTS["exam-prep"].workspaceId,
  },
  {
    id: "student",
    role: "student",
    phoneKey: "student",
    name: "Aarav Sharma",
    roleTitle: "Student",
    label: "Student — Aarav Sharma (+9101s)",
    phone: MOCK_TENANTS["exam-prep"].phones.student,
    email: MOCK_TENANTS["exam-prep"].emails.student,
    workspaceId: MOCK_TENANTS["exam-prep"].workspaceId,
  },
  {
    id: "parent",
    role: "parent",
    phoneKey: "parent",
    name: "Rajesh Sharma",
    roleTitle: "Parent",
    label: "Parent — Rajesh Sharma (+9101p)",
    phone: MOCK_TENANTS["exam-prep"].phones.parent,
    email: MOCK_TENANTS["exam-prep"].emails.parent,
    workspaceId: MOCK_TENANTS["exam-prep"].workspaceId,
  },
];

export const MOCK_TENANT_LIST: MockTenant[] = [
  MOCK_TENANTS["exam-prep"],
  MOCK_TENANTS["language-1on1"],
  MOCK_TENANTS.music,
];

