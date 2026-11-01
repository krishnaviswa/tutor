"use client";

import Link from "next/link";
import { catalogRoute } from "@/lib/screens";
import { templateName } from "@/lib/template-kinds";
import { Err } from "./bits";
import { useTemplateSetup } from "./useTemplateSetup";

export function TemplateGalleryScreen() {
  const setup = useTemplateSetup();
  const selectedName = templateName(setup.sel);

  return (
    <>
      <h2>Template gallery</h2>
      <span className="k">Each one is a starting set of tools. Applying it replaces which tools are on.</span>
      <Err message={setup.error} />
      {setup.kindLoaded ? (
        <p style={{ margin: "12px 0" }}>
          {setup.currentKind ? (
            <>
              On now: <strong>{templateName(setup.currentKind)}</strong>
            </>
          ) : (
            "No setup is on yet."
          )}
        </p>
      ) : (
        <p className="muted" style={{ margin: "12px 0" }}>
          Loading the current setup…
        </p>
      )}
      {setup.applied ? (
        <p className="muted" role="status">
          {templateName(setup.applied)} is on. Next, set the name and colours learners see.
        </p>
      ) : null}
      {!setup.templatesLoaded ? <p className="muted">Loading setups…</p> : null}
      <div className="grid g2">
        {setup.cards.map((card) => {
          const selected = setup.sel === card.id;
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={selected}
              className={selected ? "card card--wash" : "card"}
              style={{ textAlign: "left", border: selected ? "1.5px solid var(--tint)" : undefined }}
              onClick={() => setup.choose(card.id)}
            >
              <div className="sb">
                <h3 style={{ margin: 0 }}>{card.name}</h3>
                <span className="pill">{card.modules.length} tools</span>
              </div>
              {card.blurb ? (
                <p className="muted" style={{ margin: "6px 0" }}>
                  {card.blurb}
                </p>
              ) : null}
              {setup.currentKind === card.id ? <span className="pill is-good">On now</span> : null}
            </button>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className={setup.applied ? "btn btn--sm" : "hot hot--btn"}
          type="button"
          disabled={setup.busy || !setup.sel || !setup.kindLoaded || !setup.templatesLoaded}
          onClick={() => void setup.apply()}
        >
          {setup.busy ? "Applying…" : `Apply ${selectedName}`}
        </button>
        <Link href={catalogRoute("branding")} className={setup.applied ? "hot hot--btn" : "btn btn--sm"}>
          {setup.applied ? "Continue to branding" : "Branding"}
        </Link>
      </div>
    </>
  );
}
