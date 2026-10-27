// --- ADVANCED SEARCH WITH SUGGESTIONS ---
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const suggestionsDiv = document.getElementById('search-suggestions');
const historyContainer = document.getElementById('search-history-container');
let searchTimeout;

function renderSearchHistory() {
    const container = document.getElementById('search-history-chips');
    container.innerHTML = '';
    if(searchHistory.length > 0) {
        historyContainer.classList.remove('hidden');
        searchHistory.forEach(term => {
            const chip = document.createElement('div');
            chip.className = 'search-chip px-4 py-1.5 rounded-full text-xs font-medium text-gray-300 cursor-pointer flex items-center gap-2';
            chip.innerHTML = `<i class="fas fa-search text-[10px] text-gray-500"></i> ${term}`;
            chip.addEventListener('click', () => {
                searchInput.value = term;
                searchClearBtn.classList.remove('hidden');
                performSearch(term);
                suggestionsDiv.classList.add('hidden');
            });
            container.appendChild(chip);
        });
    } else {
        historyContainer.classList.add('hidden');
    }
}

function addToHistory(term) {
    if(!term.trim()) return;
    searchHistory = searchHistory.filter(t => t.toLowerCase() !== term.toLowerCase());
    searchHistory.unshift(term);
    if(searchHistory.length > 6) searchHistory.pop();
    localStorage.setItem('movex_search_history', JSON.stringify(searchHistory));
}

window.clearSearchHistory = function() {
    searchHistory = [];
    localStorage.removeItem('movex_search_history');
    renderSearchHistory();
}

function matchMovie(m, terms, currentYear) {
    // Advanced Multi-keyword match logic (Checks title, cast, category, year)
    const textToSearch = `${m.title} ${m.cast || ''} ${m.category || ''} ${m.year || ''}`.toLowerCase();
    return terms.every(t => {
        if ((t === 'new' || t === 'latest') && parseInt(m.year) === currentYear) return true;
        if ((t === 'trending' || t === 'popular') && parseFloat(m.rating) >= 7.0) return true;
        return textToSearch.includes(t);
    });
}

