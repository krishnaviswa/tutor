"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Cohort = { id: string; name: string; student_ids: string[] };
type Student = { id: string; display_name: string };

export function CohortBuilderScreen() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/cohorts"), api("/api/v1/students")])
      .then(([c, s]) => {
        setCohorts(c as Cohort[]);
        setStudents(s as Student[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/cohorts", {
        method: "POST",
        body: JSON.stringify({ name }),
      })) as Cohort;
      if (picked.length) {
        await api(`/api/v1/cohorts/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({ student_ids: picked }),
        });
      }
      setName("");
      setPicked([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>New cohort</h2>
      <span className="k">Group students · set the rhythm</span>
      <Err message={error} />
      <div className="grid g2" style={{ alignItems: "start" }}>
        <form onSubmit={onCreate}>
          <label className="field">
            <span>Cohort name</span>
            <input className="field__in" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="field">
            <span>Add students</span>
            <div className="chips">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`chip${picked.includes(s.id) ? " on" : ""}`}
                  onClick={() =>
                    setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))
                  }
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          </div>
          <button className="hot hot--btn" type="submit" disabled={busy}>
            Create cohort
          </button>
        </form>
        <div>
          <div className="card card--wash">
            <div className="k" style={{ marginBottom: 8 }}>This cohort switches on</div>
            {["Shared schedule", "One join link per session", "Cohort-scoped practice"].map((x) => (
              <div key={x} className="list__i">
                <span style={{ color: "var(--tint)" }}>✓</span>
                <div className="gr">
                  <div className="t" style={{ fontWeight: 400 }}>
                    {x}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cohorts.length === 0 ? (
            <Empty>No cohorts yet.</Empty>
          ) : (
            cohorts.map((c) => (
              <div key={c.id} className="card">
                <div className="t">{c.name}</div>
                <div className="s muted">{(c.student_ids || []).length} students</div>
              </div>
            ))
          )}
          <Link href={catalogRoute("schedule")} className="hot hot--btn" style={{ marginTop: 8 }}>
            Go to schedule
          </Link>
        </div>
      </div>
    </>
  );
}
