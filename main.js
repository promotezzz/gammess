// LocalStorage key for persisting user-added games
const STORAGE_KEY = "portal_games_list";

// Retrieve games from localStorage
let gamesList = [];
try {
    const saved = localStorage.getItem(STORAGE_KEY);
    gamesList = saved ? JSON.parse(saved) : [];
} catch (e) {
    console.error("Failed to load games from storage:", e);
    gamesList = [];
}

// Panic configuration
const PANIC_REDIRECT_URL = "https://classroom.google.com";

// DOM Elements - Main Shell
const appContainer = document.getElementById("app-container");
const navTabs = document.querySelectorAll(".nav-tab");
const viewPanels = document.querySelectorAll(".view-panel");
const panicBtn = document.getElementById("panic-btn");

// DOM Elements - Home View
const homeView = document.getElementById("home-view");
const digitalClock = document.getElementById("digital-clock");
const currentDate = document.getElementById("current-date");
const webSearchInput = document.getElementById("web-search-input");

// DOM Elements - Library View
const libraryView = document.getElementById("library-view");
const gamesGrid = document.getElementById("games-grid");
const noResults = document.getElementById("no-results");
const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");

// DOM Elements - Add Game Panel
const addGameToggle = document.getElementById("add-game-toggle");
const addGameForm = document.getElementById("add-game-form");
const gameTitleInput = document.getElementById("new-game-title");
const gameUrlInput = document.getElementById("new-game-url");
const gameCategorySelect = document.getElementById("new-game-category");
const saveGameBtn = document.getElementById("save-game-btn");
const cancelGameBtn = document.getElementById("cancel-game-btn");

// DOM Elements - Game Player
const gamePlayer = document.getElementById("game-player");
const gameFrame = document.getElementById("game-frame");
const playingTitle = document.getElementById("playing-title");
const closeGameBtn = document.getElementById("close-game-btn");
const playerPanicBtn = document.getElementById("player-panic-btn");

let currentCategory = "all";
let searchQuery = "";

// Initialize App
function init() {
    registerServiceWorker();
    renderGames();
    setupEventListeners();
    setupFaviconCloak();
    startClock();
}

// Register Ultraviolet Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.__uv$config) {
        navigator.serviceWorker.register('/uv/uv.sw.js', {
            scope: __uv$config.prefix
        }).then(() => {
            console.log("Ultraviolet Service Worker registered successfully.");
        }).catch(err => {
            console.error("Ultraviolet Service Worker registration failed:", err);
        });
    } else {
        console.warn("Service Workers not supported, or Ultraviolet configuration missing.");
    }
}

// Render games list based on search and category filters
function renderGames() {
    gamesGrid.innerHTML = "";
    
    const filteredGames = gamesList.filter(game => {
        const matchesCategory = currentCategory === "all" || game.category === currentCategory;
        const matchesSearch = game.title.toLowerCase().includes(searchQuery) || 
                              (game.description && game.description.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    if (filteredGames.length === 0) {
        noResults.classList.remove("hidden");
        if (gamesList.length === 0) {
            noResults.innerHTML = `<p>Your library is empty.</p><button id="empty-add-btn" class="text-btn">+ add a game</button>`;
            document.getElementById("empty-add-btn")?.addEventListener("click", toggleAddForm);
        } else {
            noResults.innerHTML = `<p>No games found matching your search.</p>`;
        }
        gamesGrid.classList.add("hidden");
    } else {
        noResults.classList.add("hidden");
        gamesGrid.classList.remove("hidden");
        
        filteredGames.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";
            card.dataset.id = game.id;
            card.innerHTML = `
                <div class="game-info">
                    <span class="game-title">${game.title}</span>
                    <span class="game-desc">${game.url}</span>
                </div>
                <div class="game-meta">
                    <span class="game-category">${game.category}</span>
                    <button class="delete-game-btn text-btn" data-id="${game.id}" title="Remove game">&times;</button>
                    <span class="game-play-indicator">play &rarr;</span>
                </div>
            `;
            
            // Delete button handler
            const deleteBtn = card.querySelector(".delete-game-btn");
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteGame(game.id);
            });

            // Card click launches the game
            card.addEventListener("click", () => launchGame(game));
            gamesGrid.appendChild(card);
        });
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Navigation Tab Toggling
    navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetView = tab.dataset.view;
            switchView(targetView);
        });
    });

    // Home View Search - Proxy Submission via Ultraviolet
    webSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const query = webSearchInput.value.trim();
            if (query) {
                searchInProxy(query);
            }
        }
    });

    // Search input handler
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderGames();
    });

    // Category filters handler
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.category;
            renderGames();
        });
    });

    // Close active game player
    closeGameBtn.addEventListener("click", closeGame);

    // Panic button click triggers
    panicBtn.addEventListener("click", triggerPanic);
    playerPanicBtn.addEventListener("click", triggerPanic);

    // Form handlers
    addGameToggle.addEventListener("click", toggleAddForm);
    cancelGameBtn.addEventListener("click", toggleAddForm);
    saveGameBtn.addEventListener("click", saveCustomGame);

    // Global Key Listener (Escape for Panic & Close Game)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!gamePlayer.classList.contains("hidden")) {
                closeGame();
            } else {
                triggerPanic();
            }
        }
    });
}

