// --- USER DATA -----------------------------------------------------------
// Robust startup: cached first paint, independent rendering, error callbacks,
// a watchdog with a Retry button, and automatic re-attach when the connection
// comes back. Data loading is owned here (not by a timer in auth.js).
// -------------------------------------------------------------------------
const DATA_CACHE_KEY = 'movex_data_cache_v2';
const DATA_WAIT_MS   = 12000;

let __dataAttached   = false;
let __dataRefs       = [];
let __dataWatchdog   = null;
let __reconnectTimer = null;
let __moviesReady    = false;
let __dataRendered   = false;
let __lastBanners    = null;
let __connectedCb    = null;
let __onlineHandler  = null;

// Render helpers: never let one broken/missing renderer kill the whole start.
const renderHomeSafe = () => {
    try { if (typeof renderHomePage === 'function') renderHomePage(); }
    catch (e) { console.warn('[data] renderHomePage failed', e); }
};
const renderCategoriesSafe = () => {
    try { if (typeof renderCategoriesPage === 'function') renderCategoriesPage(); }
    catch (e) { console.warn('[data] renderCategoriesPage failed', e); }
};
const renderBannersSafe = (b) => {
    try { if (typeof renderBanners === 'function') renderBanners(b); }
    catch (e) { console.warn('[data] renderBanners failed', e); }
};
const renderSocialsSafe = (s) => {
    try { if (typeof renderSocials === 'function') renderSocials(s); }
    catch (e) { console.warn('[data] renderSocials failed', e); }
};
const renderNotificationsSafe = (n) => {
    try { if (typeof renderNotifications === 'function') renderNotifications(n); }
    catch (e) { console.warn('[data] renderNotifications failed', e); }
};
const renderMyListSafe = () => {
    try { if (typeof renderMyListPage === 'function') renderMyListPage(); }
    catch (e) { console.warn('[data] renderMyListPage failed', e); }
};
const dataNotifyMovies = () => {
    // Search listens for this to refresh cached/live Top Searches and results.
    try { window.dispatchEvent(new Event('movex:movies-updated')); }
    catch (e) {
        try { if (typeof renderTopSearches === 'function') renderTopSearches(); }
        catch (_) {}
    }
};

function dataCacheSave() {
    try {
        const payload = JSON.stringify({ t: Date.now(), movies: allMovies,
                                         categories: allCategories, banners: __lastBanners });
        if (payload.length > 3000000) return;   // stay well below the localStorage quota
        localStorage.setItem(DATA_CACHE_KEY, payload);
    } catch (e) {}
}

