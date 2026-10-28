/**
 * MoveX User - bootstrap
 * 1) Injects every <div data-include="..."> (partials + pages) into the DOM.
 * 2) Loads the app scripts one by one, in the original order.
 * The zero-delay scripts (theme-boot.js, splash-boot.js) stay synchronous in index.html.
 * NOTE: needs a web server (Firebase Hosting, `python3 -m http.server`, ...);
 *       fetch() does not work when the file is opened with file://
 */
(function () {
  var here = document.currentScript.src;                    // .../assets/js/user/bootstrap.js
  var SITE_ROOT = new URL('../../../', here).href;          // site root
  var JS_ROOT = new URL('./', here).href;                   // .../assets/js/user/

  var SCRIPTS = [
      "../shared/firebase-config.js",
      "../shared/taxonomy.js",
      "core/firebase-init.js",
      "core/app-details.js",
      "core/state.js",
      "core/ui-kit.js",
      "core/utils.js",
      "core/error-logger.js",
      "core/carousel-state.js",
      "core/presence.js",
      "core/user-record.js",
      "features/auth-forms.js",
      "core/auth.js",
      "core/globals.js",
      "features/user-lists.js",
      "features/broken-link-reporter.js",
      "pages/home-carousel.js",
      "pages/home.js",
      "pages/notifications.js",
      "pages/search.js",
      "pages/categories.js",
      "pages/category-movies.js",
      "core/modal.js",
      "pages/watch-player.js",
      "core/theme-engine.js",
      "core/user-data.js"
  ];

  function fail(err) {
    console.error(err);
    try {
      var old = document.getElementById('startup-error');
      if (old) old.remove();
      var box = document.createElement('div');
      box.id = 'startup-error';
      box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#141414;color:#fff;'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'gap:18px;padding:28px;text-align:center;font-family:system-ui,-apple-system,sans-serif';
      var ico = document.createElement('div');
      ico.textContent = '\u26A0\uFE0F'; ico.style.fontSize = '40px';
      var msg = document.createElement('p');
      msg.textContent = 'The app could not start: ' + (err && err.message ? err.message : 'unknown error')
        + '. Check your connection and try again.';
      msg.style.cssText = 'margin:0;color:#d1d5db;font-size:15px;line-height:1.5;max-width:430px';
      var btn = document.createElement('button');
      btn.textContent = 'Reload';
      btn.style.cssText = 'background:#e50914;color:#fff;border:0;border-radius:8px;'
        + 'padding:12px 28px;font-weight:700;font-size:15px;cursor:pointer';
      btn.onclick = function () { location.reload(); };
      box.appendChild(ico); box.appendChild(msg); box.appendChild(btn);
      document.body.appendChild(box);
    } catch (e) {}
  }

  function loadIncludes() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    return Promise.all(nodes.map(function (n) {
      return fetch(SITE_ROOT + n.getAttribute('data-include')).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + n.getAttribute('data-include'));
        return r.text();
      });
    })).then(function (parts) {
      nodes.forEach(function (n, i) { n.outerHTML = parts[i]; });
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; reject(new Error('Timed out loading ' + src)); }
      }, 20000);
      s.src = src;
      s.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve(); } };
      s.onerror = function () {
        if (!done) { done = true; clearTimeout(timer); reject(new Error('Cannot load ' + src)); }
      };
      document.body.appendChild(s);
    });
  }

  loadIncludes().then(function () {
    return SCRIPTS.reduce(function (p, f) { return p.then(function () { return loadScript(JS_ROOT + f); }); }, Promise.resolve());
  }).then(function () {
    var ok = false;
    try {
      ok = typeof firebase !== 'undefined' && typeof auth !== 'undefined'
           && typeof db !== 'undefined' && typeof startDataLoad === 'function';
    } catch (e) { ok = false; }
    if (!ok) fail(new Error('a required script or the Firebase SDK did not load'));
  }).catch(fail);
})();
