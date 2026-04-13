const API = 'https://api.jikan.moe/v4';

// ── Watchlist — persisted via localStorage ─────────────────────────
let watchlist = JSON.parse(localStorage.getItem('animeWatchlist') || '[]');

function saveWatchlist() {
    localStorage.setItem('animeWatchlist', JSON.stringify(watchlist));
}

// ── Hero carousel state ────────────────────────────────────────────
let currentSlide = 0;
let slideTimer;

// ── DOMContentLoaded — safe init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Nav always init (exists on every page)
    initNav();

    // index.html only
    if (document.getElementById('heroSlides')) {
        loadHeroCarousel();
    }
    if (document.getElementById('discoverGrid')) {
        loadDiscover();
    }
    if (document.getElementById('searchBtn') && document.getElementById('searchInput')) {
        document.getElementById('searchBtn').addEventListener('click', searchAnime);
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAnime();
        });
    }

    // trending.html only
    if (document.getElementById('trendingGrid')) {
        loadTrending();
    }

    // news.html only
    if (document.getElementById('newsGrid')) {
        loadNews();
    }

    // watchlist.html only
    if (document.getElementById('watchlistGrid')) {
        renderWatchlist();
    }

    // sceneFinder.html only
    const sceneInput = document.getElementById('sceneInput');
    if (sceneInput) {
        sceneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchScene();
        });
    }
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            updateFileName(this);
        });
    }
    initDragDrop();
});

// ── Nav ────────────────────────────────────────────────────────────
function initNav() {
    const burgerBtn  = document.getElementById('burgerBtn');
    const navLinks   = document.getElementById('navLinks');
    const navOverlay = document.getElementById('navOverlay');
    const navCloseBtn = document.getElementById('navCloseBtn');

    if (!burgerBtn || !navLinks) return;

    function toggleMenu(open) {
        burgerBtn.classList.toggle('active', open);
        navLinks.classList.toggle('open', open);
        if (navOverlay) navOverlay.classList.toggle('open', open);
        burgerBtn.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }

    burgerBtn.addEventListener('click', () => {
        toggleMenu(!navLinks.classList.contains('open'));
    });

    if (navOverlay)  navOverlay.addEventListener('click', () => toggleMenu(false));
    if (navCloseBtn) navCloseBtn.addEventListener('click', () => toggleMenu(false));

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => toggleMenu(false));
    });
}

// ── Hero Carousel ──────────────────────────────────────────────────
async function loadHeroCarousel() {
    try {
        const response = await fetch(`${API}/seasons/now?limit=5`);
        const data = await response.json();
        buildHeroSlides(data.data.slice(0, 5));
    } catch (error) {
        console.error('Hero failed:', error);
        buildHeroSlides(FALLBACK_ANIME.slice(0, 2));
    }
}

