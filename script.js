const API = 'https://api.jikan.moe/v4';

let currentSlide = 0;
let slideTimer;
let watchlist = []; 

document.addEventListener('DOMContentLoaded', () => {
    loadHeroCarousel();
    loadDiscover();
    loadTrending();
    loadNews();
    document.getElementById('searchBtn').addEventListener('click', searchAnime);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchAnime();
    });
});

function showSection(name) {
    const allSections = ['discoverSection', 'searchSection', 'trendingSection', 'newsSection', 'watchlistSection'];

    allSections.forEach(id => document.getElementById(id).classList.add('hidden'));

    const target = document.getElementById(name + 'Section');
    if (target) {
        target.classList.remove('hidden');
        target.scrollIntoView({ behavior: 'smooth' });
    }

    if (name === 'trending') loadTrending();
    if (name === 'news') loadNews();
    if (name === 'watchlist') renderWatchlist();
}

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
                        <span><i class="fa-solid fa-star" style="color:yellow;"></i>${anime.score || 'N/A'}</span>
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
        loadFallbackHero();
    }
}

function loadFallbackHero() {
    const fallback = [
        { title: 'Attack on Titan', score: 9.1, episodes: 94, genres: [{name:'Action'}], synopsis: 'Humanity fights for survival against man-eating giants.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' } } },
        { title: 'Demon Slayer', score: 8.7, episodes: 55, genres: [{name:'Action'}], synopsis: 'A boy becomes a demon slayer to save his sister.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' } } }
    ];
    const slidesContainer = document.getElementById('heroSlides');
    const dotsContainer = document.getElementById('carouselDots');
    fallback.forEach((anime, index) => {
        const slide = document.createElement('div');
        slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
        slide.innerHTML = `
            <div class="hero-bg" style="background-image: url('${anime.images.jpg.large_image_url}')"></div>
            <div class="hero-content">
                <h1 class="hero-title">${anime.title}</h1>
                <div class="hero-meta"><span ${anime.score}</span><span>📺 ${anime.episodes} eps</span></div>
                <p class="hero-description">${anime.synopsis}</p>
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
        goToSlide((currentSlide + 1) % slides.length);
    }, 6000);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
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
    if (grid.querySelector('.rank-row')) return; // already loaded
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

        const safeTitle = encodeURIComponent(title);
        const safeImage = encodeURIComponent(image);

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
                <div class="rank-score"> ${score}</div>
                ${isClassic ? '<div class="classic-badge"><i class="fa-solid fa-trophy style="color: yellow;"></i> CERTIFIED CLASSIC</div>' : ''}
                <button class="watchlist-btn rank-wl-btn" onclick="addToWatchlist(
                    ${anime.mal_id},
                    decodeURIComponent(\`${safeTitle}\`),
                    decodeURIComponent(\`${safeImage}\`),
                    \`${score}\`,
                    \`${anime.type || 'TV'}\`,
                    \`${episodes}\`
                )">+ Watchlist</button>
            </div>
        </div>`;
    }).join('');
}

