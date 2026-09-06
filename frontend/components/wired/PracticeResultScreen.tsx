"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Attempt = {
  id: string;
  score: number;
  max_score: number;
  practice_set_id?: string | null;
  test_id?: string | null;
};

export function PracticeResultScreen() {
  const params = useSearchParams();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params.get("attempt");
    if (!id) {
      setError("Open a result from practice-play or a test.");
      return;
    }
    api(`/api/v1/attempts/${id}`)
      .then((row) => setAttempt(row as Attempt))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [params]);

  return (
    <>
      <AppBar title="Result" />
      <div className="appwrap">
        <Err message={error} />
        {!attempt ? (
          <Empty>No attempt loaded.</Empty>
        ) : (
          <>
            <div className="stat" style={{ marginBottom: 12 }}>
              <div className="stat__v">
                {attempt.score} / {attempt.max_score}
              </div>
              <div className="stat__l">Score</div>
            </div>
            <div className="card card--wash">
              <p className="muted">Same attempt the parent sees on practice-result. Timeline already has the write.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
