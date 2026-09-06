/* Shared product-book trail + white/black theme. Load in <head> on hub HTML. */
(function () {
  var KEY = "tos_bw";
  var css =
    ".hub-trail{font-family:var(--mono),ui-monospace,monospace;font-size:11px;letter-spacing:.02em;padding:7px 14px;border-bottom:1px solid var(--line-soft);display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--ground);color:var(--ink-soft);position:sticky;top:56px;z-index:39}" +
    ".hub-trail a,.hub-trail .crumblink{color:var(--accent-ink);text-decoration:underline;text-underline-offset:2px;background:none;border:none;padding:0;cursor:pointer;font:inherit}" +
    ".hub-trail .here{color:var(--ink-faint)}" +
    ".hub-trail .sep{color:var(--line);pointer-events:none}" +
    'html[data-bw="white"],html[data-bw="white"]:root,html[data-bw="white"][data-theme],html[data-bw="white"][data-theme="light"],html[data-bw="white"][data-theme="dark"]{color-scheme:light;' +
    "--ground:#FFFFFF;--surface:#F4F4F4;--sunk:#EBEBEB;--raised:#FFFFFF;" +
    "--ink:#111111;--ink-soft:#3A3A3A;--ink-faint:#6A6A6A;" +
    "--line:#C8C8C8;--line-soft:#E6E6E6;" +
    "--accent:#111111;--accent-ink:#000000;--accent-wash:#EFEFEF;" +
    "--amber:#333333;--amber-wash:#F0F0F0;" +
    "--crimson:#222222;--crimson-wash:#F2F2F2;" +
    "--sky:#444444;--sky-wash:#F3F3F3;" +
    "--violet:#333333;--violet-wash:#F0F0F0;" +
    "--on-tint:#FFFFFF;" +
    "--shadow:0 1px 2px rgba(0,0,0,.06),0 12px 28px -14px rgba(0,0,0,.18)}" +
    'html[data-bw="black"],html[data-bw="black"]:root,html[data-bw="black"][data-theme],html[data-bw="black"][data-theme="light"],html[data-bw="black"][data-theme="dark"]{color-scheme:dark;' +
    "--ground:#000000;--surface:#121212;--sunk:#0A0A0A;--raised:#1A1A1A;" +
    "--ink:#F2F2F2;--ink-soft:#B5B5B5;--ink-faint:#7A7A7A;" +
    "--line:#2A2A2A;--line-soft:#1C1C1C;" +
    "--accent:#FFFFFF;--accent-ink:#FFFFFF;--accent-wash:#1F1F1F;" +
    "--amber:#C8C8C8;--amber-wash:#1A1A1A;" +
    "--crimson:#D0D0D0;--crimson-wash:#181818;" +
    "--sky:#C0C0C0;--sky-wash:#161616;" +
    "--violet:#CACACA;--violet-wash:#171717;" +
    "--on-tint:#000000;" +
    "--shadow:0 1px 2px rgba(0,0,0,.5),0 14px 36px -14px rgba(0,0,0,.7)}" +
    "html[data-bw] button.hot.primary,html[data-bw] a.btn.primary,html[data-bw] .tabs a.on{color:var(--on-tint);background:var(--accent);border-color:var(--accent)}";

  if (!document.getElementById("hub-chrome-css")) {
    var st = document.createElement("style");
    st.id = "hub-chrome-css";
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  function mode() {
    try {
      return localStorage.getItem(KEY) === "black" ? "black" : "white";
    } catch (e) {
      return "white";
    }
  }

  function apply() {
    var m = mode();
    var root = document.documentElement;
    root.setAttribute("data-bw", m);
    root.setAttribute("data-theme", m === "black" ? "dark" : "light");
    document.querySelectorAll("[data-hub-theme]").forEach(function (b) {
      b.textContent = m === "black" ? "White" : "Black";
      b.setAttribute("aria-label", "Switch to " + (m === "black" ? "white" : "black") + " theme");
    });
  }

  function toggle() {
    var next = mode() === "black" ? "white" : "black";
    try {
      localStorage.setItem(KEY, next);
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
