const API = 'https://api.jikan.moe/v4';
let currentSlide = 0;
let slideTimer;

// Load watchlist from localStorage
function getWatchlist() {
    return JSON.parse(localStorage.getItem('animeWatchlist')) || [];
}

// Save watchlist to localStorage
function saveWatchlist(watchlist) {
    localStorage.setItem('animeWatchlist', JSON.stringify(watchlist));
}

document.addEventListener('DOMContentLoaded', () => {
    // Page-specific initializations
    if (document.getElementById('heroSlides')) loadHeroCarousel();
    if (document.getElementById('discoverGrid')) loadDiscover();
    if (document.getElementById('trendingGrid')) loadTrending();
    if (document.getElementById('newsGrid')) loadNews();
    if (document.getElementById('watchlistGrid')) renderWatchlist();
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchAnime);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAnime();
        });
    }
});

async function loadHeroCarousel() {
    try {
        const response = await fetch(`${API}/seasons/now?limit=5`);
        const data = await response.json();
        const animeList = data.data.slice(0, 5);

        const slidesContainer = document.getElementById('heroSlides');
        const dotsContainer = document.getElementById('carouselDots');

        animeList.forEach((anime, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `
                <div class="hero-bg" style="background-image: url('${anime.images.jpg.large_image_url}')"></div>
                <div class="hero-content">
                    <h1 class="hero-title">${anime.title_english || anime.title}</h1>
                    <div class="hero-meta">
                        <span><i class="fa-solid fa-star" style="color:yellow;"></i> ${anime.score || 'N/A'}</span>
                        <span><i class="fa-solid fa-tv"></i> ${anime.episodes || '?'} eps</span>
                        <span><i class="fa-solid fa-mask"></i> ${anime.genres?.map(g => g.name).slice(0, 2).join(', ') || 'Anime'}</span>
                    </div>
                    <p class="hero-description">
                        ${anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : 'No description available.'}
                    </p>
                </div>
            `;
            slidesContainer.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(index);
            dotsContainer.appendChild(dot);
        });

        startCarousel();
    } catch (error) {
        console.error('Hero failed:', error);
    }
}

function startCarousel() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length > 0) {
            goToSlide((currentSlide + 1) % slides.length);
        }
    }, 6000);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    
    slides[currentSlide]?.classList.remove('active');
    dots[currentSlide]?.classList.remove('active');
    currentSlide = index;
    slides[currentSlide]?.classList.add('active');
    dots[currentSlide]?.classList.add('active');
}

async function loadDiscover() {
    const grid = document.getElementById('discoverGrid');
    grid.innerHTML = '<p class="loading-text">Loading currently airing anime...</p>';
    try {
        const response = await fetch(`${API}/seasons/now?limit=16`);
        const data = await response.json();
        renderCards(data.data, grid);
    } catch (error) {
        grid.innerHTML = '<p class="loading-text">Could not load anime. Please refresh.</p>';
    }
}

async function loadTrending() {
    const grid = document.getElementById('trendingGrid');
    if (!grid || grid.querySelector('.rank-row')) return;
    
    grid.innerHTML = '<p class="loading-text">Loading trending anime...</p>';
    try {
        const response = await fetch(`${API}/top/anime?limit=20`);
        const data = await response.json();
        renderRankedList(data.data, grid);
    } catch (error) {
        grid.innerHTML = '<p class="loading-text">Could not load trending. Please try again.</p>';
    }
}

function renderRankedList(animeList, container) {
    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<p class="loading-text">Nothing to show here.</p>';
        return;
    }

    container.innerHTML = animeList.map((anime, index) => {
        const rank = index + 1;
        const title = anime.title_english || anime.title;
        const year = anime.year || 'Unknown';
        const studio = anime.studios?.[0]?.name || 'Unknown Studio';
        const episodes = anime.episodes || '?';
        const score = anime.score || 'N/A';
        const image = anime.images.jpg.image_url;
        const isClassic = score !== 'N/A' && score >= 8.5;

        return `
        <div class="rank-row">
            <div class="rank-number">#${rank}</div>
            <img class="rank-img" src="${image}" alt="${title}" loading="lazy">
            <div class="rank-info">
                <h3 class="rank-title">${title}</h3>
                <div class="rank-meta">
                    <span>${year}</span>
                    <span class="rank-dot">•</span>
                    <span>${studio}</span>
                    <span class="rank-dot">•</span>
                    <span>${episodes} eps</span>
                </div>
            </div>
            <div class="rank-right">
                <div class="rank-score"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${score}</div>
                ${isClassic ? '<div class="classic-badge"><i class="fa-solid fa-trophy"></i> CLASSIC</div>' : ''}
                <button class="watchlist-btn rank-wl-btn" onclick="addToWatchlist(
                    ${anime.mal_id},
                    '${encodeURIComponent(title)}',
                    '${encodeURIComponent(image)}',
                    '${score}',
                    '${anime.type || 'TV'}',
                    '${episodes}'
                )">+ Watchlist</button>
            </div>
        </div>`;
    }).join('');
}

