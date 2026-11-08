import type { Page, TestInfo } from "@playwright/test";

export type LayoutKind = "horizontal-scroll" | "overlap" | "clipped-text" | "off-screen-control";

export type LayoutFinding = {
  kind: LayoutKind;
  page: string;
  width: number;
  a: string;
  b?: string;
  detail?: string;
};

/** Phone, tablet, desktop. Heights only matter for "is it on screen". */
export const LAYOUT_WIDTHS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;

/** Most findings kept per page and width, so one broken page cannot flood the summary. */
const MAX_PER_PASS = 25;

type RawFinding = { kind: LayoutKind; a: string; b?: string; detail?: string };

/**
 * Runs inside the page. Must stay self-contained: Playwright serialises the function source.
 *
 * - horizontal-scroll: the document is wider than the viewport.
 * - off-screen-control: a visible control sits left or right of the viewport, outside any
 *   horizontally scrollable container (a scrolling table is allowed to hide columns).
 * - clipped-text: an element with its own text is cut off by overflow hidden/clip, and the
 *   cut is not an intended ellipsis or line clamp.
 * - overlap: two controls or text runs intersect by at least 2px each way, neither box
 *   contains the other, and neither element contains the other in the DOM. Not counted:
 *   content scrolling under a fixed/sticky bar in the bottom half of the viewport, and
 *   foreground content over a fixed full-viewport backdrop.
 */
