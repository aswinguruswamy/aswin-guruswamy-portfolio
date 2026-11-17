// EXPLAIN: sets light or dark mode before the page paints: the saved choice first, else the device setting.
(function () {
  var t = null;
  try { t = localStorage.getItem('theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