async function loadNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid || grid.querySelector('.news-card')) return;

    grid.innerHTML = '<p class="loading-text">Fetching latest anime news...</p>';

    try {
        const animeIds = [1535, 5114, 21, 11061, 16498];
        const allNews = [];

        for (const id of animeIds) {
            const response = await fetch(`${API}/anime/${id}/news?limit=4`);
            const data = await response.json();
            if (data.data) {
                data.data.forEach(article => {
                    article._animeId = id;
                });
                allNews.push(...data.data);
            }
            await delay(400);
        }

        if (allNews.length === 0) {
            grid.innerHTML = '<p class="loading-text">No news found. Try again later.</p>';
            return;
        }
        
        allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

        grid.innerHTML = allNews.map(article => {
            const date = article.date
                ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Unknown date';

            const image = article.images?.jpg?.image_url || '';
            const excerpt = article.excerpt ? article.excerpt.substring(0, 120) + '...' : 'Click to read more.';

            return `
            <a class="news-card" href="${article.url}" target="_blank" rel="noopener noreferrer">
                ${image ? `<div class="news-img" style="background-image: url('${image}')"></div>` : '<div class="news-img news-img-placeholder"><i class="fa-solid fa-newspaper"></i></div>'}
                <div class="news-body">
                    <span class="news-date">${date}</span>
                    <h3 class="news-title">${article.title}</h3>
                    <p class="news-excerpt">${excerpt}</p>
                    <span class="news-source">by ${article.author_username || 'MAL Staff'} · MyAnimeList</span>
                </div>
            </a>`;
        }).join('');

    } catch (error) {
        console.error('News error:', error);
        grid.innerHTML = '<p class="loading-text">Could not load news. Please try again.</p>';
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchAnime() {
    const query = document.getElementById('searchInput').value.trim();
    const genre = document.getElementById('genreFilter').value;
    const status = document.getElementById('statusFilter').value;

    if (!query && !genre && !status) {
        alert('Please enter a search term or pick a genre/status first!');
        return;
    }

    const discoverSection = document.getElementById('discoverSection');
    const searchSection = document.getElementById('searchSection');
    
    if (discoverSection) discoverSection.classList.add('hidden');
    if (searchSection) {
        searchSection.classList.remove('hidden');
        searchSection.scrollIntoView({ behavior: 'smooth' });
    }

    document.getElementById('searchResultsTitle').textContent = query ? `Results for "${query}"` : 'Search Results';

    const grid = document.getElementById('searchGrid');
    grid.innerHTML = '<p class="loading-text">Searching...</p>';

    let url = `${API}/anime?limit=20&order_by=popularity`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    if (genre) url += `&genres=${genre}`;
    if (status) url += `&status=${status}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            grid.innerHTML = '<p class="loading-text">No results found. Try a different search!</p>';
            return;
        }
        renderCards(data.data, grid);
    } catch (error) {
        grid.innerHTML = '<p class="loading-text">Search failed. Please try again.</p>';
    }
}

function renderCards(animeList, grid) {
    if (!animeList || animeList.length === 0) {
        grid.innerHTML = '<p class="loading-text">Nothing to show here.</p>';
        return;
    }

    grid.innerHTML = animeList.map(anime => {
        const synopsis = anime.synopsis ? anime.synopsis.substring(0, 90) + '...' : 'No description available.';
        const genres = (anime.genres || []).slice(0, 4).map(g => `<span class="tag">${g.name}</span>`).join('');
        const title = anime.title_english || anime.title;
        
        return `
        <div class="anime-card">
            <div class="card-image">
                <img src="${anime.images.jpg.image_url}" alt="${title}" loading="lazy">
                <div class="rating-badge">${anime.score || 'N/A'}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-meta">${anime.type || 'TV'} · ${anime.episodes || '?'} eps</p>
                <p class="card-synopsis">${synopsis}</p>
                <div class="card-tags">${genres}</div>
                <button class="watchlist-btn" onclick="addToWatchlist(
                    ${anime.mal_id},
                    '${encodeURIComponent(title)}',
                    '${encodeURIComponent(anime.images.jpg.image_url)}',
                    '${anime.score || 'N/A'}',
                    '${anime.type || 'TV'}',
                    '${anime.episodes || '?'}'
                )">+ Watchlist</button>
            </div>
        </div>`;
    }).join('');
}

// Watchlist Functions
function addToWatchlist(id, titleEncoded, imageEncoded, score, type, episodes) {
    const watchlist = getWatchlist();
    const title = decodeURIComponent(titleEncoded);
    const image = decodeURIComponent(imageEncoded);
    
    if (watchlist.some(item => item.id === id)) {
        alert(`${title} is already in your watchlist!`);
        return;
    }
    
    watchlist.push({ id, title, image, score, type, episodes });
    saveWatchlist(watchlist);
    alert(`${title} added to watchlist!`);
    
    // If on watchlist page, refresh the display
    if (document.getElementById('watchlistGrid')) {
        renderWatchlist();
    }
}

function removeFromWatchlist(id) {
    let watchlist = getWatchlist();
    watchlist = watchlist.filter(item => item.id !== id);
    saveWatchlist(watchlist);
    renderWatchlist();
}

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    if (!grid) return;
    
    const watchlist = getWatchlist();
    
    if (watchlist.length === 0) {
        grid.innerHTML = '<p class="loading-text">Your watchlist is empty. Go find some anime! 🎌</p>';
        return;
    }
    
    grid.innerHTML = watchlist.map(anime => {
        return `
        <div class="anime-card">
            <div class="card-image">
                <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                <div class="rating-badge">${anime.score}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${anime.title}</h3>
                <p class="card-meta">${anime.type} · ${anime.episodes} eps</p>
                <button class="remove-btn" onclick="removeFromWatchlist(${anime.id})">Remove</button>
            </div>
        </div>`;
    }).join('');
}