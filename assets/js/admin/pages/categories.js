db.ref('categories').on('value', snapshot => {
    const data = snapshot.val() || {};
    allCategoriesCache = data;

    const container = document.getElementById('categories-list');
    if(container) {
        container.innerHTML = Object.entries(data).map(([id, cat]) => `
            <li class="group flex justify-between items-center bg-gray-900/60 border border-gray-700 hover:border-cyan-500/50 p-4 rounded-xl shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all transform hover:-translate-y-1">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg bg-cyan-900/30 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <i class="fas fa-tag text-xs"></i>
                    </div>
                    <span class="font-bold text-gray-200 tracking-wide truncate pr-2">${cat.name}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onclick="editCategory('${id}')" class="text-gray-500 hover:text-white bg-gray-800 hover:bg-blue-600 w-8 h-8 rounded-full transition-all flex items-center justify-center shadow-inner border border-gray-700 hover:border-blue-500" title="Edit Category">
                        <i class="fas fa-pen text-xs"></i>
                    </button>
                    <button type="button" onclick="deleteCategory('${id}')" class="text-gray-500 hover:text-white bg-gray-800 hover:bg-red-600 w-8 h-8 rounded-full transition-all flex items-center justify-center shadow-inner border border-gray-700 hover:border-red-500" title="Delete Category">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </li>
        `).join('');
    }

    const movieCategorySelect = document.getElementById('movie-category');
    if (movieCategorySelect) {
        const currentSelection = movieCategorySelect.value;
        movieCategorySelect.innerHTML = '<option value="">Select Category</option>' + Object.values(data).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (currentSelection) movieCategorySelect.value = currentSelection;
    }

    const catFilter = document.getElementById('category-filter');
    if(catFilter) {
        const current = catFilter.value;
        catFilter.innerHTML = '<option value="all">All Categories</option>' + Object.values(data).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if(current !== 'all') catFilter.value = current;
    }
});

document.getElementById('category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('category-edit-id').value;
    const nameInput = document.getElementById('category-name');
    const newName = nameInput.value.trim();
    const oldName = nameInput.dataset.oldName;

    if (!newName) return;

    if (editId) {
        db.ref(`categories/${editId}`).update({ name: newName }).then(() => {
            // Update all movies that had the old category name
            if(oldName && oldName !== newName) {
                db.ref('movies').once('value', snap => {
                    const movies = snap.val() || {};
                    const updates = {};
                    Object.entries(movies).forEach(([mId, m]) => {
                        if(m.category === oldName) {
                            updates[`movies/${mId}/category`] = newName;
                        }
                    });
                    if(Object.keys(updates).length > 0) {
                        db.ref().update(updates);
                    }
                });
            }

            resetCategoryForm();
            alert('Category updated successfully!');
        });
    } else {
        db.ref('categories').push({ name: newName }).then(() => {
            resetCategoryForm();
            alert('Category added successfully!');
        });
    }
});

function resetCategoryForm() {
    document.getElementById('category-form').reset();
    document.getElementById('category-edit-id').value = '';
    const nameInput = document.getElementById('category-name');
    nameInput.dataset.oldName = '';
    document.querySelector('#category-form button[type="submit"]').innerHTML = '<i class="fas fa-plus mr-2"></i> Add Category';
}

window.editCategory = (id) => {
    const cat = allCategoriesCache[id];
    if(!cat) return;
    document.getElementById('category-edit-id').value = id;
    const nameInput = document.getElementById('category-name');
    nameInput.value = cat.name;
    nameInput.dataset.oldName = cat.name;
    document.querySelector('#category-form button[type="submit"]').innerHTML = '<i class="fas fa-save mr-2"></i> Update Category';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCategory = (id) => {
    const cat = allCategoriesCache[id];
    if(!cat) return;
    const oldName = cat.name;

    if (confirm(`Are you sure you want to delete the category "${oldName}"?\n\nMovies under this category will be marked as 'Uncategorized'.`)) {
        db.ref(`categories/${id}`).remove().then(() => {
            // Turn all movies of this category into Uncategorized
            db.ref('movies').once('value', snap => {
                const movies = snap.val() || {};
                const updates = {};
                Object.entries(movies).forEach(([mId, m]) => {
                    if(m.category === oldName) {
                        updates[`movies/${mId}/category`] = 'Uncategorized';
                    }
                });
                if(Object.keys(updates).length > 0) {
                    db.ref().update(updates);
                }
            });
        });
    }
};