function buildHeroSlides(animeList) {
    const slidesContainer = document.getElementById('heroSlides');
    const dotsContainer   = document.getElementById('carouselDots');
    if (!slidesContainer || !dotsContainer) return;

    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML   = '';

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
                    <span><i class="fa-solid fa-masks-theater"></i> ${anime.genres?.map(g => g.name).slice(0, 2).join(', ') || 'Anime'}</span>
                </div>
                <p class="hero-description">
                    ${anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : 'No description available.'}
                </p>
                <div class="hero-buttons">
                    <button class="btn-primary" onclick="addToWatchlist(${anime.mal_id}, ${JSON.stringify(anime.title_english || anime.title)}, ${JSON.stringify(anime.images.jpg.image_url)}, '${anime.score || 'N/A'}', '${anime.type || 'TV'}', '${anime.episodes || '?'}')">
                        <i class="fa-solid fa-plus"></i> Add to Watchlist
                    </button>
                </div>
            </div>`;
        slidesContainer.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => goToSlide(index);
        dotsContainer.appendChild(dot);
    });

    startCarousel();
}

function startCarousel() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length) goToSlide((currentSlide + 1) % slides.length);
    }, 6000);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.dot');
    if (!slides.length || !dots.length) return;
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

// ── Discover ───────────────────────────────────────────────────────
async function loadDiscover() {
    const grid = document.getElementById('discoverGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-text">Loading currently airing anime...</p>';
    try {
        const response = await fetch(`${API}/seasons/now?limit=16`);
        const data = await response.json();
        renderCards(data.data, grid);
    } catch {
        grid.innerHTML = '<p class="loading-text">Could not load anime. Please refresh.</p>';
    }
}

// ── Trending ───────────────────────────────────────────────────────
async function loadTrending() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;
    if (grid.querySelector('.rank-row')) return; // already loaded
    grid.innerHTML = '<p class="loading-text">Loading trending anime...</p>';
    try {
        const response = await fetch(`${API}/top/anime?limit=20`);
        const data = await response.json();
        renderRankedList(data.data, grid);
    } catch {
        grid.innerHTML = '<p class="loading-text">Could not load trending. Please try again.</p>';
    }
}

function renderRankedList(animeList, container) {
    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<p class="loading-text">Nothing to show here.</p>';
        return;
    }
    container.innerHTML = animeList.map((anime, index) => {
        const rank     = index + 1;
        const title    = anime.title_english || anime.title;
        const year     = anime.year || 'Unknown';
        const studio   = anime.studios?.[0]?.name || 'Unknown Studio';
        const episodes = anime.episodes || '?';
        const score    = anime.score || 'N/A';
        const image    = anime.images.jpg.image_url;
        const isClassic = score !== 'N/A' && score >= 8.5;

        // Safely encode data for onclick
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeImage = image.replace(/'/g, "\\'");

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
                <div class="rank-score">⭐ ${score}</div>
                ${isClassic ? '<div class="classic-badge">🏆 CERTIFIED CLASSIC</div>' : ''}
                <button class="watchlist-btn rank-wl-btn" onclick="addToWatchlist(${anime.mal_id}, '${safeTitle}', '${safeImage}', '${score}', '${anime.type || 'TV'}', '${episodes}')">+ Watchlist</button>
            </div>
        </div>`;
    }).join('');
}

// ── News ───────────────────────────────────────────────────────────
async function loadNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;
    if (grid.querySelector('.news-card')) return;

    grid.innerHTML = '<p class="loading-text">Fetching latest anime news...</p>';
    try {
        const animeIds = [1535, 5114, 21, 11061, 16498];
        const allNews  = [];

        for (const id of animeIds) {
            const response = await fetch(`${API}/anime/${id}/news?limit=4`);
            const data = await response.json();
            if (data.data) allNews.push(...data.data);
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
            const image   = article.images?.jpg?.image_url || '';
            const excerpt = article.excerpt ? article.excerpt.substring(0, 120) + '...' : 'Click to read more.';

            return `
            <a class="news-card" href="${article.url}" target="_blank" rel="noopener noreferrer">
                ${image
                    ? `<div class="news-img" style="background-image: url('${image}')"></div>`
                    : '<div class="news-img news-img-placeholder">📰</div>'}
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

// ── Search ─────────────────────────────────────────────────────────
async function searchAnime() {
    const queryEl  = document.getElementById('searchInput');
    const genreEl  = document.getElementById('genreFilter');
    const statusEl = document.getElementById('statusFilter');
    if (!queryEl) return;

    const query  = queryEl.value.trim();
    const genre  = genreEl?.value  || '';
    const status = statusEl?.value || '';

    if (!query && !genre && !status) {
        alert('Please enter a search term or pick a genre/status first!');
        return;
    }

    // Show search section, hide discover
    const discoverSection = document.getElementById('discoverSection');
    const searchSection   = document.getElementById('searchSection');
    if (discoverSection) discoverSection.classList.add('hidden');
    if (searchSection)   searchSection.classList.remove('hidden');

    const titleEl = document.getElementById('searchResultsTitle');
    if (titleEl) titleEl.textContent = query ? `Results for "${query}"` : 'Search Results';

    const grid = document.getElementById('searchGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-text">Searching...</p>';

    let url = `${API}/anime?limit=20&order_by=popularity`;
    if (query)  url += `&q=${encodeURIComponent(query)}`;
    if (genre)  url += `&genres=${genre}`;
    if (status) url += `&status=${status}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            grid.innerHTML = '<p class="loading-text">No results found. Try a different search!</p>';
            return;
        }
        renderCards(data.data, grid);
        searchSection.scrollIntoView({ behavior: 'smooth' });
    } catch {
        grid.innerHTML = '<p class="loading-text">Search failed. Please try again.</p>';
    }
}

