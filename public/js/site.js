// EXPLAIN: the small page behaviours: theme switch, Copy email, phone menu, "Show all", skills boxes.
(function () {
  var root = document.documentElement;

  // Theme switch: flips the mode and remembers it for the next visit.
  // aria-pressed tells screen readers if dark mode is on (AGP-32 AC7).
  function pressed() { document.querySelectorAll('.theme').forEach(function (b) { b.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false'); }); }
  pressed();
  document.querySelectorAll('.theme').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('theme', t); } catch (e) {}
      pressed();
    });
  });

  // One hidden status line. Screen readers read its text when it changes (AGP-30).
  var status = document.getElementById('status');
  function say(t) { if (!status) return; status.textContent = ''; setTimeout(function () { status.textContent = t; }, 50); }

  // Copy email (D30): "✓ Copied" for 5 s. If the browser blocks copy, the email shows as text.
  function copy(text, ok, fail) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fail);
    else fail();
  }
  // The address is joined here from 2 parts, so it is not plain text in the page source (NFR-05).
  document.querySelectorAll('[data-u][data-d]').forEach(function (a) {
    a.addEventListener('click', function () {
      var addr = a.getAttribute('data-u') + '@' + a.getAttribute('data-d');
      var label = a.textContent, out = a.parentElement.querySelector('.copy-out');
      copy(addr, function () {
        a.textContent = '✓ Copied'; say('Email address copied');
        setTimeout(function () { a.textContent = label; }, 5000);
      }, function () {
        say('Copy is blocked. The email address shows below the button.');
        if (out) { out.textContent = ''; var l = document.createElement('a'); l.href = 'mai' + 'lto:' + addr; l.textContent = addr; out.appendChild(l); out.hidden = false; }
      });
    });
  });
  document.querySelectorAll('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = b.textContent;
      copy(location.href, function () { b.textContent = '✓ Link copied'; say('Link copied'); setTimeout(function () { b.textContent = label; }, 5000); }, function () { b.textContent = location.href; say('Copy is blocked. The link shows on the button.'); });
    });
  });

  // Menu (phone, and desktop under 1360 px, D39 v0): opens the sidebar as a solid panel (D30 v1); Esc, the ✕ or a tap outside closes it.
  var menu = document.getElementById('menu'), open = document.querySelector('.menu-btn'), scrim = null;
  function close() {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open'); if (scrim) { scrim.remove(); scrim = null; }
    open.setAttribute('aria-expanded', 'false'); open.focus();
  }
  if (menu && open) {
    open.addEventListener('click', function () {
      menu.classList.add('open'); open.setAttribute('aria-expanded', 'true');
      scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.addEventListener('click', close);
      document.body.appendChild(scrim);
      var first = menu.querySelector('.nav a'); if (first) first.focus();
    });
    menu.querySelector('.menu-close').addEventListener('click', close);
    menu.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      // Focus trap (AGP-55 AC5): Tab and Shift+Tab stay inside the open menu.
      if (e.key !== 'Tab') return;
      var f = [].filter.call(menu.querySelectorAll('a[href], button:not([disabled])'), function (x) { return x.offsetParent !== null && !x.hidden; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (!menu.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }

  // "Show all 7 PM tools" on the phone.
  document.querySelectorAll('.more').forEach(function (b) {
    b.addEventListener('click', function () {
      var row = document.getElementById(b.getAttribute('aria-controls'));
      // The button hides, so focus moves to the first card that was hidden. Focus is not lost.
      var shown = [].filter.call(row.children, function (li) { return li.offsetParent !== null; }).length;
      row.classList.remove('clip'); b.hidden = true;
      var nx = row.children[shown] && row.children[shown].querySelector('a, button');
      if (nx) nx.focus();
    });
  });

  // Card rows (D38 v0) and the top line (D42 v0): the ‹ › buttons move the row by about one card. A button is off at the end of the row.
  // The buttons hide when the whole row fits.
  document.querySelectorAll('.row-nav').forEach(function (nav) {
    var row = document.getElementById(nav.getAttribute('data-row'));
    if (!row) return;
    var prev = nav.querySelector('[data-dir="-1"]'), next = nav.querySelector('[data-dir="1"]');
    function step() { var el = row.firstElementChild; var w = el ? el.getBoundingClientRect().width + 20 : 260; return Math.min(w, row.clientWidth * 0.9); }
    function update() {
      var max = row.scrollWidth - row.clientWidth;
      nav.hidden = max <= 1;
      prev.disabled = row.scrollLeft <= 1;
      next.disabled = row.scrollLeft >= max - 1;
    }
    [prev, next].forEach(function (b) {
      b.addEventListener('click', function () {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        row.scrollBy({ left: Number(b.getAttribute('data-dir')) * step(), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // Side menu on the main page: mark the section that is on the screen now (issue 9).
  // Rule: the current section is the lowest one whose top is above 30% of the screen. Apps and Experience
  // sit side by side, so on a tie the item that is already marked (for example after a click) stays.
  var links = document.querySelectorAll('.nav a[href^="#"]');
  if (links.length) {
    var items = [];
    links.forEach(function (a) { var el = document.getElementById(a.getAttribute('href').slice(1)); if (el) items.push({ a: a, el: el }); });
    var mark = function (a) { links.forEach(function (x) { x.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); };
    links.forEach(function (a) { a.addEventListener('click', function () { mark(a); }); });
    var busy = false;
    var pick = function () {
      busy = false;
      var line = window.innerHeight * 0.3, top = -Infinity, best = [];
      items.forEach(function (it) {
        var t = it.el.getBoundingClientRect().top;
        if (t <= line) { if (t > top + 2) { top = t; best = [it]; } else if (Math.abs(t - top) <= 2) best.push(it); }
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) best = [items[items.length - 1]];
      if (!best.length) best = [items[0]];
      var now = document.querySelector('.nav a[aria-current]');
      for (var k = 0; k < best.length; k++) if (best[k].a === now) return;
      mark(best[0].a);
    };
    window.addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(pick); } }, { passive: true });
    pick();
  }

  // Skills: all boxes open on a wide screen; on a phone they fold (first one open).
  var wide = window.matchMedia('(min-width: 761px)');
  function skills() {
    document.querySelectorAll('.skills details').forEach(function (d, i) { if (wide.matches) d.open = true; else d.open = i === 0; });
  }
  skills(); wide.addEventListener('change', skills);
  document.querySelectorAll('.skills summary').forEach(function (s) {
    s.addEventListener('click', function (e) { if (wide.matches) e.preventDefault(); });
  });
})();
