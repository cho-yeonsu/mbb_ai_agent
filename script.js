const feeds = {
    mckinsey: 'https://rss.app/feeds/v1.1/kxacNO6X4NoT7stN.json',
    bcg: 'https://rss.app/feeds/v1.1/KenJwRZBjblSVKoh.json',
    bain: 'https://rss.app/feeds/v1.1/kffB3aDpt3Sj8uUO.json'
};

const sourceStyles = {
    'McKinsey': 'bg-blue-100 text-blue-800',
    'BCG': 'bg-green-100 text-green-800',
    'Bain': 'bg-red-100 text-red-800'
};

function transformArticle(item, source) {
    return {
        article_id: item.id,
        source: source,
        title: item.title,
        link: item.url,
        published_date: item.date_published,
        summary: item.content_text || '요약 정보가 없습니다.',
    };
}

async function fetchAndProcessFeeds() {
    const feedSources = [
        { name: 'McKinsey', url: feeds.mckinsey },
        { name: 'BCG', url: feeds.bcg },
        { name: 'Bain', url: feeds.bain }
    ];

    const fetchPromises = feedSources.map(async (source) => {
        try {
            const response = await fetch(source.url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${source.name}`);
            }
            const data = await response.json();
            return {
                sourceName: source.name,
                items: data.items || []
            };
        } catch (error) {
            console.warn(`Could not fetch or parse feed for ${source.name}:`, error.message);
            return null;
        }
    });

    try {
        const results = await Promise.all(fetchPromises);

        const allArticles = results
            .filter(result => result !== null)
            .flatMap(result =>
                result.items.map(item => transformArticle(item, result.sourceName))
            );

        allArticles.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));

        return allArticles;

    } catch (error) {
        console.error("An unexpected error occurred while processing all feeds:", error);
        return [];
    }
}


function formatDate(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'article-card p-6';

    const sourceTagStyle = sourceStyles[article.source] || 'bg-gray-100 text-gray-800';

    const truncatedSummary = article.summary.length > 150 
        ? `${article.summary.substring(0, 150)}...` 
        : article.summary;

    card.innerHTML = `
        <div class="flex-grow flex flex-col">
            <div class="mb-4 flex items-center justify-between text-xs text-gray-500">
                <span class="px-2 py-1 font-semibold rounded-full ${sourceTagStyle}">${article.source}</span>
                <span>${formatDate(article.published_date)}</span>
            </div>
            <h2 class="text-lg font-bold text-gray-800 mb-2 flex-grow">
                <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-700 transition-colors duration-200">
                    ${article.title}
                </a>
            </h2>
            <p class="text-sm text-gray-600 mb-6">${truncatedSummary}</p>
            <div class="mt-auto">
                <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="read-more-btn">
                    원문 보기
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>
        </div>
    `;

    return card;
}

document.addEventListener('DOMContentLoaded', async () => {
    const articleGrid = document.getElementById('article-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    let allArticles = [];

    const displayArticles = (articlesToDisplay) => {
        articleGrid.innerHTML = '';
        if (articlesToDisplay && articlesToDisplay.length > 0) {
            articlesToDisplay.forEach(article => {
                const card = createArticleCard(article);
                articleGrid.appendChild(card);
            });
        } else {
            if (searchInput.value.trim()) {
                 articleGrid.innerHTML = `<p class="text-center col-span-full text-gray-500">"${searchInput.value}"에 대한 검색 결과가 없습니다.</p>`;
            } else {
                 articleGrid.innerHTML = '<p class="text-center col-span-full text-gray-500">인사이트를 불러오는 데 실패했습니다. 나중에 다시 시도해주세요.</p>';
            }
        }
        lucide.createIcons();
    };

    const handleSearch = (event) => {
        event.preventDefault();
        const searchTerm = searchInput.value.trim().toLowerCase();

        if (searchTerm === '') {
            displayArticles(allArticles);
            return;
        }
        
        const filteredArticles = allArticles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) || 
            article.summary.toLowerCase().includes(searchTerm)
        );

        displayArticles(filteredArticles);
    };

    searchForm.addEventListener('submit', handleSearch);
    searchInput.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
            displayArticles(allArticles);
        }
    });

    allArticles = await fetchAndProcessFeeds();
    loadingIndicator.style.display = 'none';
    displayArticles(allArticles);
});
