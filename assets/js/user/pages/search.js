// --- ADVANCED SEARCH WITH SUGGESTIONS ------------------------------------
// Works with cached first paint and delayed Firebase data: the data layer
// dispatches "movex:movies-updated" whenever the movie catalogue changes.
// -------------------------------------------------------------------------
(function () {
    'use strict';

    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const suggestionsDiv = document.getElementById('search-suggestions');
    const historyContainer = document.getElementById('search-history-container');
    const historyChips = document.getElementById('search-history-chips');
    const resultsDiv = document.getElementById('search-results');
    const topBox = document.getElementById('top-searches');
    const searchPageEl = document.getElementById('search-page');
    const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    let searchTimeout;

    const searchEsc = (value) => String(value == null ? '' : value)
        .replace(/[&<>"']/g, (c) => escapeMap[c]);

    const safePoster = (m) => {
        const url = String((m && (m.posterUrl || m.coverUrl)) || '').trim();
        if (!url || /^(javascript|vbscript|file):/i.test(url) || /^data:(?!image\/)/i.test(url)) return '';
        return url;
    };

    const movies = () => (typeof allMovies !== 'undefined' && allMovies && typeof allMovies === 'object')
        ? allMovies : {};

    const releaseMs = (m) => {
        if (!m) return 0;
        if (typeof getReleaseMs === 'function') {
            try { return getReleaseMs(m) || 0; } catch (e) {}
        }
        if (typeof m.releaseTs === 'number') return m.releaseTs;
        if (m.releaseDate) {
            const t = Date.parse(m.releaseDate);
            return isNaN(t) ? 0 : t;
        }
        return 0;
    };

    const isReleased = (m, now) => {
        if (!m) return false;
        const ms = releaseMs(m);
        return !m.isUpcoming || (ms > 0 && ms <= now);
    };

    function getSearchHistory() {
        try {
            if (typeof searchHistory === 'undefined' || !Array.isArray(searchHistory)) return [];
            return searchHistory
                .filter((t) => typeof t === 'string' && t.trim())
                .map((t) => t.trim())
                .slice(0, 6);
        } catch (e) { return []; }
    }

    function setSearchHistory(list) {
        const clean = list.slice(0, 6);
        try { searchHistory = clean; } catch (e) {}
        try { localStorage.setItem('movex_search_history', JSON.stringify(clean)); } catch (e) {}
    }

    function hideSuggestions() {
        if (suggestionsDiv) {
            suggestionsDiv.classList.add('hidden');
            suggestionsDiv.innerHTML = '';
        }
    }

    function renderSearchHistory() {
        if (!historyChips || !historyContainer) return;
        const list = getSearchHistory();
        historyChips.innerHTML = '';
        if (!list.length) {
            historyContainer.classList.add('hidden');
            return;
        }
        historyContainer.classList.remove('hidden');
        list.forEach((term) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'search-chip px-4 py-1.5 rounded-full text-xs font-medium text-gray-300 cursor-pointer flex items-center gap-2';
            chip.innerHTML = '<i class="fas fa-search text-[10px] text-gray-500"></i><span></span>';
            chip.querySelector('span').textContent = term;
            chip.addEventListener('click', () => {
                if (searchInput) searchInput.value = term;
                if (searchClearBtn) searchClearBtn.classList.remove('hidden');
                hideSuggestions();
                performSearch(term);
                renderTopSearches();
            });
            historyChips.appendChild(chip);
        });
    }

    function addToHistory(term) {
        const clean = String(term || '').trim();
        if (!clean) return;
        const list = getSearchHistory().filter((t) => t.toLowerCase() !== clean.toLowerCase());
        list.unshift(clean);
        setSearchHistory(list);
        renderSearchHistory();
    }

    function clearSearchHistory() {
        setSearchHistory([]);
        try { localStorage.removeItem('movex_search_history'); } catch (e) {}
        renderSearchHistory();
        renderTopSearches();
    }

    function matchMovie(m, terms, currentYear) {
        if (!m) return false;
        const textToSearch = `${m.title || ''} ${m.cast || ''} ${m.category || ''} ${m.year || ''}`.toLowerCase();
        return terms.every((t) => {
            if ((t === 'new' || t === 'latest') && parseInt(m.year, 10) === currentYear) return true;
            if ((t === 'trending' || t === 'popular') && parseFloat(m.rating) >= 7.0) return true;
            return textToSearch.includes(t);
        });
    }

    function openMovie(id, options) {
        const opts = options || {};
        const m = movies()[id];
        const title = opts.title || (m && m.title) || '';
        if (opts.addHistory) addToHistory(title);
        hideSuggestions();
        if (opts.clearInput && searchInput) {
            searchInput.value = '';
            if (searchClearBtn) searchClearBtn.classList.add('hidden');
            if (resultsDiv) resultsDiv.innerHTML = '';
            renderTopSearches();
        }
        if (typeof showMovieDetails === 'function') {
            try { showMovieDetails(id); }
            catch (e) { console.warn('[search] could not open title', e); }
        }
    }

    function showSuggestions(term) {
        if (!suggestionsDiv) return;
        const q = String(term || '').trim();
        if (!q) { hideSuggestions(); return; }

        const now = Date.now();
        const currentYear = new Date(now).getFullYear();
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        const results = Object.entries(movies())
            .filter(([, m]) => isReleased(m, now) && matchMovie(m, terms, currentYear))
            .slice(0, 5);

        if (!results.length) { hideSuggestions(); return; }

        suggestionsDiv.innerHTML = results.map(([id, m]) => {
            const poster = safePoster(m);
            const image = poster
                ? `<img src="${searchEsc(poster)}" alt="" loading="lazy">`
                : '<span class="suggestion-noimg"><i class="fas fa-film"></i></span>';
            const rating = m.rating || 'N/A';
            const category = m.category || 'Movie';
            return `
                <div class="suggestion-item" role="button" tabindex="0" data-movie-id="${searchEsc(id)}">
                    ${image}
                    <div class="suggestion-info">
                        <div class="suggestion-title">${searchEsc(m.title || 'Untitled')}</div>
                        <div class="suggestion-meta">
                            <span class="bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-bold">${searchEsc(m.year || 'N/A')}</span>
                            <span>&bull; ${searchEsc(category)}</span>
                            <span class="flex items-center text-yellow-500"><i class="fas fa-star text-[9px] mr-1"></i> ${searchEsc(rating)}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
        suggestionsDiv.classList.remove('hidden');
    }

    function performSearch(term) {
        if (!resultsDiv) return;
        const q = String(term || '').trim();
        if (historyContainer) historyContainer.classList.add('hidden');
        renderTopSearches();

        if (!q) {
            resultsDiv.innerHTML = '';
            renderSearchHistory();
            hideSuggestions();
            return;
        }

        const catalogue = movies();
        if (!Object.keys(catalogue).length) {
            resultsDiv.innerHTML = `
                <div class="col-span-full search-state">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <p>Loading titles&hellip;</p>
                    <span>Search will update automatically when content is ready.</span>
                </div>`;
            return;
        }

        const now = Date.now();
        const currentYear = new Date(now).getFullYear();
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        const results = Object.entries(catalogue)
            .filter(([, m]) => isReleased(m, now) && matchMovie(m, terms, currentYear));

        if (terms.includes('new') || terms.includes('latest')) {
            results.sort((a, b) => (parseInt(b[1].year, 10) || 0) - (parseInt(a[1].year, 10) || 0));
        }

        if (!results.length) {
            resultsDiv.innerHTML = `
                <div class="col-span-full search-state">
                    <i class="fas fa-search"></i>
                    <p>No results found</p>
                    <span>Try searching with different keywords.</span>
                </div>`;
            return;
        }

        resultsDiv.innerHTML = results.map(([id, m], index) => {
            const poster = safePoster(m);
            const image = poster
                ? `<img src="${searchEsc(poster)}" alt="${searchEsc(m.title || '')}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">`
                : '<div class="search-poster-fallback"><i class="fas fa-film"></i></div>';
            const typeLabel = m.contentType === 'series'
                ? '<span class="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow border border-white/20">SERIES</span>'
                : '';
            const delay = Math.min(index, 12) * 0.04;
            return `
                <div class="animate-pop-up cursor-pointer group relative" role="button" tabindex="0" data-movie-id="${searchEsc(id)}" style="animation-delay: ${delay}s;">
                    <div class="relative overflow-hidden rounded-xl shadow-lg border border-slate-700/50 bg-slate-800 aspect-[2/3]">
                        ${image}
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div class="w-12 h-12 bg-indigo-600/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                                <i class="fas fa-play text-white ml-1"></i>
                            </div>
                        </div>
                        ${typeLabel}
                    </div>
                    <div class="mt-2.5 px-1">
                        <p class="text-sm text-gray-200 font-bold truncate group-hover:text-indigo-400 transition-colors">${searchEsc(m.title || 'Untitled')}</p>
                        <div class="flex items-center justify-between mt-0.5">
                            <p class="text-[10px] text-gray-500 truncate mr-2">${searchEsc(m.year || 'N/A')} &bull; ${searchEsc(m.category || 'Movie')}</p>
                            <p class="text-[10px] text-gray-400 font-medium flex items-center flex-shrink-0"><i class="fas fa-star text-yellow-500 text-[8px] mr-1"></i> ${searchEsc(m.rating || 'N/A')}</p>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // --- TOP SEARCHES: a compact, ranked Top 5 instead of a long 10-row list.
    function renderTopSearches() {
        if (!topBox || !searchInput) return;
        if (searchInput.value.trim()) { topBox.classList.add('hidden'); return; }

        const now = Date.now();
        const list = Object.entries(movies())
            .filter(([, m]) => isReleased(m, now))
            .sort((a, b) => {
                const diff = (parseFloat(b[1].rating) || 0) - (parseFloat(a[1].rating) || 0);
                return diff || String(a[1].title || '').localeCompare(String(b[1].title || ''));
            })
            .slice(0, 5);

        if (!list.length) {
            topBox.innerHTML = '';
            topBox.classList.add('hidden');
            return;
        }

        topBox.innerHTML = `
            <section class="top-searches-panel" aria-labelledby="top-searches-heading">
                <div class="ts-head">
                    <h3 id="top-searches-heading" class="ts-heading">Top Searches</h3>
                    <span class="ts-kicker">Top ${list.length}</span>
                </div>
                <div class="ts-grid">
                    ${list.map(([id, m], index) => {
                        const poster = safePoster(m);
                        const image = poster
                            ? `<img src="${searchEsc(poster)}" alt="" loading="lazy">`
                            : '<span class="ts-fallback"><i class="fas fa-film"></i></span>';
                        const rank = String(index + 1).padStart(2, '0');
                        const series = m.contentType === 'series' ? '<span class="ts-series">SERIES</span>' : '';
                        return `
                            <button type="button" class="ts-card" data-movie-id="${searchEsc(id)}" aria-label="Open ${searchEsc(m.title || 'title')}">
                                <span class="ts-thumb">
                                    ${image}
                                    <span class="ts-rank">${rank}</span>
                                    <span class="ts-play"><i class="fas fa-play"></i></span>
                                </span>
                                <span class="ts-info">
                                    <span class="ts-name">${searchEsc(m.title || 'Untitled')}</span>
                                    <span class="ts-meta">${searchEsc(m.year || 'N/A')} &bull; <i class="fas fa-star"></i> ${searchEsc(m.rating || 'N/A')}</span>
                                    ${series}
                                </span>
                            </button>`;
                    }).join('')}
                </div>
            </section>`;
        topBox.classList.remove('hidden');
    }

    // Event delegation keeps IDs/titles out of inline onclick strings.
    function bindOpenOnClick(el, options) {
        if (!el) return;
        el.addEventListener('click', (e) => {
            const item = e.target.closest('[data-movie-id]');
            if (!item) return;
            openMovie(item.dataset.movieId, options);
        });
        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const item = e.target.closest('[data-movie-id]');
            if (!item) return;
            e.preventDefault();
            openMovie(item.dataset.movieId, options);
        });
    }

    bindOpenOnClick(topBox, { addHistory: false });
    bindOpenOnClick(resultsDiv, { addHistory: true });
    bindOpenOnClick(suggestionsDiv, { addHistory: true, clearInput: true });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value;
            if (searchClearBtn) searchClearBtn.classList.toggle('hidden', !term.length);
            renderTopSearches();

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (!term.trim()) {
                    if (resultsDiv) resultsDiv.innerHTML = '';
                    hideSuggestions();
                    renderSearchHistory();
                    renderTopSearches();
                    return;
                }
                showSuggestions(term);
                performSearch(term);
            }, 300);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideSuggestions();
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            if (searchInput) searchInput.value = '';
            searchClearBtn.classList.add('hidden');
            if (resultsDiv) resultsDiv.innerHTML = '';
            hideSuggestions();
            renderSearchHistory();
            renderTopSearches();
            if (searchInput) searchInput.focus();
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput || !suggestionsDiv) return;
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) hideSuggestions();
    });

    // Cached first paint and Firebase movie snapshots refresh search in place.
    window.addEventListener('movex:movies-updated', () => {
        renderTopSearches();
        const q = searchInput && searchInput.value.trim();
        if (q) performSearch(q);
    });

    if (searchPageEl && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
            if (searchPageEl.classList.contains('active')) {
                renderSearchHistory();
                renderTopSearches();
            } else {
                hideSuggestions();
            }
        }).observe(searchPageEl, { attributes: true, attributeFilter: ['class'] });
    }

    // Public names used by auth.js, inline markup and older bookmarks.
    window.renderSearchHistory = renderSearchHistory;
    window.clearSearchHistory = clearSearchHistory;
    window.renderTopSearches = renderTopSearches;
    window.performSearch = performSearch;
    window.showSuggestions = showSuggestions;
    window.selectSuggestion = (id, title) => openMovie(id, { addHistory: true, clearInput: true, title });
    window.clickSearchResult = (id, title) => openMovie(id, { addHistory: true, title });

    renderSearchHistory();
    if (searchPageEl && searchPageEl.classList.contains('active')) renderTopSearches();
})();