function dataCacheLoad() {
    try {
        const raw = localStorage.getItem(DATA_CACHE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        if (!d || typeof d.movies !== 'object' || !d.movies || !Object.keys(d.movies).length) return false;
        allMovies = d.movies || {};
        allCategories = d.categories || {};
        __lastBanners = d.banners || null;
        renderHomeSafe();
        renderCategoriesSafe();
        if (__lastBanners) renderBannersSafe(__lastBanners);
        dataNotifyMovies();
        return true;
    } catch (e) { return false; }
}

function dataShowRetry() {
    const c = document.getElementById('movie-carousels-container');
    if (!c) return;
    c.innerHTML = '<div style="text-align:center;padding:44px 16px;color:#9ca3af">'
        + '<div style="font-size:38px;margin-bottom:12px">&#9888;&#65039;</div>'
        + '<p style="margin:0 0 18px;font-size:14px;line-height:1.6">Content could not be loaded.<br>'
        + 'Check your connection and try again.</p>'
        + '<button type="button" onclick="retryLoadData()" style="background:var(--nf,#e50914);color:#fff;'
        + 'border:0;border-radius:8px;padding:11px 26px;font-weight:700;font-size:14px;cursor:pointer">Retry</button>'
        + '</div>';
}

function dataShowRefreshStrip() {
    const c = document.getElementById('movie-carousels-container');
    if (!c || c.querySelector('[data-offline-strip]')) return;
    const bar = document.createElement('div');
    bar.setAttribute('data-offline-strip', '1');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;'
        + 'background:#2a2a2a;border:1px solid #3a3a3a;border-radius:8px;padding:10px 14px;margin-bottom:14px;'
        + 'font-size:12px;color:#9ca3af';
    bar.innerHTML = '<span>Showing saved content &middot; couldn\'t reach the server.</span>'
        + '<button type="button" onclick="retryLoadData()" style="background:transparent;color:#fff;'
        + 'border:1px solid #555;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer">Retry</button>';
    c.insertBefore(bar, c.firstChild);
}

function dataScheduleWatchdog() {
    // One absolute deadline per start: reconnect storms must not push it back.
    if (__dataWatchdog) return;
    __dataWatchdog = setTimeout(() => {
        __dataWatchdog = null;
        if (__moviesReady) return;
        if (__dataRendered) dataShowRefreshStrip();
        else dataShowRetry();
    }, DATA_WAIT_MS);
}

function dataDetach() {
    __dataRefs.forEach(([ref, ev, cb]) => { try { ref.off(ev, cb); } catch (e) {} });
    __dataRefs = [];
    __dataAttached = false;
}

const dataOnError = (path) => (err) => {
    console.warn('[data] listener "' + path + '" failed:', err && (err.message || err.code || err));
    dataScheduleWatchdog();
};

function startupRoute() {
    if (window.__startupRouteDone) return;
    window.__startupRouteDone = true;
    try {
        const pending  = sessionStorage.getItem('pending_movie');
        const lastPage = localStorage.getItem('last_page_id');
        const lastMovie = localStorage.getItem('last_movie_id');
        if (pending) {
            sessionStorage.removeItem('pending_movie');
            if (allMovies[pending] && typeof showMovieDetails === 'function') showMovieDetails(pending, true);
            else if (typeof showCustomModal === 'function') showCustomModal('alert', 'This title is not available anymore.');
        } else if (lastPage === 'movie-details-page' && lastMovie && allMovies[lastMovie]
                   && typeof showMovieDetails === 'function') {
            showMovieDetails(lastMovie, false);
        }
    } catch (e) { console.warn('[data] startup route failed', e); }
}

function dataAttach() {
    dataDetach();
    __dataAttached = true;
    dataScheduleWatchdog();

    const bind = (path, success) => {
        const ref = db.ref(path);
        const cb = ref.on('value', success, dataOnError(path));
        __dataRefs.push([ref, 'value', cb]);
    };

    bind('movies', (s) => {
        __moviesReady = true;
        __dataRendered = true;
        clearTimeout(__dataWatchdog); __dataWatchdog = null;
        const raw = s.val() || {};
        allMovies = {};
        Object.keys(raw).forEach(id => { if (raw[id] && !raw[id].isPrivate) allMovies[id] = raw[id]; });
        dataCacheSave();
        renderHomeSafe();
        renderMyListSafe();
        if (__lastBanners) renderBannersSafe(__lastBanners);
        dataNotifyMovies();
        startupRoute();
    });

    // Categories are optional for the home page: render even if they never arrive.
    bind('categories', (s) => {
        allCategories = s.val() || {};
        dataCacheSave();
        renderCategoriesSafe();
        renderHomeSafe();
    });

    bind('banners', (s) => {
        __lastBanners = s.val();
        dataCacheSave();
        renderBannersSafe(__lastBanners);
    });

    bind('socialLinks',   (s) => renderSocialsSafe(s.val()));
    bind('notifications', (s) => renderNotificationsSafe(s.val()));
}

function setupReconnect() {
    if (!__connectedCb) {
        try {
            __connectedCb = db.ref('.info/connected').on('value', (s) => {
                if (s.val() === true && !__moviesReady) {
                    clearTimeout(__reconnectTimer);
                    __reconnectTimer = setTimeout(() => { if (!__moviesReady) dataAttach(); }, 1500);
                }
            });
        } catch (e) {}
    }
    if (!__onlineHandler) {
        __onlineHandler = () => { if (!__moviesReady) dataAttach(); };
        window.addEventListener('online', __onlineHandler);
    }
}

function startDataLoad() {
    if (__dataAttached) return;                 // idempotent
    __dataRendered = dataCacheLoad();           // instant first paint from last good snapshot
    dataAttach();
    setupReconnect();
}

window.startDataLoad = startDataLoad;
window.loadInitialData = startDataLoad;         // backwards-compatible name
window.retryLoadData = () => {
    __moviesReady = false;
    clearTimeout(__dataWatchdog); __dataWatchdog = null;   // fresh deadline for a manual retry
    const c = document.getElementById('movie-carousels-container');
    if (c) {
        const strip = c.querySelector('[data-offline-strip]');
        if (strip) strip.remove();
    }
    dataAttach();
    setupReconnect();
};

// Start on auth (this module is loaded last, so no script-loading race).
if (typeof auth !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged((u) => {
        if (u) startDataLoad();
        else {
            dataDetach();
            __moviesReady = false;
            __dataRendered = false;
            window.__startupRouteDone = false;
        }
    });
}
