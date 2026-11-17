// EXPLAIN: the small page behaviours: theme switch, Copy email, phone menu, "Show all", skills boxes.
(function () {
  var root = document.documentElement;

  // Theme switch: flips the mode and remembers it for the next visit.
  document.querySelectorAll('.theme').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('theme', t); } catch (e) {}
    });
  });

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
        a.textContent = '✓ Copied';
        setTimeout(function () { a.textContent = label; }, 5000);
      }, function () {
        if (out) { out.textContent = ''; var l = document.createElement('a'); l.href = 'mai' + 'lto:' + addr; l.textContent = addr; out.appendChild(l); out.hidden = false; }
      });
    });
  });
  document.querySelectorAll('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = b.textContent;
      copy(location.href, function () { b.textContent = '✓ Link copied'; setTimeout(function () { b.textContent = label; }, 5000); }, function () { b.textContent = location.href; });
    });
  });

  // Phone menu: opens the sidebar as a glass panel; Esc, the ✕ or a tap outside closes it.
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // "Show all 7 PM tools" on the phone.
  document.querySelectorAll('.more').forEach(function (b) {
    b.addEventListener('click', function () {
      var row = document.getElementById(b.getAttribute('aria-controls'));
      row.classList.remove('clip'); b.hidden = true;
    });
  });

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
