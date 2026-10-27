// --- RENDER HOME PAGE ---
window.homeFilter = window.homeFilter || 'all';
window.setHomeFilter = (f) => { window.homeFilter = (window.homeFilter === f) ? 'all' : f; renderHomePage(); };
const htmlEsc = (t) => {
    const f = (typeof esc === 'function') ? esc : null;
    const s = String(t == null ? '' : t);
    return f ? f(s) : s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
};
const isInList = (id) => {
    if (typeof window.inMyList === 'function') return window.inMyList(id);
    return !!(window.myListIds || {})[id];
};
const renderHomePage = () => {
    const container = document.getElementById('movie-carousels-container');
    if(!container) return;
    const _movies = (typeof allMovies !== 'undefined' && allMovies) ? allMovies : {};
    const _cats = (typeof allCategories !== 'undefined' && allCategories) ? allCategories : {};
    container.innerHTML = '';

    const now = new Date();
    const getReleaseMs = (m) => {
        if(!m) return 0;
        if(typeof m.releaseTs === 'number') return m.releaseTs;
        if(m.releaseDate){
            const t = Date.parse(m.releaseDate);
            return isNaN(t) ? 0 : t;
        }
        return 0;
    };
    const allMoviesArr = Object.entries(_movies);

    const upcomingMovies = allMoviesArr.filter(([_, m]) => {
        const releaseMs = getReleaseMs(m);
        return !!m.isUpcoming && releaseMs > now.getTime();
    });

    // Premium Movie Card Logic
    const rowsOf = (arr) => arr.filter(([_, m]) => homeFilter === 'all' || (homeFilter === 'series' ? m.contentType === 'series' : m.contentType !== 'series'));
    const released = (m) => { const ms = getReleaseMs(m); return !m.isUpcoming || (ms && ms <= now.getTime()); };
    document.querySelectorAll('#home-chips button[data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === homeFilter));

    const pct = (id) => { const p = (window.progressMap || {})[id]; return p && p.d ? Math.min(100, Math.round(p.t / p.d * 100)) : 0; };
    const movieCard = (id, m, isUp = false, rank = 0, prog = 0) => `
        <div class="nf-card ${rank ? 'nf-top' : ''}" onclick="showMovieDetails('${id}')">
            ${rank ? `<span class="nf-rank">${rank}</span>` : ''}
            <div class="nf-poster">
                <img src="${htmlEsc(m.posterUrl)}" loading="lazy" alt="">
                ${m.contentType === 'series' ? '<span class="nf-badge">SERIES</span>' : ''}
                ${isUp ? '<div class="nf-soon"><i class="fas fa-clock"></i> Coming Soon</div>' : ''}
                ${prog ? `<div class="nf-prog"><i style="width:${prog}%"></i></div>` : ''}
                <div class="nf-hover">
                    <div class="nf-hbtns"><span class="nf-play"><i class="fas fa-play"></i></span><span class="nf-plus ${isInList(id) ? 'on' : ''}" data-mylist="${id}" onclick="toggleMyList('${id}', event)" title="My List"><i class="fas ${isInList(id) ? 'fa-check' : 'fa-plus'}"></i></span></div>
                    <p class="nf-ht">${htmlEsc(m.title)}</p>
                    <p class="nf-hm"><b>${htmlEsc(m.rating || 'N/A')}</b> <i class="fas fa-star"></i> · ${htmlEsc(m.year || '')} · ${htmlEsc(m.category || '')}</p>
                </div>
            </div>
        </div>`;

    const row = (title, arr, opts = {}) => {
        if (!arr.length) return '';
        const cards = arr.map(([id, m], i) => movieCard(id, m, opts.up, opts.top ? i + 1 : 0, opts.prog ? pct(id) : 0)).join('');
        const click = opts.cat ? `onclick="openCategoryMovies('${opts.cat.replace(/'/g, "\\'")}')"` : '';
        return `<section class="nf-row"><h2 class="nf-rt" ${click}>${htmlEsc(title)}${opts.cat ? ' <i class="fas fa-chevron-right"></i>' : ''}</h2><div class="nf-strip no-scrollbar">${cards}</div></section>`;
    };

    const allRel = rowsOf(allMoviesArr).filter(([_, m]) => released(m));
    const num = (v) => parseFloat(v) || 0;
    const when = (m) => getReleaseMs(m) || (parseInt(m.year) ? Date.UTC(parseInt(m.year), 0, 1) : 0);
    const top10 = [...allRel].sort((a, b) => num(b[1].rating) - num(a[1].rating)).slice(0, 10);
    const fresh = [...allRel].sort((a, b) => when(b[1]) - when(a[1])).slice(0, 15);
    const topRated = [...allRel].filter(([_, m]) => num(m.rating) > 0).sort((a, b) => num(b[1].rating) - num(a[1].rating)).slice(0, 15);

    const cw = Object.entries(window.progressMap || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).map(([id]) => [id, _movies[id]]).filter(([_, m]) => m);
    const mine = Object.keys(window.myListIds || {}).map(id => [id, _movies[id]]).filter(([_, m]) => m);
    let out = row('Continue Watching', rowsOf(cw), { prog: true })
            + row('My List', rowsOf(mine))
            + row('Top 10 Today', top10, { top: true })
            + row('New Releases', fresh)
            + row('Top Rated', topRated)
            + row('Coming Soon', rowsOf(upcomingMovies), { up: true });

    const existingCatNames = Object.values(_cats).map(c => c.name);
    const catsToRender = [...Object.values(_cats)];
    if (allRel.some(([_, m]) => !m.category || !existingCatNames.includes(m.category))) catsToRender.push({ name: 'Uncategorized' });
    catsToRender.forEach(cat => {
        const movies = allRel.filter(([_, m]) => cat.name === 'Uncategorized'
            ? (!m.category || !existingCatNames.includes(m.category)) : m.category === cat.name);
        out += row(cat.name, movies, { cat: cat.name });
    });
    container.innerHTML = out || '<p class="nf-empty">Nothing here yet.</p>';
};
