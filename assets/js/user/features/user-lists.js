// --- MY LIST + CONTINUE WATCHING (stored in Firebase under the user's own account) ---
window.myListIds = {};       // { movieId: addedAt }
window.progressMap = {};     // { movieId: {ep, season, t, d, at} }
let _listUid = null, _listRef = null, _progRef = null;

auth.onAuthStateChanged(user => {
    if (_listRef) _listRef.off(); if (_progRef) _progRef.off();
    myListIds = {}; progressMap = {}; _listUid = user ? user.uid : null;
    if (!user) return;
    _listRef = db.ref('users/' + user.uid + '/myList');
    _progRef = db.ref('users/' + user.uid + '/progress');
    _listRef.on('value', s => { myListIds = s.val() || {}; refreshListUI(); });
    _progRef.on('value', s => { progressMap = s.val() || {}; if (typeof renderHomePage === 'function' && Object.keys(allMovies).length) renderHomePage(); });
});

window.inMyList = (id) => !!myListIds[id];
window.toggleMyList = (id, ev) => {
    if (ev) ev.stopPropagation();
    if (!_listUid || !id) return;
    const ref = db.ref('users/' + _listUid + '/myList/' + id);
    (myListIds[id] ? ref.remove() : ref.set(firebase.database.ServerValue.TIMESTAMP)).catch(() => {
        if (typeof showCustomModal === 'function') showCustomModal('alert', 'Could not update My List. Please try again.');
    });
};
window.refreshListUI = () => {
    document.querySelectorAll('[data-mylist]').forEach(b => {
        const on = inMyList(b.dataset.mylist);
        b.classList.toggle('on', on);
        const i = b.querySelector('i'); if (i) i.className = on ? 'fas fa-check' : 'fas fa-plus';
        const t = b.querySelector('.lbl'); if (t) t.textContent = on ? 'In My List' : 'Add to list';
    });
    renderMyListPage();
    if (typeof renderHomePage === 'function' && Object.keys(allMovies).length) renderHomePage();
};
window.renderMyListPage = () => {
    const grid = document.getElementById('mylist-grid'), empty = document.getElementById('mylist-empty');
    if (!grid) return;
    const items = Object.entries(myListIds).sort((a, b) => (b[1] || 0) - (a[1] || 0)).map(([id]) => [id, allMovies[id]]).filter(([_, m]) => m);
    empty.classList.toggle('hidden', items.length > 0);
    grid.innerHTML = items.map(([id, m]) => `
        <div class="nf-gcard" onclick="showMovieDetails('${id}')">
            <img src="${esc(m.posterUrl)}" loading="lazy" alt="">
            <button class="nf-x" onclick="toggleMyList('${id}', event)" aria-label="Remove"><i class="fas fa-times"></i></button>
            <p>${esc(m.title)}</p>
        </div>`).join('');
};

// --- watch progress (resume) ---
let _lastSave = 0;
window.saveProgress = (movieId, season, ep, t, d, force) => {
    if (!_listUid || !movieId || !(d > 0) || !(t >= 0)) return;
    const now = Date.now();
    if (!force && now - _lastSave < 8000) return;
    _lastSave = now;
    const ref = db.ref('users/' + _listUid + '/progress/' + movieId);
    if (t / d > 0.95) { ref.remove(); return; }       // finished: drop it
    ref.set({ season: season || null, ep: ep == null ? null : ep, t: Math.floor(t), d: Math.floor(d), at: firebase.database.ServerValue.TIMESTAMP });
};
