// --- SMART CATEGORY ICONS LOGIC ---
const getCategoryTheme = (name) => {
    const n = name.toLowerCase();
    if(n.includes('action')) return { icon: 'fa-fighter-jet', grad: 'from-red-600 to-orange-500', text: 'text-white', shadow: 'shadow-red-500/30' };
    if(n.includes('comedy') || n.includes('funny')) return { icon: 'fa-laugh-squint', grad: 'from-amber-500 to-yellow-500', text: 'text-white', shadow: 'shadow-amber-500/30' };
    if(n.includes('horror') || n.includes('scary') || n.includes('ghost')) return { icon: 'fa-ghost', grad: 'from-gray-800 to-slate-900', text: 'text-gray-200', shadow: 'shadow-slate-500/30' };
    if(n.includes('romance') || n.includes('love')) return { icon: 'fa-heart', grad: 'from-pink-600 to-rose-400', text: 'text-white', shadow: 'shadow-pink-500/30' };
    if(n.includes('sci-fi') || n.includes('science')) return { icon: 'fa-rocket', grad: 'from-cyan-600 to-blue-500', text: 'text-white', shadow: 'shadow-cyan-500/30' };
    if(n.includes('drama')) return { icon: 'fa-masks-theater', grad: 'from-purple-600 to-indigo-500', text: 'text-white', shadow: 'shadow-purple-500/30' };
    if(n.includes('thriller') || n.includes('crime')) return { icon: 'fa-user-secret', grad: 'from-slate-700 to-gray-800', text: 'text-gray-200', shadow: 'shadow-gray-500/30' };
    if(n.includes('animation') || n.includes('anime') || n.includes('cartoon')) return { icon: 'fa-dragon', grad: 'from-teal-500 to-emerald-400', text: 'text-white', shadow: 'shadow-teal-500/30' };
    if(n.includes('fantasy') || n.includes('magic')) return { icon: 'fa-hat-wizard', grad: 'from-fuchsia-600 to-purple-500', text: 'text-white', shadow: 'shadow-fuchsia-500/30' };
    if(n.includes('adventure')) return { icon: 'fa-mountain', grad: 'from-green-600 to-emerald-500', text: 'text-white', shadow: 'shadow-green-500/30' };
    if(n.includes('documentary')) return { icon: 'fa-video', grad: 'from-stone-600 to-neutral-500', text: 'text-white', shadow: 'shadow-stone-500/30' };
    if(n.includes('family') || n.includes('kids')) return { icon: 'fa-child', grad: 'from-sky-500 to-cyan-400', text: 'text-white', shadow: 'shadow-sky-500/30' };
    if(n.includes('web') || n.includes('series') || n.includes('tv')) return { icon: 'fa-tv', grad: 'from-indigo-600 to-blue-600', text: 'text-white', shadow: 'shadow-indigo-500/30' };
    if(n.includes('music') || n.includes('musical')) return { icon: 'fa-music', grad: 'from-rose-500 to-pink-600', text: 'text-white', shadow: 'shadow-rose-500/30' };
    if(n.includes('history') || n.includes('war')) return { icon: 'fa-monument', grad: 'from-yellow-700 to-amber-800', text: 'text-white', shadow: 'shadow-yellow-700/30' };
    if(n.includes('sports')) return { icon: 'fa-volleyball-ball', grad: 'from-orange-500 to-red-500', text: 'text-white', shadow: 'shadow-orange-500/30' };

    // Default Theme
    return { icon: 'fa-film', grad: 'from-blue-600 to-indigo-600', text: 'text-white', shadow: 'shadow-blue-500/30' };
};

// --- RENDER CATEGORIES ---
const renderCategoriesPage = () => {
    const container = document.getElementById('categories-grid');
    if(!container) return;

    const existingCatNames = Object.values(allCategories).map(c => c.name);
    const orphanedMovies = Object.values(allMovies).filter(m => {
        const releaseMs = getReleaseMs(m);
        const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= Date.now());
        return isReleased && (!m.category || !existingCatNames.includes(m.category));
    });

    const catsToRender = [...Object.values(allCategories)];
    if (orphanedMovies.length > 0) {
        catsToRender.push({ name: 'Uncategorized' });
    }

    container.innerHTML = catsToRender.map((cat, i) => {
        const theme = getCategoryTheme(cat.name);
        return `
        <div onclick="openCategoryMovies('${cat.name.replace(/'/g, "\\'")}')" class="animate-pop-up bg-gradient-to-br ${theme.grad} flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg ${theme.shadow} text-center cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group border border-white/10" style="animation-delay: ${i * 0.05}s;">
            <!-- Glass shine effect -->
            <div class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div class="w-14 h-14 bg-black/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-black/30 transition-colors backdrop-blur-sm border border-white/10">
                <i class="fas ${theme.icon} text-3xl ${theme.text} drop-shadow-md"></i>
            </div>
            <span class="font-bold text-sm sm:text-base ${theme.text} drop-shadow-md tracking-wide">${cat.name}</span>
        </div>`;
    }).join('');
};
