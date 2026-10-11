let allCards = [];
let selectedTag = null;

// 1. Загружаем индексный список, а затем файлы карточек с защитой от единичных ошибок
async function loadCards() {
    try {
        const response = await fetch('list.json');
        if (!response.ok) throw new Error('Не удалось загрузить list.json');
        const cardFiles = await response.json();
        
        // Используем Promise.allSettled, чтобы битый файл одной карточки не ломал весь сайт
        const results = await Promise.allSettled(
            cardFiles.map(file => fetch(`cards/${file}`).then(res => {
                if (!res.ok) throw new Error(`Ошибка загрузки ${file}`);
                return res.json();
            }))
        );
        
        // Собираем только успешно загруженные карточки
        allCards = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        renderTags();
        renderCards();
    } catch (error) {
        console.error('Критическая ошибка загрузки данных:', error);
        const grid = document.getElementById('cards-grid');
        if (grid) grid.innerHTML = '<p style="text-align:center;">Ошибка загрузки каталога. Попробуйте обновить страницу.</p>';
    }
}

// 2. Вывод карточек на страницу
function renderCards() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;
    
    const searchValues = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    grid.innerHTML = '';
    
    const filtered = allCards.filter(card => {
        const matchesTitleOrDesc = card.title?.toLowerCase().includes(searchValues) || 
                                   card.description?.toLowerCase().includes(searchValues);
        
        const matchesCardTags = card.tags?.some(tag => tag.toLowerCase().includes(searchValues));
        const matchesSearch = matchesTitleOrDesc || matchesCardTags;
        const matchesTag = !selectedTag || card.tags?.includes(selectedTag);
        
        return matchesSearch && matchesTag;
    });

    // --- Управление кнопкой сброса ---
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        if (searchValues.length > 0 || selectedTag !== null) {
            resetBtn.classList.remove('hidden');
        } else {
            resetBtn.classList.add('hidden');
        }
    }

    // --- Показ сообщения "Ничего не найдено" ---
    const noResults = document.getElementById('no-results');
    if (noResults) {
        if (filtered.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }

    filtered.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        
        const tagsHtml = card.tags?.map(t => `<button class="card-tag ${selectedTag === t ? 'active-tag' : ''}" data-tag="${t}">${t}</button>`).join('') || '';
        
        cardEl.innerHTML = `
            <a href="${card.url}" target="_blank" class="card-link">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </a>
            <div class="card-tags">${tagsHtml}</div>
        `;

        // Клик по тегам внутри карточки (теперь с возможностью сброса)
        cardEl.querySelectorAll('.card-tag').forEach(tagButton => {
            tagButton.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedTag = e.target.getAttribute('data-tag');
                const tagInput = document.getElementById('tag-search-input');

                // Если кликнули по уже выбранному тегу — сбрасываем его
                if (selectedTag === clickedTag) {
                    selectedTag = null;
                    if (tagInput) tagInput.value = '';
                } else {
                    selectedTag = clickedTag;
                    if (tagInput) tagInput.value = clickedTag;
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderCards();
            });
        });

        grid.appendChild(cardEl);
    });
}

// 3. Окно поиска по тегам
function renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;

    const allTagsSet = new Set();
    allCards.forEach(card => card.tags?.forEach(tag => allTagsSet.add(tag)));
    const allTags = Array.from(allTagsSet).sort((a, b) => a.localeCompare(b)); 

    tagsContainer.innerHTML = `
        <div class="tag-search-box">
            <input type="text" id="tag-search-input" placeholder="Поиск по тегам..." autocomplete="off">
            <div id="tag-dropdown" class="tag-dropdown-list"></div>
        </div>
    `;

    const tagInput = document.getElementById('tag-search-input');
    const tagDropdown = document.getElementById('tag-dropdown');

    function showDropdown(filteredTags) {
        tagDropdown.innerHTML = '';
        
        if (filteredTags.length === 0) {
            tagDropdown.style.display = 'none';
            return;
        }

        filteredTags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            if (selectedTag === tag) item.classList.add('selected');
            item.textContent = tag;
            
            // Используем mousedown вместо click, чтобы событие успевало отработать до focusout/blur
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Предотвращаем потерю фокуса с инпута
                if (selectedTag === tag) {
                    selectedTag = null;
                    tagInput.value = '';
                } else {
                    selectedTag = tag;
                    tagInput.value = tag;
                }
                tagDropdown.style.display = 'none';
                renderCards(); 
            });

            tagDropdown.appendChild(item);
        });

        tagDropdown.style.display = 'block';
    }

    tagInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            selectedTag = null; 
            tagDropdown.style.display = 'none';
            renderCards();
            return;
        }
        const matchedTags = allTags.filter(tag => tag.toLowerCase().includes(query));
        showDropdown(matchedTags);
    });

    tagInput.addEventListener('focus', () => {
        if (!tagInput.value.trim()) {
            showDropdown(allTags);
        }
    });

    // Надежное закрытие списка при потере фокуса или клике вне элемента
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tag-search-box')) {
            tagDropdown.style.display = 'none';
        }
    });
}

// Функция задержки (Debounce) для оптимизации поиска при вводе
function debounce(func, timeout = 200) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

document.getElementById('search-input')?.addEventListener('input', debounce(renderCards));

document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    selectedTag = null;
    const tagInput = document.getElementById('tag-search-input');
    if (tagInput) tagInput.value = '';
    renderCards();
});

// Запуск
loadCards();

// Тёмная тема
const themeCheckbox = document.getElementById('theme-checkbox');
const themeText = document.querySelector('.theme-text');

if (localStorage.getItem('theme') === 'dark' && themeCheckbox) {
    document.body.classList.add('dark-theme');
    themeCheckbox.checked = true;
    if (themeText) themeText.textContent = '☀️';
}

themeCheckbox?.addEventListener('change', function() {
    if (this.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        if (themeText) themeText.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        if (themeText) themeText.textContent = '🌙';
    }
});