function auditInPage(maxPerPass: number): { findings: RawFinding[]; total: number } {
  const findings: RawFinding[] = [];
  let total = 0;
  const push = (f: RawFinding) => {
    total += 1;
    if (findings.length < maxPerPass) findings.push(f);
  };
  const vw = window.innerWidth;

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof (el as HTMLElement).className === "string" && (el as HTMLElement).className.trim()
        ? "." + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    const name =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${tag}${id}${cls}${name ? ` "${name}"` : ""}`;
  };

  const skipped = (el: Element): boolean =>
    !!el.closest('[aria-hidden="true"], [inert], svg, script, style, noscript, template, option, next-route-announcer');

  const visible = (el: Element): boolean => {
    const anyEl = el as Element & { checkVisibility?: (o: object) => boolean };
    if (anyEl.checkVisibility && !anyEl.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const inHorizontalScroller = (el: Element): boolean => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };

  const INTERACTIVE =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  const controls = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => !skipped(el) && visible(el));

  // 1. Document wider than the viewport.
  const docWidth = document.documentElement.scrollWidth;
  if (docWidth > vw + 1) {
    let widest: Element | null = null;
    let widestRight = vw;
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (skipped(el) || inHorizontalScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > widestRight + 1 && r.width > 1) {
        widest = el;
        widestRight = r.right;
      }
    }
    push({
      kind: "horizontal-scroll",
      a: widest ? describe(widest) : "document",
      detail: `scrollWidth ${docWidth}px > viewport ${vw}px`,
    });
  }

  // 2. Controls outside the viewport horizontally.
  for (const el of controls) {
    if (inHorizontalScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      push({ kind: "off-screen-control", a: describe(el), detail: `left ${Math.round(r.left)} right ${Math.round(r.right)} viewport ${vw}` });
    }
  }

  // Text runs: union of the client rects of an element's own text nodes.
  type Box = { el: Element; left: number; top: number; right: number; bottom: number };
  const textBoxes: Box[] = [];
  const textOwners = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent || !node.textContent.trim()) continue;
    const owner = node.parentElement;
    if (!owner || skipped(owner) || owner.closest(INTERACTIVE)) continue;
    if (!visible(owner)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 1 || r.height < 1) continue;
      // Only the part a reader can see counts: cut the box at every ancestor that clips
      // (overflow hidden/clip/auto/scroll), so ellipsized text is measured as drawn.
      let left = r.left;
      let top = r.top;
      let right = r.right;
      let bottom = r.bottom;
      for (let p: Element | null = owner; p && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const pr = p.getBoundingClientRect();
        if (cs.overflowX !== "visible") {
          left = Math.max(left, pr.left);
          right = Math.min(right, pr.right);
        }
        if (cs.overflowY !== "visible") {
          top = Math.max(top, pr.top);
          bottom = Math.min(bottom, pr.bottom);
        }
      }
      if (right - left < 1 || bottom - top < 1) continue;
      textBoxes.push({ el: owner, left, top, right, bottom });
    }
    textOwners.add(owner);
  }

  // 3. Clipped text.
  for (const el of Array.from(textOwners)) {
    const he = el as HTMLElement;
    const cs = getComputedStyle(he);
    const hides = (v: string) => v === "hidden" || v === "clip";
    const cutX = hides(cs.overflowX) && he.scrollWidth > he.clientWidth + 1;
    const cutY = hides(cs.overflowY) && he.scrollHeight > he.clientHeight + 1;
    if (!cutX && !cutY) continue;
    if (cutX && cs.textOverflow === "ellipsis") continue;
    if (cutY && cs.getPropertyValue("-webkit-line-clamp") && cs.getPropertyValue("-webkit-line-clamp") !== "none") continue;
    push({
      kind: "clipped-text",
      a: describe(el),
      detail: cutX ? `scrollWidth ${he.scrollWidth} > clientWidth ${he.clientWidth}` : `scrollHeight ${he.scrollHeight} > clientHeight ${he.clientHeight}`,
    });
  }

  // 4. Overlap between controls and text runs.
  const boxes: Box[] = [
    ...controls.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }),
    ...textBoxes,
  ];
  const contains = (o: Box, i: Box) =>
    o.left <= i.left + 1 && o.top <= i.top + 1 && o.right >= i.right - 1 && o.bottom >= i.bottom - 1;
  // Fixed or sticky layer an element sits in. Content scrolling under a bar anchored in the
  // bottom half (a tab bar) is normal; content under a top bar at scroll 0 is not.
  const vh = window.innerHeight;
  // A fixed layer covering most of the viewport is a backdrop (decorative photo, veil):
  // foreground content is meant to sit on top of it.
  const layerCache = new Map<Element, { layer: Element | null; bottomBar: boolean; backdrop: boolean }>();
  const layerOf = (el: Element) => {
    const hit = layerCache.get(el);
    if (hit) return hit;
    let layer: Element | null = null;
    for (let p: Element | null = el; p && p !== document.documentElement; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky") {
        layer = p;
        break;
      }
    }
    const lr = layer ? layer.getBoundingClientRect() : null;
    const bottomBar = !!lr && lr.top > vh / 2;
    const backdrop =
      !!layer && getComputedStyle(layer).position === "fixed" && !!lr && lr.width >= vw * 0.9 && lr.height >= vh * 0.9;
    const out = { layer, bottomBar, backdrop };
    layerCache.set(el, out);
    return out;
  };
  const reported = new Set<string>();
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const p = boxes[i];
      const q = boxes[j];
      if (p.el === q.el || p.el.contains(q.el) || q.el.contains(p.el)) continue;
      const lp = layerOf(p.el);
      const lq = layerOf(q.el);
      if (lp.layer !== lq.layer && (lp.bottomBar || lq.bottomBar || lp.backdrop || lq.backdrop)) continue;
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
      const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w < 2 || h < 2) continue;
      if (contains(p, q) || contains(q, p)) continue;
      const a = describe(p.el);
      const b = describe(q.el);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (reported.has(key)) continue;
      reported.add(key);
      push({ kind: "overlap", a, b, detail: `${Math.round(w)}x${Math.round(h)}px` });
    }
  }

  return { findings, total };
}

/**
 * Audits the current page at phone, tablet, and desktop widths, then restores the viewport.
 * Findings are added as `layout` annotations (read by the summary reporter) and attached as JSON.
 * With LAYOUT_STRICT=1 any finding fails the test; otherwise the check only reports.
 */
export async function auditLayout(page: Page, testInfo: TestInfo, label?: string): Promise<LayoutFinding[]> {
  const original = page.viewportSize();
  const pageLabel = label || new URL(page.url()).pathname;
  const all: LayoutFinding[] = [];
  const totals: string[] = [];
  for (const size of LAYOUT_WIDTHS) {
    await page.setViewportSize(size);
    await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => r(null)))));
    await page.waitForTimeout(250);
    const { findings, total } = await page.evaluate(auditInPage, MAX_PER_PASS);
    if (total > findings.length) totals.push(`${size.width}px: ${total} findings, first ${findings.length} kept`);
    for (const f of findings) all.push({ ...f, page: pageLabel, width: size.width });
  }
  if (original) await page.setViewportSize(original);
  for (const f of all) testInfo.annotations.push({ type: "layout", description: JSON.stringify(f) });
  if (all.length || totals.length) {
    await testInfo.attach(`layout-${pageLabel.replace(/[^a-z0-9]+/gi, "_")}.json`, {
      body: JSON.stringify({ findings: all, truncated: totals }, null, 2),
      contentType: "application/json",
    });
  }
  if (process.env.LAYOUT_STRICT === "1" && all.length) {
    const lines = all.map((f) => `${f.width}px ${f.kind}: ${f.a}${f.b ? ` ⟂ ${f.b}` : ""}${f.detail ? ` (${f.detail})` : ""}`);
    throw new Error(`Layout findings on ${pageLabel}:\n${lines.join("\n")}`);
  }
  return all;
}
