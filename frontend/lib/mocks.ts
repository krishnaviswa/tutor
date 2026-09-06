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
  cohortId: string;
  sessionId: string;
  topicId: string;
  questionId: string;
  practiceSetId: string;
  parentLinkToken: string;
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
    cohortId: `cccccccc-${tag}-4000-8000-000000000021`,
    sessionId: `cccccccc-${tag}-4000-8000-000000000022`,
    topicId: `cccccccc-${tag}-4000-8000-000000000024`,
    questionId: `cccccccc-${tag}-4000-8000-000000000025`,
    practiceSetId: `cccccccc-${tag}-4000-8000-000000000026`,
    parentLinkToken: `link-${key}`,
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
