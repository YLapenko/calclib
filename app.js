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

// 3. Сбор и вывод уникальных тегов в шапку сайта
function renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    const allTags = new Set();
    
    allCards.forEach(card => card.tags.forEach(tag => allTags.add(tag)));
    
    tagsContainer.innerHTML = '';
    
    allTags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagEl.addEventListener('click', () => {
            if (selectedTag === tag) {
                selectedTag = null; // сброс фильтра при повторном клике
                tagEl.classList.remove('active');
            } else {
                document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                selectedTag = tag;
                tagEl.classList.add('active');
            }
            renderCards();
        });
        tagsContainer.appendChild(tagEl);
    });
}

// Слушатель ввода в поисковую строку
document.getElementById('search-input').addEventListener('input', renderCards);

// Запуск при старте страницы
loadCards();
