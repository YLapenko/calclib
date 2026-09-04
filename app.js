let allCards = [];
let selectedTag = null;

// Подключение GOOGLE ТАБЛИЦ для записи ошибок
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBu3usMJbb2qBgD_LDBYYqElrG8V8naJKqIunC8yteu1pByf4V2lNfNoN0qFo02WP9/exec'; //

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
        
        const tagsHtml = card.tags.map(t => `<button class="card-tag" data-tag="${t}">${t}</button>`).join('');
        
        // Рендерим внутренности. Добавлена кнопка сообщения об ошибке
        cardEl.innerHTML = `
            <a href="${card.url}" target="_blank" class="card-link">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </a>
            <div class="card-footer">
                <div class="card-tags">${tagsHtml}</div>
                <button class="report-broken-btn" title="Ссылка не работает?">⚠️ Ссылка не работает</button>
            </div>
        `;

        // Вешаем событие клика на теги ВНУТРИ карточки
        cardEl.querySelectorAll('.card-tag').forEach(tagButton => {
            tagButton.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedTag = e.target.getAttribute('data-tag');
                const tagInput = document.getElementById('tag-search-input');
                selectedTag = clickedTag;
                if (tagInput) { tagInput.value = clickedTag; }
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderCards();
            });
        });

                // --- ЛОГИКА КНОПКИ ЖАЛОБЫ НА ССЫЛКУ (ОТПРАВКА В GOOGLE ТАБЛИЦУ) ---
        const reportBtn = cardEl.querySelector('.report-broken-btn');
        reportBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Защита от повторных нажатий
            if (reportBtn.disabled) return;
            
            reportBtn.disabled = true;
            reportBtn.textContent = '⏳ Отправка...';

            try {
                // Отправляем данные на Google Script
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Важно: обходит ограничения безопасности CORS браузера
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        title: card.title,
                        url: card.url
                    })
                });

                // Так как мы используем режим 'no-cors', браузер возвращает непрозрачный (opaque) ответ.
                // Мы не можем прочитать статус ответа (response.ok всегда false, а статус 0),
                // но если fetch не выкинул ошибку в блок catch — значит, запрос успешно улетел на сервер Google.
                reportBtn.textContent = '✅ Отправлено!';
                reportBtn.classList.add('success');

            } catch (error) {
                console.error('Не удалось отправить уведомление в Google:', error);
                reportBtn.textContent = '❌ Ошибка';
                reportBtn.disabled = false; // Возвращаем кнопку в рабочее состояние для повторной попытки
            }
        });
        // -----------------------------------------------------------------

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
