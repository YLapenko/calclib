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
    const searchValues = document.getElementById('search-input').value.toLowerCase().trim();
    grid.innerHTML = '';
    
    const filtered = allCards.filter(card => {
        const matchesSearch = card.title.toLowerCase().includes(searchValues) || 
                              card.description.toLowerCase().includes(searchValues);
        const matchesTag = !selectedTag || card.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
    });

    // --- Управление кнопкой сброса ---
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        // Кнопка показывается, если в поиске есть текст ИЛИ если выбран какой-либо тег
        if (searchValues.length > 0 || selectedTag !== null) {
            resetBtn.classList.remove('hidden');
        } else {
            resetBtn.classList.add('hidden');
        }
    }
    // --------------------------------------------------

    if (filtered.length === 0) {
        document.getElementById('no-results').classList.remove('hidden');
    } else {
        document.getElementById('no-results').classList.add('hidden');
    }

    filtered.forEach(card => {
        // Создаем элемент карточки
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        
        // Рендерим внутренности карточки. Обратите внимание: теги теперь <button>
        const tagsHtml = card.tags.map(t => `<button class="card-tag" data-tag="${t}">${t}</button>`).join('');
        
        cardEl.innerHTML = `
            <a href="${card.url}" target="_blank" class="card-link">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </a>
            <div class="card-tags">${tagsHtml}</div>
        `;

        // Вешаем событие клика на теги ВНУТРИ карточки
        cardEl.querySelectorAll('.card-tag').forEach(tagButton => {
            tagButton.addEventListener('click', (e) => {
                e.preventDefault(); // Предотвращаем любые лишние действия
                
                const clickedTag = e.target.getAttribute('data-tag');
                const tagInput = document.getElementById('tag-search-input');

                // Устанавливаем выбранный тег
                selectedTag = clickedTag;
                
                // Записываем название тега в инпут поиска по тегам
                if (tagInput) {
                    tagInput.value = clickedTag;
                }

                // Плавно скроллим страницу наверх к каталогу
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Перерисовываем карточки с новым фильтром
                renderCards();
            });
        });

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

    // Очищаем контейнер и создаем структуру поиска (ИНЛАЙН-СТИЛИ УДАЛЕНЫ!)
    tagsContainer.innerHTML = `
        <div class="tag-search-box">
            <input type="text" id="tag-search-input" placeholder="Поиск по тегам...">
            <div id="tag-dropdown" class="tag-dropdown-list"></div>
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
            item.className = 'dropdown-item';
            item.textContent = tag;
            
            // Если этот тег сейчас выбран, добавляем класс активности
            if (selectedTag === tag) {
                item.classList.add('selected');
            }

            // Клик по тегу из списка
            item.addEventListener('click', () => {
                if (selectedTag === tag) {
                    selectedTag = null; // Сброс
                    tagInput.value = '';
                } else {
                    selectedTag = tag;  // Выбор нового
                    tagInput.value = tag;
                }
                tagDropdown.style.display = 'none';
                renderCards(); 
            });

            tagDropdown.appendChild(item);
        });

        tagDropdown.style.display = 'block';
    }

    // Обработка ввода в поле тегов
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

// Логика сброса всех фильтров при клике
document.getElementById('reset-filters-btn').addEventListener('click', () => {
    // 1. Очищаем текстовый поиск калькуляторов
    document.getElementById('search-input').value = '';
    
    // 2. Сбрасываем выбранный тег в памяти
    selectedTag = null;
    
    // 3. Очищаем поле поиска по тегам, если оно существует в DOM
    const tagInput = document.getElementById('tag-search-input');
    if (tagInput) {
        tagInput.value = '';
    }
    
    // 4. Перерисовываем карточки (кнопка сброса исчезнет сама)
    renderCards();
});

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
    if (themeText) themeText.textContent = '☀️';
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
    
});
