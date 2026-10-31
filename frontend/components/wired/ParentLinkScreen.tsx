"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LoginGate } from "@/components/LoginGate";
import { api } from "@/lib/api";
import { MOCK_TENANTS } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { Err, Loading } from "./bits";

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
      style={{
        padding: "28px 22px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 440,
        margin: "0 auto",
      }}
      onSubmit={onSubmit}
    >
      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="k">Guardian Invitation</span>
          <span className="pill is-good">Verified Invite</span>
        </div>
        <h2 style={{ fontSize: "1.25rem", margin: "10px 0 6px" }}>Follow your child’s progress</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Link your guardian account to view attendance, teacher notes after class, homework status, and lesson pack hours.
        </p>

        <Err message={error} />

        <button className="hot hot--btn" type="submit" disabled={busy || !token.trim()} style={{ width: "100%" }}>
          {busy ? "Linking child account…" : "Accept & Link Child Account"}
        </button>

        <details style={{ marginTop: 14 }}>
          <summary className="muted" style={{ cursor: "pointer", fontSize: ".82rem" }}>
            Enter a different invite code
          </summary>
          <div style={{ marginTop: 8 }}>
            <label className="field">
              <span>Invite code</span>
              <input
                className="field__in"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste guardian invite code"
              />
            </label>
          </div>
        </details>
      </div>
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
    <form className="tint-violet" style={{ padding: "28px 22px", maxWidth: 440, margin: "0 auto" }} onSubmit={onSubmit}>
      <div className="card" style={{ padding: 20 }}>
        <div className="k">Parent &amp; Guardian Access</div>
        <h2 style={{ fontSize: "1.2rem", margin: "6px 0 12px" }}>Invite a parent or guardian</h2>
        <label className="field">
          <span>Select student</span>
          <select className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <Err message={error} />
        <button className="hot hot--btn" type="submit" disabled={busy || !studentId} style={{ marginTop: 8 }}>
          {busy ? "Creating invite…" : "Generate Parent Invite"}
        </button>
        {token ? (
          <div className="card card--wash" style={{ marginTop: 12 }}>
            <div className="k">Share this invite code with the guardian</div>
            <p style={{ marginTop: 4, fontFamily: "var(--mono)", fontWeight: 600 }}>{token}</p>
          </div>
        ) : null}
      </div>
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
  if (!role) {
    return (
      <div className="login-gate">
        <Loading>Checking your account…</Loading>
      </div>
    );
  }
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
