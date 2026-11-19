// EXPLAIN: cookieless visit counter (D10 v1, NFR-06, AGP-41). It sends 1 page view to GoatCounter as an image
// request: the page path, the referring site and the screen width. No cookie, no local storage, no ID.
// It counts only on the live address, and never in automated browsers (CI tests, the daily checks).
(function () {
  if (location.hostname !== 'aswinguruswamy.github.io' || navigator.webdriver) return;
  var q = 'p=' + encodeURIComponent(location.pathname) +
    '&r=' + encodeURIComponent(document.referrer) +
    '&s=' + encodeURIComponent(screen.width + ',' + screen.height + ',' + (window.devicePixelRatio || 1)) +
    '&rnd=' + Math.random().toString(36).slice(2);
  new Image().src = 'https://aswinguruswamy.goatcounter.com/count?' + q;
})();
