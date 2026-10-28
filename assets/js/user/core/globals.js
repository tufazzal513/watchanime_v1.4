// --- GLOBAL VARS ---
let playerMode = 'direct';
let isPlaying = false;
let vimeoPlayer, ytPlayer, updateInterval;

// A broken saved value must never stop the later app scripts from loading.
let searchHistory = [];
try {
    const savedHistory = JSON.parse(localStorage.getItem('movex_search_history') || '[]');
    if (Array.isArray(savedHistory)) {
        searchHistory = savedHistory
            .filter((term) => typeof term === 'string' && term.trim())
            .map((term) => term.trim())
            .slice(0, 6);
    }
} catch (e) {
    searchHistory = [];
}

// keep the desktop top navigation clear of the app name (it starts right after the name, whatever its length)
(function () {
    const w = document.querySelector('#global-header .nf-wordmark');
    if (!w) return;
    const fit = () => { const r = w.getBoundingClientRect(); if (r.right) document.documentElement.style.setProperty('--nav-left', (Math.ceil(r.right) + 28) + 'px'); };
    if (window.ResizeObserver) new ResizeObserver(fit).observe(w);
    window.addEventListener('resize', fit); fit();
})();