// ── Render Cards ───────────────────────────────────────────────────
function renderCards(animeList, grid) {
    if (!animeList || animeList.length === 0) {
        grid.innerHTML = '<p class="loading-text">Nothing to show here.</p>';
        return;
    }
    grid.innerHTML = animeList.map(anime => {
        const title    = anime.title_english || anime.title;
        const synopsis = anime.synopsis ? anime.synopsis.substring(0, 90) + '...' : 'No description available.';
        const genres   = (anime.genres || []).slice(0, 4).map(g => `<span class="tag">${g.name}</span>`).join('');

        // Safe for onclick attribute — escape single quotes
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeImage = (anime.images.jpg.image_url).replace(/'/g, "\\'");

        const inWL = watchlist.some(w => w.id === anime.mal_id);

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
                <button class="watchlist-btn ${inWL ? 'in-watchlist' : ''}"
                    id="wlbtn-${anime.mal_id}"
                    onclick="addToWatchlist(${anime.mal_id}, '${safeTitle}', '${safeImage}', '${anime.score || 'N/A'}', '${anime.type || 'TV'}', '${anime.episodes || '?'}')">
                    ${inWL ? '✓ In Watchlist' : '+ Watchlist'}
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── Watchlist CRUD ─────────────────────────────────────────────────
function addToWatchlist(id, title, image, score, type, episodes) {
    const alreadyIn = watchlist.some(w => w.id === id);

    if (alreadyIn) {
        showToast(`"${title}" is already in your watchlist!`, 'info');
        return;
    }

    watchlist.push({ id, title, image, score, type, episodes });
    saveWatchlist();

    // Update any visible button for this anime
    const btn = document.getElementById(`wlbtn-${id}`);
    if (btn) {
        btn.textContent = '✓ In Watchlist';
        btn.classList.add('in-watchlist');
    }

    showToast(`"${title}" added to watchlist!`, 'success');
}

function removeFromWatchlist(id) {
    watchlist = watchlist.filter(w => w.id !== id);
    saveWatchlist();
    renderWatchlist();
    showToast('Removed from watchlist.', 'removed');
}

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    if (!grid) return;

    if (watchlist.length === 0) {
        grid.innerHTML = '<p class="loading-text">Your watchlist is empty. Go find some anime! 🎌</p>';
        return;
    }

    grid.innerHTML = watchlist.map(anime => `
        <div class="anime-card">
            <div class="card-image">
                <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                <div class="rating-badge">${anime.score}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${anime.title}</h3>
                <p class="card-meta">${anime.type} · ${anime.episodes} eps</p>
                <button class="remove-btn" onclick="removeFromWatchlist(${anime.id})">
                    ✕ Remove
                </button>
            </div>
        </div>`).join('');
}

// ── Toast notification ─────────────────────────────────────────────
function showToast(message, type = 'success') {
    let toast = document.getElementById('toastNotif');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotif';
        document.body.appendChild(toast);
    }

    const colors = {
        success: 'linear-gradient(135deg, #a855f7, #7c3aed)',
        info:    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        removed: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    };

    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 0.85rem 1.5rem;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        max-width: 320px;
    `;

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.opacity  = '0';
        toast.style.transform = 'translateY(10px)';
    }, 3000);
}

// ── Scene Finder ───────────────────────────────────────────────────
function updateFileName(input) {
    const fileName = document.getElementById('fileName');
    if (!fileName) return;
    if (input.files && input.files[0]) {
        fileName.textContent = input.files[0].name;
        fileName.style.color = 'var(--accent-violet)';
    }
}

function initDragDrop() {
    const uploadArea = document.querySelector('.upload-area');
    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--accent-violet)';
        uploadArea.style.background  = 'rgba(168, 85, 247, 0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
        uploadArea.style.background  = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background  = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.files = files;
                updateFileName(fileInput);
            }
        }
    });
}

async function searchScene() {
    const fileInput  = document.getElementById('fileInput');
    const urlInput   = document.getElementById('sceneInput');
    const searchBtn  = document.getElementById('searchBtn');
    const loader     = document.getElementById('sceneLoader');
    const emptyState = document.getElementById('sceneEmpty');
    const results    = document.getElementById('sceneResults');

    if (!fileInput || !urlInput) return;

    const hasFile = fileInput.files && fileInput.files[0];
    const hasUrl  = urlInput.value.trim() !== '';

    if (!hasFile && !hasUrl) {
        alert('Please upload an image or paste an image URL.');
        return;
    }

    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');
    results.classList.add('hidden');
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    }

    try {
        let apiUrl;
        let fetchOptions = {};

        if (hasUrl) {
            const encoded = encodeURIComponent(urlInput.value.trim());
            apiUrl = `https://api.trace.moe/search?anilistInfo&url=${encoded}`;
        } else {
            apiUrl = 'https://api.trace.moe/search?anilistInfo';
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': fileInput.files[0].type },
                body: fileInput.files[0]
            };
        }

        const response = await fetch(apiUrl, fetchOptions);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        if (!data.result || data.result.length === 0) throw new Error('no_match');

        const top = data.result[0];
        const anime = {
            title:       top.anilist?.title?.english || top.anilist?.title?.romaji || 'Unknown Title',
            episode:     top.episode ?? '—',
            season:      top.anilist?.season
                         ? `${cap(top.anilist.season)} ${top.anilist.seasonYear ?? ''}`
                         : (top.anilist?.seasonYear ?? '—'),
            description: top.anilist?.description
                         ? top.anilist.description.replace(/<[^>]*>/g, '').slice(0, 300) + '…'
                         : 'No description available.',
            image:       top.anilist?.coverImage?.large || '',
            match:       Math.round(top.similarity * 100),
            videoUrl:    top.video
        };

        displaySceneResults(anime);

    } catch (err) {
        emptyState.classList.remove('hidden');
        if (err.message !== 'no_match') console.error('trace.moe error:', err);
    } finally {
        loader.classList.add('hidden');
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Execute Trace';
        }
    }
}

