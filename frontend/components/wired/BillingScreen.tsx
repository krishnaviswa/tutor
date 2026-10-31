"use client";

import { useEffect, useState, type FormEvent } from "react";
import { InvoiceTrail } from "@/components/studio/InvoiceTrail";
import { api } from "@/lib/api";
import { Empty, Err, Loading, rupees } from "./bits";

type Plan = { id: string; name: string; amount_cents: number; interval: string };
type Student = { id: string; display_name: string };

const RUPEE_PRESETS = [
  { value: "2500", label: "₹2,500 — Monthly Installment" },
  { value: "4500", label: "₹4,500 — Standard Term Fee" },
  { value: "9000", label: "₹9,000 — Half-Yearly Pack" },
  { value: "18000", label: "₹18,000 — Annual Pack" },
] as const;

const COUPON_OPTIONS = [
  { value: "", label: "No coupon" },
  { value: "SAVE10", label: "SAVE10 — 10% Scholarship Discount" },
  { value: "EARLYBIRD", label: "EARLYBIRD — Early Enrollment" },
] as const;

export function BillingScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [amountPreset, setAmountPreset] = useState("4500");
  const [customRupees, setCustomRupees] = useState("4500");
  const [planId, setPlanId] = useState("");
  const [auto, setAuto] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/v1/plans"), api("/api/v1/students")])
      .then(([p, s]) => {
        const planList = Array.isArray(p) ? (p as Plan[]) : [];
        const studentList = Array.isArray(s) ? (s as Student[]) : [];
        setPlans(planList);
        setStudents(studentList);
        if (planList[0]) setPlanId(planList[0].id);
        if (studentList[0]) setStudentId(studentList[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setReady(true));
  }, []);

  const resolvedRupees = amountPreset === "custom" ? Number(customRupees) : Number(amountPreset);
  const amountCents = Number.isFinite(resolvedRupees) && resolvedRupees > 0 ? Math.round(resolvedRupees * 100) : 450000;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          amount_cents: amountCents,
          plan_id: planId || null,
          auto,
          coupon: coupon || null,
          days_used: 10,
        }),
      })) as { id: string };
      setInvoiceId(row.id);
      setNote("Invoice created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Billing</h2>
      <span className="k">Plans and invoices for this workspace</span>
      <Err message={error} />
      {!ready ? (
        <Loading>Loading plans…</Loading>
      ) : plans.length === 0 ? (
        error ? null : <Empty>No plans seeded.</Empty>
      ) : (
        <div className="grid g2">
          {plans.map((p) => (
            <div key={p.id} className="card">
              <div className="t">{p.name}</div>
              <div className="s muted">
                {rupees(p.amount_cents)} · {p.interval}
              </div>
            </div>
          ))}
        </div>
      )}
      <form className="card form-stack" onSubmit={onCreate}>
        <div className="form-row">
          <label className="field">
            <span>Student</span>
            <select className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Plan</span>
            <select className="field__in" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {rupees(p.amount_cents)}/{p.interval}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="row">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Automatically calculate amount from selected plan</span>
        </label>

        {!auto ? (
          <div className={amountPreset === "custom" ? "form-row" : undefined}>
            <label className="field">
              <span>Fee amount (₹)</span>
              <select
                className="field__in"
                value={amountPreset}
                onChange={(e) => setAmountPreset(e.target.value)}
              >
                {RUPEE_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                <option value="custom">Custom amount (₹)…</option>
              </select>
            </label>
            {amountPreset === "custom" ? (
              <label className="field">
                <span>Custom amount (₹)</span>
                <input
                  className="field__in"
                  type="number"
                  min={1}
                  step={1}
                  value={customRupees}
                  onChange={(e) => setCustomRupees(e.target.value)}
                  placeholder="Enter amount in ₹"
                  required
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <label className="field">
          <span>Coupon / Discount</span>
          <select className="field__in" value={coupon} onChange={(e) => setCoupon(e.target.value)}>
            {COUPON_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button className="hot hot--btn" type="submit" disabled={busy || !studentId} aria-busy={busy}>
            {busy ? "Issuing" : "Issue invoice"}
          </button>
          {note ? <p className="meta-line">{note}</p> : null}
        </div>
      </form>
      {invoiceId ? <InvoiceTrail invoiceId={invoiceId} /> : null}
      <button
        className="btn btn--sm"
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError("");
          api("/api/v1/billing/renewals", { method: "POST" })
            .then((row) => {
              const created = (row as { created?: unknown[] }).created;
              setNote(
                Array.isArray(created) ? `Renewal run created ${created.length} invoice(s).` : "Renewal run finished.",
              );
            })
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setBusy(false));
        }}
      >
        Run renewals
      </button>
    </>
  );
}