function showSuggestions(term) {
    if(term.length < 1) {
        suggestionsDiv.classList.add('hidden');
        return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const terms = term.toLowerCase().split(' ').filter(t => t.trim() !== '');

    const results = Object.entries(allMovies)
        .filter(([_, m]) => {
            const releaseMs = getReleaseMs(m);
            const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= now.getTime());
            return isReleased && matchMovie(m, terms, currentYear);
        })
        .slice(0, 5); // Show top 5

    if(results.length === 0) {
        suggestionsDiv.classList.add('hidden');
        return;
    }

    suggestionsDiv.innerHTML = results.map(([id, m]) => `
        <div class="suggestion-item" onclick="selectSuggestion('${id}', '${m.title.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')">
            <img src="${m.posterUrl}" alt="${m.title}">
            <div class="suggestion-info">
                <div class="suggestion-title">${m.title}</div>
                <div class="suggestion-meta">
                    <span class="bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-bold">${m.year || 'N/A'}</span>
                    <span>• ${m.category || 'Movie'}</span>
                    <span class="flex items-center text-yellow-500"><i class="fas fa-star text-[9px] mr-1"></i> ${m.rating || 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
    suggestionsDiv.classList.remove('hidden');
}

window.selectSuggestion = (id, title) => {
    addToHistory(title);
    showMovieDetails(id);
    suggestionsDiv.classList.add('hidden');
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
};

// Input & Clear Handlers
searchInput.addEventListener('input', (e) => {
    const term = e.target.value;
    if(term.length > 0) searchClearBtn.classList.remove('hidden');
    else searchClearBtn.classList.add('hidden');

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if(term.length < 1) {
            document.getElementById('search-results').innerHTML = '';
            renderSearchHistory();
            suggestionsDiv.classList.add('hidden');
            return;
        }
        showSuggestions(term);
        performSearch(term);
    }, 300);
});

searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    document.getElementById('search-results').innerHTML = '';
    suggestionsDiv.classList.add('hidden');
    renderSearchHistory();
    searchInput.focus();
});

document.addEventListener('click', (e) => {
    if(!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
    }
});

function performSearch(term) {
    const container = document.getElementById('search-results');
    historyContainer.classList.add('hidden');
    const now = new Date();
    const currentYear = now.getFullYear();
    const terms = term.toLowerCase().split(' ').filter(t => t.trim() !== '');

    const results = Object.entries(allMovies).filter(([_, m]) => {
        const releaseMs = getReleaseMs(m);
        const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= now.getTime());
        if(!isReleased) return false;
        return matchMovie(m, terms, currentYear);
    });

    if (results.length > 0) {
        // If searching for "new", sort by year descending
        if(terms.includes('new') || terms.includes('latest')) {
            results.sort((a,b) => (b[1].year || 0) - (a[1].year || 0));
        }

        container.innerHTML = results.map(([id, m], index) => {
            const typeLabel = (m.contentType === 'series') ? '<span class="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow border border-white/20">SERIES</span>' : '';
            return `
            <div class="animate-pop-up cursor-pointer group relative" onclick="clickSearchResult('${id}', '${m.title.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')" style="animation-delay: ${index * 0.05}s;">
                <div class="relative overflow-hidden rounded-xl shadow-lg border border-slate-700/50 bg-slate-800 aspect-[2/3]">
                    <img src="${m.posterUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                    <!-- Play Overlay -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div class="w-12 h-12 bg-indigo-600/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                            <i class="fas fa-play text-white ml-1"></i>
                        </div>
                    </div>
                    ${typeLabel}
                </div>
                <div class="mt-2.5 px-1">
                    <p class="text-sm text-gray-200 font-bold truncate group-hover:text-indigo-400 transition-colors">${m.title}</p>
                    <div class="flex items-center justify-between mt-0.5">
                        <p class="text-[10px] text-gray-500 truncate mr-2">${m.year || 'N/A'} • ${m.category || 'Movie'}</p>
                        <p class="text-[10px] text-gray-400 font-medium flex items-center flex-shrink-0"><i class="fas fa-star text-yellow-500 text-[8px] mr-1"></i> ${m.rating || 'N/A'}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    } else {
        container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 opacity-60">
            <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <i class="fas fa-search text-2xl text-gray-500"></i>
            </div>
            <p class="text-gray-300 font-bold text-lg mb-1">No results found</p>
            <p class="text-gray-500 text-xs">Try searching with different keywords.</p>
        </div>`;
    }
}

window.clickSearchResult = function(id, title) {
    addToHistory(title);
    showMovieDetails(id);
    suggestionsDiv.classList.add('hidden');
};


// --- NETFLIX-STYLE "TOP SEARCHES" (built from existing movie data; shown when search box is empty) ---
const renderTopSearches = () => {
    const box = document.getElementById('top-searches');
    if (!box || !searchInput) return;
    if (searchInput.value.trim()) { box.classList.add('hidden'); return; }
    const now = Date.now();
    const list = Object.entries(allMovies)
        .filter(([_, m]) => !m.isUpcoming || (m.releaseDate && Date.parse(m.releaseDate) <= now))
        .sort((a, b) => (parseFloat(b[1].rating) || 0) - (parseFloat(a[1].rating) || 0))
        .slice(0, 10);
    if (!list.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.innerHTML = '<h3 class="ts-title">Top Searches</h3>' + list.map(([id, m]) => `
        <div class="ts-row" onclick="showMovieDetails('${id}')">
            <img src="${esc(m.posterUrl)}" alt="" loading="lazy">
            <span class="ts-name">${esc(m.title)}</span>
            <span class="ts-play"><i class="fas fa-play"></i></span>
        </div>`).join('');
};
const searchPageEl = document.getElementById('search-page');
if (searchPageEl) new MutationObserver(() => { if (searchPageEl.classList.contains('active')) renderTopSearches(); }).observe(searchPageEl, { attributes: true, attributeFilter: ['class'] });
if (searchInput) searchInput.addEventListener('input', renderTopSearches);