function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

function displaySceneResults(anime) {
    const results    = document.getElementById('sceneResults');
    const animeTitle = document.getElementById('animeTitle');
    const episodeNum = document.getElementById('episodeNum');
    const seasonInfo = document.getElementById('seasonInfo');
    const animeDesc  = document.getElementById('animeDesc');
    const animeImage = document.getElementById('animeImage');
    const matchScore = document.getElementById('matchScore');
    const sceneVideo = document.getElementById('sceneVideo');

    if (!results) return;

    animeTitle.textContent = anime.title;
    episodeNum.textContent = anime.episode;
    seasonInfo.textContent = anime.season;
    animeDesc.textContent  = anime.description;
    animeImage.src         = anime.image;
    matchScore.textContent = `${anime.match}% MATCH`;

    if (anime.match >= 95) {
        matchScore.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    } else if (anime.match >= 85) {
        matchScore.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
    } else {
        matchScore.style.background = 'linear-gradient(135deg, #ffaa00, #cc8800)';
    }

    if (anime.videoUrl) {
        sceneVideo.src    = anime.videoUrl;
        sceneVideo.poster = anime.image;
    } else {
        sceneVideo.removeAttribute('src');
        sceneVideo.poster = anime.image;
    }

    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Fallback anime data ─────────────────────────────────────────────
const FALLBACK_ANIME = [
    {
        mal_id: 16498, title: 'Attack on Titan', title_english: 'Attack on Titan',
        score: 9.1, episodes: 94, type: 'TV',
        genres: [{ name: 'Action' }, { name: 'Drama' }],
        synopsis: 'Humanity fights for survival against man-eating giants behind massive walls.',
        images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg', image_url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' } }
    },
    {
        mal_id: 38000, title: 'Demon Slayer', title_english: 'Demon Slayer',
        score: 8.7, episodes: 55, type: 'TV',
        genres: [{ name: 'Action' }, { name: 'Supernatural' }],
        synopsis: 'A boy becomes a demon slayer to save his sister turned into a demon.',
        images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg', image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' } }
    }
];

// ── Utility ────────────────────────────────────────────────────────
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
