/* Shared product-book trail + light/dark forest theme. Load in <head> on hub HTML. */
(function () {
  var KEY = "tos_theme";
  var LEGACY = "tos_bw";
  var css =
    ".hub-trail{font-family:var(--mono),ui-monospace,monospace;font-size:11px;letter-spacing:.02em;padding:7px 14px;border-bottom:1px solid var(--line-soft);display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--ground);color:var(--ink-soft);position:sticky;top:56px;z-index:39}" +
    ".hub-trail a,.hub-trail .crumblink{color:var(--accent-ink);text-decoration:underline;text-underline-offset:2px;background:none;border:none;padding:0;cursor:pointer;font:inherit}" +
    ".hub-trail .here{color:var(--ink-faint)}" +
    ".hub-trail .sep{color:var(--line);pointer-events:none}" +
    'html[data-theme="light"],html[data-theme="light"]:root{color-scheme:light;' +
    "--ground:#F3F6F0;--surface:#FBFCF9;--sunk:#EBEFE6;--raised:#FFFFFF;" +
    "--ink:#182019;--ink-soft:#3D4640;--ink-faint:#5C675F;" +
    "--line:#D6DCCF;--line-soft:#E4E9DD;" +
    "--accent:#2E7D4F;--accent-ink:#1E5738;--accent-wash:#E4EFE5;" +
    "--amber:#AF6C22;--amber-wash:#F5E9D8;" +
    "--crimson:#A4384A;--crimson-wash:#F3E0E1;" +
    "--sky:#2C6C88;--sky-wash:#DDEAEE;" +
    "--violet:#6A4C93;--violet-wash:#E9E2F1;" +
    "--on-tint:#182019;" +
    "--shadow:0 1px 2px rgba(24,32,25,.04),0 12px 34px -12px rgba(24,32,25,.18)}" +
    'html[data-theme="dark"],html[data-theme="dark"]:root{color-scheme:dark;' +
    "--ground:#0C110E;--surface:#171E19;--sunk:#10150F;--raised:#1E251F;" +
    "--ink:#E6ECE3;--ink-soft:#A4AEA4;--ink-faint:#6C776E;" +
    "--line:#26302A;--line-soft:#1D251F;" +
    "--accent:#5CB57C;--accent-ink:#8CD3A5;--accent-wash:#173224;" +
    "--amber:#D3944F;--amber-wash:#332413;" +
    "--crimson:#D06E7A;--crimson-wash:#331A1E;" +
    "--sky:#6BA7C2;--sky-wash:#122831;" +
    "--violet:#A98FD6;--violet-wash:#241C33;" +
    "--on-tint:#0c130e;" +
    "--shadow:0 1px 2px rgba(0,0,0,.4),0 14px 40px -14px rgba(0,0,0,.6)}" +
    "html[data-theme] button.hot.primary,html[data-theme] a.btn.primary,html[data-theme] .tabs a.on{color:var(--on-tint);background:var(--accent);border-color:var(--accent)}";

  if (!document.getElementById("hub-chrome-css")) {
    var st = document.createElement("style");
    st.id = "hub-chrome-css";
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  function mode() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === "dark" || t === "light") return t;
      if (localStorage.getItem(LEGACY) === "black") return "dark";
    } catch (e) {}
    return "light";
  }

  function apply() {
    var m = mode();
    var root = document.documentElement;
    root.removeAttribute("data-bw");
    root.setAttribute("data-theme", m);
    root.style.colorScheme = m;
    document.querySelectorAll("[data-hub-theme]").forEach(function (b) {
      b.textContent = m === "dark" ? "Light" : "Dark";
      b.setAttribute("aria-label", "Switch to " + (m === "dark" ? "light" : "dark") + " theme");
    });
  }

  function toggle() {
    var next = mode() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
      localStorage.removeItem(LEGACY);
    } catch (e) {}
    apply();
  }

  function bindTheme(btn, extra) {
    if (!btn) return;
    btn.setAttribute("data-hub-theme", "1");
    if (!btn.getAttribute("data-hub-bound")) {
      btn.setAttribute("data-hub-bound", "1");
      btn.addEventListener("click", function () {
        toggle();
        if (extra && extra.onChange) extra.onChange(mode());
      });
    }
    apply();
  }

  function ensureTrail() {
    var el = document.getElementById("hubTrail");
    if (!el) {
      el = document.createElement("nav");
      el.id = "hubTrail";
      el.className = "hub-trail";
      el.setAttribute("aria-label", "You are here");
      var bar = document.getElementById("top") || document.querySelector(".topbar");
      if (bar && bar.parentNode) bar.parentNode.insertBefore(el, bar.nextSibling);
      else if (document.body) document.body.insertBefore(el, document.body.firstChild);
      else return null;
    }
    var bar = document.getElementById("top") || document.querySelector(".topbar");
    if (bar) el.style.top = Math.round(bar.getBoundingClientRect().height) + "px";
    return el;
  }

  function paintTrail(items) {
    var el = ensureTrail();
    if (!el || !items || !items.length) return;
    var html = "";
    items.forEach(function (it, i) {
      if (i) html += '<span class="sep">/</span>';
      if (it.href) html += '<a href="' + it.href + '">' + it.label + "</a>";
      else if (it.goto) {
        var a = ' type="button" class="crumblink" data-goto="' + it.goto + '"';
        if (it.flow) a += ' data-flow="' + it.flow + '"';
        if (it.domain) a += ' data-domain="' + it.domain + '"';
        if (it.screen) a += ' data-screen-id="' + it.screen + '"';
        if (it.layer) a += ' data-layer="' + it.layer + '"';
        if (it.role) a += ' data-role="' + it.role + '"';
        if (it.clearFlow) a += ' data-clear-flow="1"';
        html += "<button" + a + ">" + it.label + "</button>";
      } else html += '<span class="here">' + it.label + "</span>";
    });
    el.innerHTML = html;
  }

  function boot(opts) {
    opts = opts || {};
    bindTheme(document.getElementById(opts.themeId || "themeBtn"), opts);
    if (opts.trail) paintTrail(opts.trail);
    else ensureTrail();
  }

  window.TutorOSHub = {
    product: "product-viewer.html",
    apply: apply,
    toggle: toggle,
    bindTheme: bindTheme,
    paintTrail: paintTrail,
    ensureTrail: ensureTrail,
    boot: boot,
    mode: mode,
  };

  apply();
})();