async function loadNews() {
    const grid = document.getElementById('newsGrid');

    // Only load once — if news cards already exist, skip
    if (grid.querySelector('.news-card')) return;

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
            const excerpt = article.excerpt
                ? article.excerpt.substring(0, 120) + '...'
                : 'Click to read more.';

            return `
            <a class="news-card" href="${article.url}" target="_blank" rel="noopener noreferrer">
                ${image ? `<div class="news-img" style="background-image: url('${image}')"></div>` : '<div class="news-img news-img-placeholder">📰</div>'}
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

    // Show search section, hide all others
    const allSections = ['discoverSection', 'trendingSection', 'newsSection', 'watchlistSection'];
    allSections.forEach(id => document.getElementById(id).classList.add('hidden'));
    const searchSection = document.getElementById('searchSection');
    searchSection.classList.remove('hidden');
    searchSection.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('searchResultsTitle').textContent =
        query ? `Results for "${query}"` : 'Search Results';

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
function renderCards(animeList, grid){
    if(!animeList || animeList.length === 0){
        grid.innerHTML = '<p class="loading-text">Nothing to show here.</p>';
        return;
    }

    grid.innerHTML = animeList.map(anime => {
        const synopsis = anime.synopsis
                        ? anime.synopsis.substring(0, 90) + '...'
                        : 'No description available.';
         const genres = (anime.genres || []).slice(0, 4).map(g => `<span class="tag">${g.name}</span>`).join('');
        const safeTitle = encodeURIComponent(anime.title_english || anime.title);
        const safeImage = encodeURIComponent(anime.images.jpg.image_url);
         return `
         <div class="anime-card">
            <div class="card-image">
                <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
                <div class="rating-badge">${anime.score || 'N/A'}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${anime.title_english || anime.title}</h3>
                <p class="card-meta">${anime.type || 'TV'} · ${anime.episodes || '?'} eps</p>
                <p class="card-synopsis">${synopsis}</p>
                <div class="card-tags">${genres}</div>
                <button class="watchlist-btn" onclick="addToWatchlist(
                    ${anime.mal_id},
                    decodeURIComponent('${safeTitle}'),
                    decodeURIComponent('${safeImage}'),
                    '${anime.score || 'N/A'}',
                    '${anime.type || 'TV'}',
                    '${anime.episodes || '?'}'
                )">+ Watchlist</button>
            </div>
        </div>`;
    }).join('');
}

 const burgerBtn = document.getElementById('burgerBtn');
const navLinks  = document.getElementById('navLinks');
const navOverlay = document.getElementById('navOverlay');
const navCloseBtn = document.getElementById('navCloseBtn'); // FIX 1: was never grabbed

function toggleMenu(open) {
    burgerBtn.classList.toggle('active', open);
    navLinks.classList.toggle('open', open);
    navOverlay.classList.toggle('open', open);
    burgerBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
}

burgerBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.contains('open');
    toggleMenu(!isOpen);
});

navOverlay.addEventListener('click', () => toggleMenu(false));

// FIX 1: Close button now actually has its listener attached
navCloseBtn.addEventListener('click', () => toggleMenu(false));

// Close menu when a nav link is clicked
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
});


// ── Scene Finder ──────────────────────────────────────────────────

function updateFileName(input) {
    const fileName = document.getElementById('fileName');
    if (input.files && input.files[0]) {
        fileName.textContent = input.files[0].name;
        fileName.style.color = '#00d4ff';
    }
}

// Drag and drop
const uploadArea = document.querySelector('.upload-area');
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#00d4ff';
        uploadArea.style.background = 'rgba(0, 212, 255, 0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('fileInput');
            fileInput.files = files;
            updateFileName(fileInput);
        }
    });
}

// ── FIX 3: Real trace.moe API ──────────────────────────────────────

async function searchScene() {
    const fileInput = document.getElementById('fileInput');
    const urlInput  = document.getElementById('sceneInput');
    const searchBtn = document.getElementById('searchBtn');
    const loader    = document.getElementById('sceneLoader');
    const emptyState = document.getElementById('sceneEmpty');
    const results   = document.getElementById('sceneResults');

    const hasFile = fileInput.files && fileInput.files[0];
    const hasUrl  = urlInput.value.trim() !== '';

    if (!hasFile && !hasUrl) {
        alert('Please upload an image or paste an image URL');
        return;
    }

    // Show loader
    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');
    results.classList.add('hidden');
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

    try {
        let apiUrl;
        let fetchOptions = {};

        if (hasUrl) {
            // URL mode — pass as query param
            const encoded = encodeURIComponent(urlInput.value.trim());
            apiUrl = `https://api.trace.moe/search?anilistInfo&url=${encoded}`;
        } else {
            // File mode — POST the raw image bytes
            apiUrl = 'https://api.trace.moe/search?anilistInfo';
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': fileInput.files[0].type },
                body: fileInput.files[0]
            };
        }

        const response = await fetch(apiUrl, fetchOptions);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.result || data.result.length === 0) {
            throw new Error('no_match');
        }

        const top = data.result[0];

        // Build a clean result object from trace.moe + AniList data
        const anime = {
            title:       top.anilist?.title?.english
                      || top.anilist?.title?.romaji
                      || 'Unknown Title',
            episode:     top.episode ?? '—',
            season:      top.anilist?.season
                         ? `${cap(top.anilist.season)} ${top.anilist.seasonYear ?? ''}`
                         : (top.anilist?.seasonYear ?? '—'),
            description: top.anilist?.description
                         ? top.anilist.description.replace(/<[^>]*>/g, '').slice(0, 300) + '…'
                         : 'No description available.',
            image:       top.anilist?.coverImage?.large || '',
            match:       Math.round(top.similarity * 100),
            videoUrl:    top.video   // preview clip from trace.moe
        };

        displayResults(anime);

    } catch (err) {
        emptyState.classList.remove('hidden');
        if (err.message !== 'no_match') {
            console.error('trace.moe error:', err);
        }
    } finally {
        loader.classList.add('hidden');
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Execute Trace';
    }
}

function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

function displayResults(anime) {
    const results    = document.getElementById('sceneResults');
    const animeTitle = document.getElementById('animeTitle');
    const episodeNum = document.getElementById('episodeNum');
    const seasonInfo = document.getElementById('seasonInfo');
    const animeDesc  = document.getElementById('animeDesc');
    const animeImage = document.getElementById('animeImage');
    const matchScore = document.getElementById('matchScore');
    const sceneVideo = document.getElementById('sceneVideo');

    animeTitle.textContent = anime.title;
    episodeNum.textContent = anime.episode;
    seasonInfo.textContent = anime.season;
    animeDesc.textContent  = anime.description;
    animeImage.src         = anime.image;
    matchScore.textContent = `${anime.match}% MATCH`;

    if (anime.match >= 95) {
        matchScore.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
    } else if (anime.match >= 90) {
        matchScore.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
    } else {
        matchScore.style.background = 'linear-gradient(135deg, #ffaa00, #cc8800)';
    }

    // Use the real preview clip from trace.moe if available
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

// Enter key on URL input
const sceneInput = document.getElementById('sceneInput');
if (sceneInput) {
    sceneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchScene();
    });
}

// File input change handler
const fileInput = document.getElementById('fileInput');
if (fileInput) {
    fileInput.addEventListener('change', function() {
        updateFileName(this);
    });
}