// EXPLAIN: the Workshop (internal name: Build Overlay, D12, D29). Standalone script, loaded by a script tag.
// The "View Build Progress" tag in the top bar is the switch (D46 v0, D45 v1). When on, it reads data/progress.json and shows:
//  - a strip under the top bar: page build %, snapshot time, legend (D30 item 5, NFR-08); no review panel (D47 v0);
//  - a pie on each card [data-epic] and each container [data-group] (D24-D26; "–" when no work is planned, D35);
//  - a 55% screen on the page background (D28).
// States: data OK; old data (snapshot older than 24 h); no data (file missing or broken).
// Nothing is saved in the browser (NFR-12). Open the page with ?workshop to start with the Workshop on.
(function () {
  var btn = document.querySelector('[data-workshop]');
  if (!btn) return;
  var root = document.documentElement;
  var base = btn.getAttribute('data-base') || '';
  var data = null, state = 'off', strip = null;
  var DAY = 86400000;

  function pct(e) { return e && e.total > 0 ? Math.round((100 * e.done) / e.total) : null; }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return 'unknown';
    return d.toLocaleString('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
  }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

  function pie(target, entry, name) {
    var old = target.querySelector(':scope > .pie, :scope > .panel-head > .pie'); if (old) old.remove();
    var p = pct(entry);
    var d = el('span', 'pie');
    d.setAttribute('role', 'img');
    if (p === null) { d.classList.add('none'); d.textContent = '–'; d.setAttribute('aria-label', name + ': no work planned yet'); }
    else { d.style.setProperty('--p', p); d.textContent = p + '%'; d.setAttribute('aria-label', name + ': ' + p + '% built'); }
    var head = target.querySelector(':scope > .panel-head');
    if (head && target.hasAttribute('data-group')) { d.classList.add('inline'); head.querySelector('h2').after(d); }
    else target.appendChild(d);
  }

  function nameOf(x) {
    var t = x.querySelector('.tile-body strong, h2, h1');
    return t ? t.textContent.trim() : 'Section';
  }

  function render() {
    document.querySelectorAll('[data-epic]').forEach(function (x) {
      var e = data && data.epics ? data.epics[x.getAttribute('data-epic')] : null;
      pie(x, e || { done: 0, total: 0 }, nameOf(x));
    });
    document.querySelectorAll('[data-group]').forEach(function (x) {
      var g = data && data.groups ? data.groups[x.getAttribute('data-group')] : null;
      pie(x, g || { done: 0, total: 0 }, nameOf(x));
    });
  }

  function buildStrip() {
    strip = el('section', 'ws-strip');
    strip.setAttribute('aria-label', 'Workshop: build progress');
    strip.setAttribute('role', 'region');
    var title = el('strong', 'ws-name display', 'WORKSHOP');
    var msg = el('span', 'ws-msg');
    msg.setAttribute('aria-live', 'polite');
    var legend = el('span', 'ws-legend', 'LIVE = first version out · % = share of the full plan built');
    strip.append(title, msg, legend);
    var top = document.querySelector('.top');
    top.after(strip);
  }

  // AGP-35 AC3: the strip shows a loading line while progress.json loads.
  function loadingStrip() {
    var msg = strip.querySelector('.ws-msg');
    strip.classList.remove('old', 'none');
    var r = strip.querySelector('.ws-retry'); if (r) r.remove();
    msg.textContent = 'Loading the build data…';
  }

  function updateStrip() {
    var msg = strip.querySelector('.ws-msg');
    strip.classList.remove('old', 'none');
    var old = strip.querySelector('.ws-retry'); if (old) old.remove();
    if (state === 'none') {
      strip.classList.add('none');
      msg.textContent = 'No build data yet. The pies show "–".';
      // AGP-35 AC4: only "Try again". It loads progress.json again and shows the loading line first.
      var retry = el('button', 'btn ws-retry', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', function () { refresh(true); });
      msg.after(retry);
      return;
    }
    var page = pct(data.page);
    var when = fmtTime(data.takenAt);
    msg.textContent = 'Page built: ' + (page === null ? '–' : page + '%') + ' · Data from ' + when;
    if (state === 'old') { strip.classList.add('old'); msg.textContent += ' · Old data (more than 24 hours)'; }
  }

  function load() {
    var url = base + '/data/progress.json?t=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.epics || !j.groups || !j.page) throw new Error('bad file');
        data = j;
        state = Date.now() - new Date(j.takenAt).getTime() > DAY ? 'old' : 'ok';
      })
      .catch(function () { data = null; state = 'none'; });
  }

  function refresh(focusRetry) {
    loadingStrip();
    return load().then(function () {
      if (!strip) return; // the Workshop was turned off while it loaded
      document.querySelectorAll('.pie').forEach(function (p) { p.remove(); });
      updateStrip();
      render();
      var r = strip.querySelector('.ws-retry'); if (focusRetry && r) r.focus();
    });
  }
  function on() {
    btn.setAttribute('aria-pressed', 'true');
    root.classList.add('ws-on');
    if (!strip) buildStrip();
    return refresh(false);
  }
  function off() {
    btn.setAttribute('aria-pressed', 'false');
    root.classList.remove('ws-on');
    if (strip) { strip.remove(); strip = null; }
    document.querySelectorAll('.pie').forEach(function (p) { p.remove(); });
  }

  btn.addEventListener('click', function () { if (btn.getAttribute('aria-pressed') === 'true') off(); else on(); });
  if (/[?&]workshop\b/.test(location.search)) on();
})();
