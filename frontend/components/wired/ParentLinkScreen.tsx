"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LoginGate } from "@/components/LoginGate";
import { api } from "@/lib/api";
import { MOCK_TENANTS } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

function AcceptForm() {
  const router = useRouter();
  const [token, setToken] = useState(exam.parentLinkToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/api/v1/parent-links/${encodeURIComponent(token)}/accept`, { method: "POST" });
      router.replace(catalogRoute("parent-home"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="tint-violet"
      style={{ padding: "28px 22px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 420, margin: "0 auto" }}
      onSubmit={onSubmit}
    >
      <h2 style={{ fontSize: "1.2rem", margin: "14px 0 6px" }}>Follow your child’s progress</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Open the invite token and confirm the student link. Then the parent hub — own child only.
      </p>
      <label className="field">
        <span>Invite token</span>
        <input className="field__in" value={token} onChange={(e) => setToken(e.target.value)} />
        <em>Seed token {exam.parentLinkToken}</em>
      </label>
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Linking" : "Link my account"}
      </button>
    </form>
  );
}

function MintForm() {
  const [students, setStudents] = useState<{ id: string; display_name: string }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/students")
      .then((rows) => {
        const list = rows as { id: string; display_name: string }[];
        setStudents(list);
        if (list[0]) setStudentId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/parent-links", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
      })) as { token: string };
      setToken(row.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tint-violet" style={{ padding: "28px 22px", maxWidth: 420, margin: "0 auto" }} onSubmit={onSubmit}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Mint a parent invite</h2>
      <label className="field">
        <span>Student</span>
        <select className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      </label>
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy || !studentId}>
        {busy ? "Minting" : "Create invite"}
      </button>
      {token ? <p className="muted" style={{ marginTop: 12, fontFamily: "var(--mono)" }}>{token}</p> : null}
    </form>
  );
}

function ParentLinkBody() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "parent"))
      .catch(() => setRole("parent"));
  }, []);
  if (!role) return <div className="login-gate" aria-busy="true" />;
  if (role === "parent") return <AcceptForm />;
  return <MintForm />;
}

export function ParentLinkScreen() {
  return (
    <LoginGate role="parent" phone={exam.phones.parent} accept={["parent", "teacher", "owner"]}>
      <ParentLinkBody />
    </LoginGate>
  );
}
