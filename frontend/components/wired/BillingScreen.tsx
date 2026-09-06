"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Empty, Err, rupees } from "./bits";

type Plan = { id: string; name: string; amount_cents: number; interval: string };
type Student = { id: string; display_name: string };

export function BillingScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("450000");
  const [planId, setPlanId] = useState("");
  const [auto, setAuto] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    Promise.all([api("/api/v1/plans"), api("/api/v1/students")])
      .then(([p, s]) => {
        const plans = p as Plan[];
        const students = s as Student[];
        setPlans(plans);
        setStudents(students);
        if (plans[0]) setPlanId(plans[0].id);
        if (students[0]) setStudentId(students[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          amount_cents: Number(amount),
          plan_id: planId || null,
          auto,
          coupon: coupon || null,
          days_used: 10,
        }),
      })) as { id: string };
      setNote(`Invoice ${row.id} created`);
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
      {plans.length === 0 ? <Empty>No plans seeded.</Empty> : (
        <div className="grid g2">
          {plans.map((p) => (
            <div key={p.id} className="card">
              <div className="t">{p.name}</div>
              <div className="s muted">{rupees(p.amount_cents)} · {p.interval}</div>
            </div>
          ))}
        </div>
      )}
      <form className="card" onSubmit={onCreate}>
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
          <span>Amount (cents)</span>
          <input className="field__in" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="list__i" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>auto</span>
        </label>
        <label className="field">
          <span>Coupon</span>
          <input className="field__in" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
        </label>
        <button className="hot hot--btn" type="submit" disabled={busy || !studentId}>
          Issue invoice
        </button>
        {note ? <p className="muted" style={{ marginTop: 8 }}>{note}</p> : null}
      </form>
    </>
  );
}
