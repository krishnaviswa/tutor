"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
      <span className="av av--lg" style={{ background: "var(--tint)", borderRadius: 12 }}>
        T
      </span>
      <h2 style={{ fontSize: "1.2rem", margin: "14px 0 6px" }}>Follow your child’s progress</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Open the invite token and confirm the student link. Then the parent hub — own child only.
      </p>
      <label className="field">
        <span>Invite token</span>
        <input className="field__in" value={token} onChange={(e) => setToken(e.target.value)} />
        <em>Seed token {exam.parentLinkToken} (already accepted in seed; accept is idempotent enough to land home)</em>
      </label>
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Linking" : "Link my account"}
      </button>
      <div className="card card--wash" style={{ marginTop: 20 }}>
        <div className="k" style={{ marginBottom: 4 }}>What you’ll see</div>
        <p className="muted">
          Only your linked child: activity, progress, test results, fee receipts, and a thread with the teacher.
        </p>
      </div>
    </form>
  );
}

export function ParentLinkScreen() {
  return (
    <LoginGate role="parent" phone={exam.phones.parent}>
      <AcceptForm />
    </LoginGate>
  );
}
