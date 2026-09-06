import Link from "next/link";
import type { ReactNode } from "react";
import { catalogRoute } from "@/lib/screens";

const STEPS = [
  { id: "wsetup", label: "Workspace" },
  { id: "onboard-kind", label: "Kind" },
  { id: "branding", label: "Brand" },
] as const;

export function SetupChrome({
  stepId,
  children,
}: {
  stepId: "wsetup" | "onboard-kind" | "branding";
  children: ReactNode;
}) {
  const idx = STEPS.findIndex((s) => s.id === stepId);
  return (
    <div className="setup tint-accent">
      <header className="suphead">
        <div className="wm">
          TutorOS <i>setup</i>
        </div>
        <nav className="steps" aria-label="Setup steps">
          {STEPS.map((s, i) => {
            const cls = i < idx ? "done" : i === idx ? "on" : undefined;
            return (
              <Link key={s.id} href={catalogRoute(s.id)} className={cls}>
                {i + 1}. {s.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="supbody">{children}</div>
    </div>
  );
}
