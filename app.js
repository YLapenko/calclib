let allCards = [];
let selectedTag = null;

// 1. Загружаем индексный список, а затем все файлы карточек
async function loadCards() {
    try {
        const response = await fetch('list.json');
        const cardFiles = await response.json();
        
        // Загружаем каждый json-файл из папки cards параллельно
        const promises = cardFiles.map(file => fetch(`cards/${file}`).then(res => res.json()));
        allCards = await Promise.all(promises);
        
        renderTags();
        renderCards();
    } catch (error) {
        console.error('Ошибка загрузки карточек:', error);
    }
}

// 2. Вывод карточек на страницу
function renderCards() {
    const grid = document.getElementById('cards-grid');
    const searchValues = document.getElementById('search-input').value.toLowerCase();
    grid.innerHTML = '';
    
    const filtered = allCards.filter(card => {
        const matchesSearch = card.title.toLowerCase().includes(searchValues) || 
                              card.description.toLowerCase().includes(searchValues);
        const matchesTag = !selectedTag || card.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
    });

    if (filtered.length === 0) {
        document.getElementById('no-results').classList.remove('hidden');
    } else {
        document.getElementById('no-results').classList.add('hidden');
    }

    filtered.forEach(card => {
        const cardEl = document.createElement('a');
        cardEl.className = 'card';
        cardEl.href = card.url;
        cardEl.target = '_blank'; // открывать в новой вкладке
        
        const tagsHtml = card.tags.map(t => `<span class="card-tag">${t}</span>`).join('');
        
        cardEl.innerHTML = `
            <h3>${card.title}</h3>
            <p>${card.description}</p>
            <div class="card-tags">${tagsHtml}</div>
        `;
        grid.appendChild(cardEl);
    });
}

// 3. Сбор уникальных тегов и настройка окна поиска по тегам
function renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;

    // Сбор уникальных тегов из загруженных карточек
    const allTagsSet = new Set();
    allCards.forEach(card => card.tags.forEach(tag => allTagsSet.add(tag)));
    const allTags = Array.from(allTagsSet);

    // Очищаем контейнер и создаем структуру поиска внутри него
    tagsContainer.innerHTML = `
        <div class="tag-search-box" style="position: relative; max-width: 300px; margin: 0 auto 20px;">
            <input 
                type="text" 
                id="tag-search-input" 
                placeholder="Поиск по тегам..." 
                style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
            >
            <div 
                id="tag-dropdown" 
                style="position: absolute; width: 100%; max-height: 200px; overflow-y: auto; background: white; border: 1px solid #ccc; border-top: none; display: none; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 0 0 4px 4px;"
            ></div>
        </div>
    `;

    const tagInput = document.getElementById('tag-search-input');
    const tagDropdown = document.getElementById('tag-dropdown');

    // Функция отрисовки элементов внутри выпадающего списка
    function showDropdown(filteredTags) {
        tagDropdown.innerHTML = '';
        
        if (filteredTags.length === 0) {
            tagDropdown.style.display = 'none';
            return;
        }

        filteredTags.forEach(tag => {
            const item = document.createElement('div');
            item.textContent = tag;
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.color = '#333';
            item.style.borderBottom = '1px solid #f0f0f0';
            
            // Если этот тег сейчас выбран, выделим его визуально
            if (selectedTag === tag) {
                item.style.backgroundColor = '#e0e0e0';
                item.style.fontWeight = 'bold';
            }

            // Подсветка при наведении
            item.onmouseenter = () => item.style.backgroundColor = '#f5f5f5';
            item.onmouseleave = () => item.style.backgroundColor = (selectedTag === tag) ? '#e0e0e0' : 'transparent';

            // Клик по тегу из списка
            item.addEventListener('click', () => {
                if (selectedTag === tag) {
                    selectedTag = null; // Сброс, если кликнули на уже выбранный
                    tagInput.value = '';
                } else {
                    selectedTag = tag;  // Выбираем новый тег
                    tagInput.value = tag; // Записываем его в поле
                }
                tagDropdown.style.display = 'none';
                renderCards(); // Перерисовываем карточки (ваша функция)
            });

            tagDropdown.appendChild(item);
        });

        tagDropdown.style.display = 'block';
    }

    // Обработка ввода в поле тегов
    tagInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            selectedTag = null; // Если стерли текст — сбрасываем фильтр по тегам
            tagDropdown.style.display = 'none';
            renderCards();
            return;
        }

        // Фильтруем теги по вхождению строки
        const matchedTags = allTags.filter(tag => tag.toLowerCase().includes(query));
        showDropdown(matchedTags);
    });

    // Показываем весь список тегов при фокусе на пустом поле
    tagInput.addEventListener('focus', () => {
        if (!tagInput.value.trim()) {
            showDropdown(allTags);
        }
    });

    // Закрытие списка при клике в любое другое место сайта
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tag-search-box')) {
            tagDropdown.style.display = 'none';
        }
    });
}

// Слушатель ввода в поисковую строку
document.getElementById('search-input').addEventListener('input', renderCards);

// Запуск при старте страницы
loadCards();

// Логика переключения тёмной темы
const themeCheckbox = document.getElementById('theme-checkbox');
const themeText = document.querySelector('.theme-text');

// 1. Проверяем, была ли сохранена тема ранее
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeCheckbox.checked = true;
    if (themeText) themeText.textContent = '☀️'; // Меняем иконку на солнце
}

// 2. Слушатель изменения положения ползунка
themeCheckbox.addEventListener('change', function() {
    if (this.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        if (themeText) themeText.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        if (themeText) themeText.textContent = '🌙';
    }
    
    // Перерисовываем список тегов, чтобы обновить цвета выпадающего окна при смене темы
    if (typeof renderTags === 'function') {
        renderTags();
    }
});

