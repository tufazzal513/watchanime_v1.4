// --- RENDER CATEGORY MOVIES ---
window.openCategoryMovies = (categoryName) => {
    document.getElementById('selected-category-title').textContent = categoryName;
    const container = document.getElementById('category-movies-grid');
    const now = new Date();
    const existingCatNames = Object.values(allCategories).map(c => c.name);

    const results = Object.entries(allMovies).filter(([_, m]) => {
        const releaseMs = getReleaseMs(m);
        const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= now.getTime());
        if (categoryName === 'Uncategorized') {
            return (!m.category || !existingCatNames.includes(m.category)) && isReleased;
        }
        return m.category === categoryName && isReleased;
    });

    if (results.length > 0) {
        container.innerHTML = results.map(([id, m], index) => {
            const typeLabel = (m.contentType === 'series') ? '<span class="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow border border-white/20">SERIES</span>' : '';
            return `
            <div class="animate-pop-up cursor-pointer group relative" onclick="showMovieDetails('${id}')" style="animation-delay: ${index * 0.05}s;">
                <div class="relative overflow-hidden rounded-xl shadow-lg border border-slate-700/50 bg-slate-800 aspect-[2/3]">
                    <img src="${m.posterUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                    <!-- Play Icon Overlay -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div class="w-12 h-12 bg-blue-600/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)] transform scale-75 group-hover:scale-100 transition-transform">
                            <i class="fas fa-play text-white ml-1"></i>
                        </div>
                    </div>
                    ${typeLabel}
                </div>
                <div class="mt-2.5 px-1">
                    <p class="text-sm text-gray-200 font-bold truncate group-hover:text-blue-400 transition-colors">${m.title}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">${m.year || 'N/A'} • <i class="fas fa-star text-yellow-500 text-[8px] mx-0.5"></i> ${m.rating || 'N/A'}</p>
                </div>
            </div>`;
        }).join('');
    } else {
        container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 opacity-60">
            <i class="fas fa-film text-4xl text-gray-600 mb-3"></i>
            <p class="text-gray-400 font-medium text-sm">No content found in this category.</p>
        </div>`;
    }
    showPage('category-movies-page');
};
