import { test, expect } from "@playwright/test";
import { auditLayout } from "../../src/layout";

/**
 * Proves the layout detector can fail. A clean page yields no findings; a page built
 * with one defect of each kind yields each kind. Runs without the app.
 */

const CLEAN = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>
  body { margin: 16px; font: 16px sans-serif; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .scroll { overflow-x: auto; } .wide { width: 2000px; }
  .ell { width: 80px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .tabs { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 8px; background: #fff; }
  .crumbrow { display: flex; gap: 0; } .ttl { width: 60px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: none; }
  .tall p { margin: 0 0 24px; }
  .backdrop { position: fixed; inset: 0; z-index: -1; } .backdrop p { position: absolute; left: 20px; top: 20px; margin: 0; }
</style></head><body>
  <div class="backdrop"><p>Decorative caption behind the content</p></div>
  <h1>Clean page</h1><p>Short text.</p>
  <div class="tall">${Array.from({ length: 40 }, (_, i) => `<p>Row ${i + 1} scrolls under the tab bar</p>`).join("")}</div>
  <nav class="tabs"><a href="#a">Home</a><a href="#b">Fees</a></nav>
  <div class="row"><button>One</button><button>Two</button><a href="#x">Link</a></div>
  <div class="scroll"><div class="wide"><button>Inside a scroller</button></div></div>
  <div class="ell">A long label that is meant to end with an ellipsis</div>
  <div class="crumbrow"><strong class="ttl">Lesson / module viewer with a long title</strong><a href="#c" style="display:inline-block;width:400px">Classes</a></div>
</body></html>`;

const BROKEN = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>
  body { margin: 0; font: 16px sans-serif; }
  .wide { width: 1500px; height: 10px; }
  .off { position: absolute; left: 1400px; top: 40px; }
  .clip { width: 60px; overflow: hidden; white-space: nowrap; }
  .a { position: absolute; left: 10px; top: 100px; width: 120px; }
  .b { position: absolute; left: 60px; top: 104px; width: 120px; }
</style></head><body>
  <div class="wide"></div>
  <button class="off">Off screen</button>
  <div class="clip">This text is cut off without an ellipsis</div>
  <button class="a">First button</button>
  <button class="b">Second button</button>
</body></html>`;

test("@layout detector reports nothing on a clean page", async ({ page }, testInfo) => {
  await page.setContent(CLEAN);
  const findings = await auditLayout(page, testInfo, "fixture-clean");
  expect(findings).toEqual([]);
});

test("@layout detector reports each defect kind on a broken page", async ({ page }, testInfo) => {
  await page.setContent(BROKEN);
  // Keep strict mode out of this proof; the assertions below are the check.
  const strict = process.env.LAYOUT_STRICT;
  delete process.env.LAYOUT_STRICT;
  try {
    const findings = await auditLayout(page, testInfo, "fixture-broken");
    const kinds = new Set(findings.map((f) => f.kind));
    expect([...kinds].sort()).toEqual(["clipped-text", "horizontal-scroll", "off-screen-control", "overlap"]);
    const overlap = findings.find((f) => f.kind === "overlap");
    expect(`${overlap?.a} ${overlap?.b}`).toMatch(/First button.*Second button|Second button.*First button/);
  } finally {
    if (strict !== undefined) process.env.LAYOUT_STRICT = strict;
  }
  // These fixture findings are not product findings; drop them from the summary.
  testInfo.annotations.splice(0, testInfo.annotations.length, ...testInfo.annotations.filter((a) => a.type !== "layout"));
});
