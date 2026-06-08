(function () {
  var STALE_MARKERS = [
    'index-DrX_eSIh', 'index-DU6ne3u9', 'index-C6b11YcK',
    'index-CC7OqkEB', 'index-CORKCWhl',
  ];

  function currentIndexScript() {
    var el = document.querySelector('script[src*="/assets/index-"]');
    return (el && el.getAttribute('src')) || '';
  }

  function purgeAndReload() {
    var done = function () { window.location.reload(); };
    var step = Promise.resolve();
    if ('serviceWorker' in navigator) {
      step = step.then(function () {
        return navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        });
      });
    }
    if ('caches' in window) {
      step = step.then(function () {
        return caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        });
      });
    }
    step.then(done).catch(done);
  }

  function guard() {
    var src = currentIndexScript();
    if (STALE_MARKERS.some(function (m) { return src.indexOf(m) > -1; })) {
      purgeAndReload();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else guard();
})();