// Switch view dashboards
function switchView(viewName) {
    navTabs.forEach(t => {
        if (t.dataset.view === viewName) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });

    viewPanels.forEach(panel => {
        if (panel.id === `${viewName}-view`) {
            panel.classList.remove("hidden");
        } else {
            panel.classList.add("hidden");
        }
    });
}

// Web Proxy search executor using Ultraviolet
function searchInProxy(query) {
    if (!window.__uv$config) {
        alert("Ultraviolet configuration has not finished loading.");
        return;
    }

    document.title = "Search - Google Docs";
    playingTitle.textContent = "proxy search";
    
    appContainer.classList.add("hidden");
    gamePlayer.classList.remove("hidden");
    
    // Resolve query to valid target URL
    const targetUrl = getSearchUrl(query);
    
    // Encode URL using Ultraviolet's XOR codec and prefix
    const proxiedUrl = window.location.origin + __uv$config.prefix + __uv$config.encodeUrl(targetUrl);
    
    // Set frame src to load the Ultraviolet client interface
    gameFrame.src = proxiedUrl;
    
    // Clear search input on home
    webSearchInput.value = "";
    
    setTimeout(() => {
        gameFrame.focus();
    }, 100);
}

// Helper to check if string is URL, otherwise search query
function getSearchUrl(query) {
    const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    if (urlPattern.test(query)) {
        if (!query.startsWith('http://') && !query.startsWith('https://')) {
            return 'https://' + query;
        }
        return query;
    }
    return 'https://www.google.com/search?q=' + encodeURIComponent(query);
}

// Toggle display of Add Game inline form
function toggleAddForm() {
    if (addGameForm.classList.contains("hidden")) {
        addGameForm.classList.remove("hidden");
        addGameToggle.textContent = "cancel";
        gameTitleInput.focus();
    } else {
        addGameForm.classList.add("hidden");
        addGameToggle.textContent = "+ add game";
        clearForm();
    }
}

// Clear input form
function clearForm() {
    gameTitleInput.value = "";
    gameUrlInput.value = "";
    gameCategorySelect.value = "arcade";
}

// Save custom game to list and persist
function saveCustomGame() {
    const title = gameTitleInput.value.trim();
    let url = gameUrlInput.value.trim();
    const category = gameCategorySelect.value;

    if (!title || !url) {
        alert("Please enter both a title and URL.");
        return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    const newGame = {
        id: "custom_" + Date.now(),
        title,
        url,
        category
    };

    gamesList.push(newGame);
    saveToStorage();
    renderGames();
    toggleAddForm();
}

// Remove game from list
function deleteGame(id) {
    if (confirm("Are you sure you want to remove this game?")) {
        gamesList = gamesList.filter(game => game.id !== id);
        saveToStorage();
        renderGames();
    }
}

// Save current list to localStorage
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gamesList));
    } catch (e) {
        console.error("Failed to save games list to storage:", e);
    }
}

// Launch Game in Iframe through Ultraviolet Proxy
function launchGame(game) {
    if (!window.__uv$config) {
        alert("Ultraviolet configuration is missing.");
        return;
    }

    document.title = `${game.title} - Google Docs`;
    playingTitle.textContent = game.title.toLowerCase();
    
    // Route game URL through Ultraviolet Proxy
    const proxiedUrl = window.location.origin + __uv$config.prefix + __uv$config.encodeUrl(game.url);
    
    gameFrame.src = proxiedUrl;
    appContainer.classList.add("hidden");
    gamePlayer.classList.remove("hidden");
    
    setTimeout(() => {
        gameFrame.focus();
    }, 100);
}

// Close active game and return to dashboard
function closeGame() {
    gamePlayer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    gameFrame.src = "";
    document.title = "can games";
}

// Trigger Panic Redirect
function triggerPanic() {
    window.location.replace(PANIC_REDIRECT_URL);
}

// Digital Clock & Date Update Functions
function startClock() {
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        digitalClock.textContent = `${hours}:${minutes}:${seconds}`;
        
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// Optional Favicon Cloaker
function setupFaviconCloak() {
    const favicon = document.getElementById("favicon");
    if (favicon) {
        favicon.href = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
    }
}

// Launch on DOM load
document.addEventListener("DOMContentLoaded", init);
