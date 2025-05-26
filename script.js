// DOM Elements
const boardsPage = document.getElementById('boards-page');
const threadsPage = document.getElementById('threads-page');
const chatPage = document.getElementById('chat-page');
const boardsList = document.getElementById('boards-list');
const favoriteBoardsList = document.getElementById('favorite-boards-list');
const favoriteBoardsSection = document.getElementById('favorite-boards');
const boardTitle = document.getElementById('board-title');
const threadsList = document.getElementById('threads-list');
const threadTitle = document.getElementById('thread-title');
const chatMessages = document.getElementById('chat-messages');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const zoomImagePreview = document.getElementById('zoom-image-preview');
const replyPreviewPopup = document.getElementById('reply-preview-popup');
const settingsToggleBoards = document.getElementById('settings-toggle-boards');
const darkModeToggleThreads = document.getElementById('dark-mode-toggle-threads');
const darkModeToggleChat = document.getElementById('dark-mode-toggle-chat');
const settingsPopup = document.getElementById('settings-popup');
const settingsClose = document.getElementById('settings-close');
const hoverZoomToggle = document.getElementById('hover-zoom-toggle');
const darkModeToggleSettings = document.getElementById('dark-mode-toggle-settings');
const highContrastToggle = document.getElementById('high-contrast-toggle');
const ipDisplayToggle = document.getElementById('ip-display-toggle');
const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
const favoriteBoardsSelector = document.getElementById('favorite-boards-selector');
const threadTagInput = document.getElementById('thread-tag-input');
const threadTagsList = document.getElementById('thread-tags-list');
const backToBoardsBtn = document.getElementById('back-to-boards-btn');
const backToThreadsBtn = document.getElementById('back-to-threads-btn');
const threadFilter = document.getElementById('thread-filter');
const threadSort = document.getElementById('thread-sort');
const mediaFilter = document.getElementById('media-filter');
const ipDisplay = document.getElementById('ip-display');
const ipAddressDisplay = document.getElementById('ip-address');
const countryFlagDisplay = document.getElementById('country-flag');
const ipDisplayThreads = document.getElementById('ip-display-threads');
const ipAddressThreads = document.getElementById('ip-address-threads');
const countryFlagThreads = document.getElementById('country-flag-threads');
const galleryToggle = document.createElement('button'); // Added for gallery mode

// Constants
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const FALLBACK_PROXY = 'https://corsproxy.io/?';
const API_BASE = 'https://a.4cdn.org/';
const IMAGE_BASE = 'https://i.4cdn.org/';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

// Current date for comparison
const CURRENT_DATE = new Date();

// Settings
let settings = {
    hoverZoom: false,
    darkMode: false,
    highContrast: false,
    showIP: false,
    autoRefresh: false,
    favoriteBoards: [],
    pinnedThreads: [],
    threadTags: [],
    taggedThreads: {},
    watchedThreads: [],
    accentColor: '#007aff',
    readPosts: {}
};

let autoRefreshInterval = null;
let currentBoardCode = '';
let currentThreadNo = null;
let allBoards = [];

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        settings = {
            ...settings,
            ...parsedSettings,
            pinnedThreads: parsedSettings.pinnedThreads || [],
            threadTags: parsedSettings.threadTags || [],
            taggedThreads: parsedSettings.taggedThreads || {},
            watchedThreads: parsedSettings.watchedThreads || [],
            accentColor: parsedSettings.accentColor || '#007aff',
            readPosts: parsedSettings.readPosts || {}
        };
    }
    applySettings();
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Apply settings
function applySettings() {
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        [darkModeToggleSettings, darkModeToggleThreads, darkModeToggleChat].forEach(toggle => {
            if (toggle) {
                toggle.setAttribute('data-checked', 'true');
                toggle.textContent = 'On';
            }
        });
    } else {
        document.body.classList.remove('dark-mode');
        [darkModeToggleSettings, darkModeToggleThreads, darkModeToggleChat].forEach(toggle => {
            if (toggle) {
                toggle.setAttribute('data-checked', 'false');
                toggle.textContent = 'Off';
            }
        });
    }

    if (settings.highContrast) {
        document.body.classList.add('high-contrast');
        if (highContrastToggle) {
            highContrastToggle.setAttribute('data-checked', 'true');
            highContrastToggle.textContent = 'On';
        }
    } else {
        document.body.classList.remove('high-contrast');
        if (highContrastToggle) {
            highContrastToggle.setAttribute('data-checked', 'false');
            highContrastToggle.textContent = 'Off';
        }
    }

    if (hoverZoomToggle) {
        hoverZoomToggle.setAttribute('data-checked', settings.hoverZoom);
        hoverZoomToggle.textContent = settings.hoverZoom ? 'On' : 'Off';
    }

    if (settings.showIP) {
        [ipDisplay, ipDisplayThreads].forEach(display => {
            if (display) display.classList.add('active');
        });
        if (ipDisplayToggle) {
            ipDisplayToggle.setAttribute('data-checked', 'true');
            ipDisplayToggle.textContent = 'On';
        }
    } else {
        [ipDisplay, ipDisplayThreads].forEach(display => {
            if (display) display.classList.remove('active');
        });
        if (ipDisplayToggle) {
            ipDisplayToggle.setAttribute('data-checked', 'false');
            ipDisplayToggle.textContent = 'Off';
        }
    }

    if (settings.autoRefresh && currentBoardCode) {
        startAutoRefresh();
        if (autoRefreshToggle) {
            autoRefreshToggle.setAttribute('data-checked', 'true');
            autoRefreshToggle.textContent = 'On';
        }
    } else {
        stopAutoRefresh();
        if (autoRefreshToggle) {
            autoRefreshToggle.setAttribute('data-checked', 'false');
            autoRefreshToggle.textContent = 'Off';
        }
    }

    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Header Scroll Behavior
let lastScrollTop = 0;
function handleScroll() {
    const headers = document.querySelectorAll('.header');
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    const scrollTop = activePage.scrollTop || window.pageYOffset || document.documentElement.scrollTop;

    headers.forEach(header => {
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
    });

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

[boardsPage, threadsPage, chatPage].forEach(page => {
    if (page) {
        page.addEventListener('scroll', throttle(handleScroll, 100));
    }
});

// Fetch IP address and country flag
async function displayIPAndFlag() {
    if (!settings.showIP) return;
    try {
        const response = await fetchWithRetry('https://ipapi.co/json/');
        const data = await response.json();
        const ip = data.ip.split('.').slice(0, 3).join('.') + '.xxx';
        const countryCode = data.country_code;
        const flag = countryCodeToFlag(countryCode);
        if (ipAddressDisplay) ipAddressDisplay.textContent = ip;
        if (countryFlagDisplay) countryFlagDisplay.textContent = flag;
        if (ipAddressThreads) ipAddressThreads.textContent = ip;
        if (countryFlagThreads) countryFlagThreads.textContent = flag;
    } catch (error) {
        console.error('Error fetching IP:', error);
        if (ipAddressDisplay) ipAddressDisplay.textContent = 'xxx.xxx.xxx';
        if (countryFlagDisplay) countryFlagDisplay.textContent = '🏳️';
        if (ipAddressThreads) ipAddressThreads.textContent = 'xxx.xxx.xxx';
        if (countryFlagThreads) countryFlagThreads.textContent = '🏳️';
    }
}

function countryCodeToFlag(countryCode) {
    const flagMap = {
        'US': '🇺🇸', 'BR': '🇧🇷', 'DE': '🇩🇪', 'FR': '🇫🇷', 'GB': '🇬🇧', 'JP': '🇯🇵',
        'CN': '🇨🇳', 'IN': '🇮🇳', 'RU': '🇷🇺', 'CA': '🇨🇦', 'AU': '🇦🇺', 'ES': '🇪🇸',
        'IT': '🇮🇹', 'KR': '🇰🇷', 'MX': '🇲🇽', 'NL': '🇳🇱', 'SE': '🇸🇪', 'CH': '🇨🇭'
    };
    return flagMap[countryCode] || '❌';
}

// Auto-Refresh Functions
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        if (currentBoardCode) fetchThreads(currentBoardCode);
        if (currentThreadNo && settings.watchedThreads.includes(`${currentBoardCode}:${currentThreadNo}`)) {
            checkThreadForNewReplies(currentBoardCode, currentThreadNo);
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Fetch with retry and timeout
async function fetchWithRetry(url, retries = MAX_RETRIES, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://boards.4chan.org/'
                }
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
        }
    }
}

// Load image with proxy and automatic fallback
async function loadImageWithProxy(boardCode, tim, ext) {
    const baseUrl = `${IMAGE_BASE}${boardCode}/${tim}${ext}`;
    const proxies = [
        { url: `${CORS_PROXY}${baseUrl}`, name: 'primary' },
        { url: `${FALLBACK_PROXY}${baseUrl}`, name: 'fallback' }
    ];

    for (const proxy of proxies) {
        try {
            const response = await fetch(proxy.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://boards.4chan.org/'
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            if (blob.size === 0) throw new Error('Empty response');
            return URL.createObjectURL(blob);
        } catch (error) {
            console.warn(`Image fetch failed with ${proxy.name} proxy for ${baseUrl}:`, error);
        }
    }
    console.error(`All proxies failed for ${baseUrl}`);
    return null; // Return null if all proxies fail
}

// Fetch all boards dynamically
async function fetchBoards() {
    const cacheKey = 'boards';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return cachedData;

    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}boards.json`);
        const data = await response.json();
        setCachedData(cacheKey, data.boards);
        return data.boards || [];
    } catch (error) {
        console.error('Error fetching boards:', error);
        if (boardsList) {
            boardsList.innerHTML = `
                <div class="error-message">
                    Unable to load boards. Please check your connection or try an alternative proxy.
                </div>`;
        }
        return [];
    }
}

// Search Functionality
async function initializeSearch() {
    allBoards = await fetchBoards();
    const boardSearch = document.getElementById('board-search');
    const searchSuggestions = document.getElementById('search-suggestions');

    if (!boardSearch || !searchSuggestions) return;

    boardSearch.addEventListener('input', throttle(() => {
        const query = boardSearch.value.toLowerCase().trim();
        searchSuggestions.innerHTML = '';

        if (query.length === 0) {
            searchSuggestions.classList.remove('active');
            return;
        }

        const filteredBoards = allBoards.filter(board =>
            board.title.toLowerCase().includes(query) ||
            board.board.toLowerCase().includes(query) ||
            (board.meta_description && board.meta_description.toLowerCase().includes(query))
        );

        if (filteredBoards.length > 0) {
            filteredBoards.forEach(board => {
                const suggestion = document.createElement('div');
                suggestion.classList.add('suggestion-item');
                suggestion.innerHTML = `
                    <span>${board.title}</span>
                    <p>${board.meta_description || 'No description'}</p>
                `;
                suggestion.addEventListener('click', () => {
                    boardSearch.value = '';
                    searchSuggestions.classList.remove('active');
                    openThreads(board);
                });
                searchSuggestions.appendChild(suggestion);
            });
            searchSuggestions.classList.add('active');
        } else {
            searchSuggestions.classList.remove('active');
        }
    }, 200));

    document.addEventListener('click', (e) => {
        if (!searchSuggestions.contains(e.target) && e.target !== boardSearch) {
            searchSuggestions.classList.remove('active');
        }
    });

    boardSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchSuggestions.children.length > 0) {
            searchSuggestions.children[0].click();
        }
    });
}

// Load boards on start page
async function loadBoards() {
    if (!boardsList || !favoriteBoardsList || !favoriteBoardsSection) return;
    const boards = await fetchBoards();
    boardsList.innerHTML = '';
    favoriteBoardsList.innerHTML = '';

    const favoriteBoards = boards.filter(board => settings.favoriteBoards.includes(board.board));
    if (favoriteBoards.length > 0) {
        favoriteBoardsSection.classList.add('active');
        favoriteBoards.forEach(board => {
            const boardItem = createBoardItem(board);
            favoriteBoardsList.appendChild(boardItem);
        });
    } else {
        favoriteBoardsSection.classList.remove('active');
    }

    boards.forEach(board => {
        const boardItem = createBoardItem(board);
        boardsList.appendChild(boardItem);
    });

    if (favoriteBoardsSelector) {
        favoriteBoardsSelector.innerHTML = '';
        boards.forEach(board => {
            const item = document.createElement('div');
            item.classList.add('favorite-board-item');
            item.innerHTML = `
                <span>${board.title}</span>
                <input type="checkbox" data-board="${board.board}" ${settings.favoriteBoards.includes(board.board) ? 'checked' : ''}>
            `;
            favoriteBoardsSelector.appendChild(item);
        });

        const checkboxes = favoriteBoardsSelector.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const boardCode = checkbox.getAttribute('data-board');
                if (checkbox.checked) {
                    if (!settings.favoriteBoards.includes(boardCode)) {
                        settings.favoriteBoards.push(boardCode);
                    }
                } else {
                    settings.favoriteBoards = settings.favoriteBoards.filter(code => code !== boardCode);
                }
                saveSettings();
                loadBoards();
            });
        });
    }

    loadThreadTags();
    initializeSearch();
    displayIPAndFlag();
}

function createBoardItem(board) {
    const boardItem = document.createElement('div');
    boardItem.classList.add('board-item');
    boardItem.innerHTML = `
        <div>
            <span>${board.title}</span>
            <p>${board.meta_description || 'No description'}</p>
        </div>
    `;
    boardItem.addEventListener('click', () => openThreads(board));
    return boardItem;
}

function openThreads(board) {
    if (!boardsPage || !threadsPage || !boardTitle) return;
    currentBoardCode = board.board;
    boardsPage.classList.remove('active');
    setTimeout(() => {
        threadsPage.classList.add('active');
        boardTitle.textContent = board.title;
        if (threadsList) threadsList.innerHTML = '';
        fetchThreads(board.board);
        displayIPAndFlag();
        if (settings.autoRefresh) startAutoRefresh();
    }, 300);
}

async function fetchThreads(boardCode) {
    if (!threadsList) return;
    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}${boardCode}/catalog.json`);
        const data = await response.json();
        await filterAndSortThreads(data, boardCode);
    } catch (error) {
        console.error('Error fetching threads:', error);
        threadsList.innerHTML = `
            <div class="error-message">
                Unable to load threads. Please check your connection or try again later.
            </div>`;
    }
}

async function filterAndSortThreads(data, boardCode) {
    if (!threadsList) return;
    const filterQuery = threadFilter?.value.toLowerCase() || '';
    const sortOption = threadSort?.value || 'default';
    const mediaOption = mediaFilter?.value || 'all';
    let threads = [];
    data.forEach(page => threads.push(...page.threads));

    if (filterQuery) {
        threads = threads.filter(thread =>
            (thread.sub?.toLowerCase().includes(filterQuery) ||
             thread.com?.toLowerCase().includes(filterQuery))
        );
    }
    if (mediaOption === 'images') {
        threads = threads.filter(thread => thread.tim && thread.ext.match(/\.(jpg|png|gif)$/));
    } else if (mediaOption === 'videos') {
        threads = threads.filter(thread => thread.tim && thread.ext.match(/\.(mp4|webm)$/));
    }

    if (sortOption === 'replies') {
        threads.sort((a, b) => (b.replies || 0) - (a.replies || 0));
    } else if (sortOption === 'recent') {
        threads.sort((a, b) => (b.last_modified || 0) - (a.last_modified || 0));
    }

    if (settings.pinnedThreads && settings.pinnedThreads.length > 0) {
        threads.sort((a, b) => {
            const aPinned = settings.pinnedThreads.includes(`${boardCode}:${a.no}`) ? 1 : 0;
            const bPinned = settings.pinnedThreads.includes(`${boardCode}:${b.no}`) ? 1 : 0;
            return bPinned - aPinned;
        });
    }

    await displayThreads(threads, boardCode);
}

function togglePinThread(boardCode, threadNo) {
    const threadId = `${boardCode}:${threadNo}`;
    if (settings.pinnedThreads.includes(threadId)) {
        settings.pinnedThreads = settings.pinnedThreads.filter(id => id !== threadId);
    } else {
        settings.pinnedThreads.push(threadId);
    }
    saveSettings();
    fetchThreads(boardCode);
}

function toggleWatchThread(boardCode, threadNo) {
    const threadId = `${boardCode}:${threadNo}`;
    if (settings.watchedThreads.includes(threadId)) {
        settings.watchedThreads = settings.watchedThreads.filter(id => id !== threadId);
    } else {
        settings.watchedThreads.push(threadId);
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }
    saveSettings();
    updateThreadDisplay(boardCode, threadNo);
}

async function checkThreadForNewReplies(boardCode, threadNo) {
    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${threadNo}.json`);
        const data = await response.json();
        const threadId = `${boardCode}:${threadNo}`;
        const lastRead = settings.readPosts[threadId] || 0;
        const newPosts = data.posts.filter(post => post.time > lastRead);
        if (newPosts.length > 0 && Notification.permission === 'granted') {
            new Notification(`New replies in thread #${threadNo}`, {
                body: `${newPosts.length} new post(s) in ${threadId}`,
                icon: 'assets/images/favicon.ico'
            });
        }
    } catch (error) {
        console.error('Error checking watched thread:', error);
    }
}

function toggleThreadTag(boardCode, threadNo, tag) {
    const threadId = `${boardCode}:${threadNo}`;
    if (!settings.taggedThreads[threadId]) {
        settings.taggedThreads[threadId] = [];
    }
    if (settings.taggedThreads[threadId].includes(tag)) {
        settings.taggedThreads[threadId] = settings.taggedThreads[threadId].filter(t => t !== tag);
        if (settings.taggedThreads[threadId].length === 0) {
            delete settings.taggedThreads[threadId];
        }
    } else {
        settings.taggedThreads[threadId].push(tag);
    }
    saveSettings();
    updateThreadDisplay(boardCode, threadNo);
}

function updateThreadDisplay(boardCode, threadNo) {
    if (currentBoardCode === boardCode) {
        fetchThreads(boardCode);
    }
}

function loadThreadTags() {
    if (!threadTagsList) return;
    threadTagsList.innerHTML = '';
    settings.threadTags.forEach((tag, index) => {
        const item = document.createElement('div');
        item.classList.add('thread-tag-item');
        item.style.animationDelay = `${index * 0.05}s`;
        item.innerHTML = `
            <span>${tag}</span>
            <button class="delete-tag" data-tag="${tag}"><i class="fas fa-trash"></i></button>
        `;
        threadTagsList.appendChild(item);
    });

    const deleteButtons = threadTagsList.querySelectorAll('.delete-tag');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tag = button.getAttribute('data-tag');
            settings.threadTags = settings.threadTags.filter(t => t !== tag);
            Object.keys(settings.taggedThreads).forEach(threadId => {
                settings.taggedThreads[threadId] = settings.taggedThreads[threadId].filter(t => t !== tag);
                if (settings.taggedThreads[threadId].length === 0) {
                    delete settings.taggedThreads[threadId];
                }
            });
            saveSettings();
            loadThreadTags();
        });
    });
}

function addThreadTag() {
    if (!threadTagInput) return;
    const tag = threadTagInput.value.trim();
    if (tag && !settings.threadTags.includes(tag)) {
        settings.threadTags.push(tag);
        saveSettings();
        loadThreadTags();
        threadTagInput.value = '';
    }
}

async function displayThreads(threads, boardCode) {
    if (!threadsList) return;
    threadsList.innerHTML = '';
    const threadPromises = threads.map(async (thread, index) => {
        const threadItem = document.createElement('div');
        threadItem.classList.add('thread-item');
        const threadId = `${boardCode}:${thread.no}`;
        if (settings.pinnedThreads.includes(threadId)) {
            threadItem.classList.add('pinned');
        }
        if (thread.tim && thread.ext) {
            threadItem.classList.add('has-image');
            const src = await loadImageWithProxy(boardCode, thread.tim, thread.ext);
            if (src) {
                threadItem.style.backgroundImage = `url(${src})`;
                threadItem.classList.add(Math.random() > 0.5 ? 'light-text' : 'dark-text');
            } else {
                threadItem.classList.add('dark-text'); // Fallback style if image fails
            }
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content');

        const title = thread.sub || `Thread #${thread.no}`;
        const titleDiv = document.createElement('div');
        titleDiv.classList.add('thread-title');
        titleDiv.textContent = title;

        const usernameDiv = document.createElement('div');
        usernameDiv.classList.add('username');
        usernameDiv.textContent = thread.name || 'Anonymous';

        let previewText = thread.com ? thread.com.replace(/<[^>]+>/g, '').substring(0, 50) : '';
        if (previewText.length >= 50) previewText += '...';
        const previewDiv = document.createElement('div');
        previewDiv.classList.add('thread-preview');
        previewDiv.textContent = previewText || 'No preview available';

        const tags = settings.taggedThreads[threadId] || [];
        if (tags.length > 0) {
            const tagsDiv = document.createElement('div');
            tagsDiv.classList.add('thread-tags');
            tagsDiv.textContent = `Tags: ${tags.join(', ')}`;
            contentDiv.appendChild(tagsDiv);
        }

        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('thread-buttons');
        const pinButton = document.createElement('button');
        pinButton.textContent = settings.pinnedThreads.includes(threadId) ? 'Unpin' : 'Pin';
        pinButton.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinThread(boardCode, thread.no);
        });

        const watchButton = document.createElement('button');
        watchButton.textContent = settings.watchedThreads.includes(threadId) ? 'Unwatch' : 'Watch';
        watchButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWatchThread(boardCode, thread.no);
        });

        buttonsDiv.appendChild(pinButton);
        buttonsDiv.appendChild(watchButton);
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(usernameDiv);
        contentDiv.appendChild(previewDiv);
        contentDiv.appendChild(buttonsDiv);
        threadItem.appendChild(contentDiv);

        threadItem.addEventListener('click', () => openThread(boardCode, thread));
        threadItem.setAttribute('data-index', index);
        return threadItem;
    });

    const threadItems = await Promise.all(threadPromises);
    threadItems.forEach(item => threadsList.appendChild(item));
}

async function openThread(boardCode, thread) {
    if (!threadsPage || !chatPage || !threadTitle || !chatMessages) return;
    currentThreadNo = thread.no;
    threadsPage.classList.remove('active');
    setTimeout(async () => {
        chatPage.classList.add('active');
        threadTitle.textContent = thread.sub || `Thread #${thread.no}`;
        chatMessages.innerHTML = '';

        const isArchived = await checkThreadArchived(boardCode, thread.no);
        if (isArchived) {
            chatMessages.innerHTML = `
                <div class="error-message">
                    This thread is archived and no longer accepts new replies.
                </div>`;
        }

        const header = chatPage.querySelector('.header .header-buttons');
        if (header) {
            galleryToggle.innerHTML = '<i class="fas fa-images"></i>';
            galleryToggle.classList.add('gallery-toggle');
            galleryToggle.addEventListener('click', () => toggleGalleryMode(boardCode));
            header.appendChild(galleryToggle);
        }

        fetchThreadMessages(boardCode, thread.no);
        stopAutoRefresh();
    }, 300);
}

async function checkThreadArchived(boardCode, threadNo) {
    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${threadNo}.json`);
        return response.status === 404;
    } catch (error) {
        return true;
    }
}

function toggleGalleryMode(boardCode) {
    const isGalleryActive = chatMessages.classList.contains('gallery-mode');
    chatMessages.classList.toggle('gallery-mode');
    galleryToggle.textContent = isGalleryActive ? 'Images' : 'Messages';
    if (isGalleryActive) {
        fetchThreadMessages(boardCode, currentThreadNo);
    } else {
        displayGallery(boardCode);
    }
}

async function displayGallery(boardCode) {
    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${currentThreadNo}.json`);
        const data = await response.json();
        chatMessages.innerHTML = '';
        const imagePromises = data.posts
            .filter(post => post.tim && post.ext)
            .map(async post => {
                const imgDiv = document.createElement('div');
                imgDiv.classList.add('gallery-image');
                const src = await loadImageWithProxy(boardCode, post.tim, post.ext);
                if (src) {
                    const baseUrl = `${IMAGE_BASE}${boardCode}/${post.tim}${post.ext}`;
                    imgDiv.innerHTML = `<img src="${src}" data-fullsrc="${baseUrl}" onerror="this.style.display='none'">`;
                    const img = imgDiv.querySelector('img');
                    img.addEventListener('click', () => openImageModal(baseUrl));
                }
                return imgDiv;
            });

        const imageDivs = await Promise.all(imagePromises);
        imageDivs.forEach(div => chatMessages.appendChild(div));
    } catch (error) {
        console.error('Error fetching gallery images:', error);
        chatMessages.innerHTML = `
            <div class="error-message">
                Unable to load images. Please try again later.
            </div>`;
    }
}

function submitQuickReply(boardCode, threadNo) {
    const replyText = document.getElementById('quick-reply-text')?.value.trim();
    if (!replyText) return;
    alert(`Simulated reply to thread #${threadNo}: ${replyText}`);
    document.getElementById('quick-reply-text').value = '';
}

async function fetchThreadMessages(boardCode, threadNo) {
    try {
        const response = await fetchWithRetry(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${threadNo}.json`);
        const data = await response.json();
        await displayMessages(boardCode, data.posts);
        const threadId = `${boardCode}:${threadNo}`;
        const latestPostTime = Math.max(...data.posts.map(post => post.time));
        settings.readPosts[threadId] = latestPostTime;
        saveSettings();
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        chatMessages.innerHTML = `
            <div class="error-message">
                Unable to load messages. Please check your connection or try again later.
            </div>`;
    }
}

function formatTimestamp(unixTime) {
    const date = new Date(unixTime * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const currentDay = CURRENT_DATE.getDate();
    const currentMonth = CURRENT_DATE.getMonth();
    const currentYear = CURRENT_DATE.getFullYear();
    const postDay = date.getDate();
    const postMonth = date.getMonth();
    const postYear = date.getFullYear();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (postDay === currentDay && postMonth === currentMonth && postYear === currentYear) {
        return `${hours}:${minutes}`;
    } else {
        return `${hours}:${minutes} - ${postDay} ${months[postMonth]}`;
    }
}

function sanitizeComment(comment) {
    if (!comment) return '';
    const div = document.createElement('div');
    div.innerHTML = comment;
    let text = div.textContent || div.innerText || '';
    const lines = text.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('>') && !line.startsWith('>>')) {
            return `<span class="greentext">${line}</span>`;
        } else if (line.startsWith('>>')) {
            const match = line.match(/>>(\d+)/);
            if (match) {
                return `<span class="reply-link" data-post-no="${match[1]}">${line}</span>`;
            }
        }
        return `<p>${line}</p>`;
    });
    return lines.join('');
}

async function displayMessages(boardCode, posts) {
    if (!chatMessages) return;
    const postMap = new Map();
    const threadId = `${boardCode}:${currentThreadNo}`;
    const lastRead = settings.readPosts[threadId] || 0;

    posts.forEach(post => postMap.set(post.no, post));

    const postPromises = posts.map(async post => appendMessageWithReplies(boardCode, post, postMap, lastRead));
    await Promise.all(postPromises);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    const replyLinks = chatMessages.querySelectorAll('.reply-link');
    replyLinks.forEach(link => {
        link.addEventListener('mouseenter', (e) => showReplyPreview(link, postMap, boardCode, e));
        link.addEventListener('mousemove', (e) => updateReplyPreviewPosition(e));
        link.addEventListener('mouseleave', hideReplyPreview);
        link.addEventListener('click', () => {
            const postNo = link.getAttribute('data-post-no');
            scrollToPost(postNo);
        });
    });
}

async function appendMessageWithReplies(boardCode, post, postMap, lastRead) {
    if (!chatMessages) return;
    const message = document.createElement('div');
    message.id = `post-${post.no}`;
    
    const commentText = sanitizeComment(post.com);
    const startsWithReplyLink = commentText.match(/^<span class="reply-link"/);
    const isReply = startsWithReplyLink || (post.com && post.com.match(/>>(\d+)/));

    message.classList.add('message');
    if (isReply) {
        message.classList.add('reply');
        if (startsWithReplyLink) {
            message.classList.add('reply-link-start');
        }
    } else {
        message.classList.add('received');
    }

    let commentHtml = commentText;
    if (commentHtml) {
        const replyRegex = />>(\d+)/g;
        commentHtml = commentHtml.replace(replyRegex, (match, postNo) => {
            return `<span class="reply-link" data-post-no="${postNo}">${match}</span>`;
        });
    }

    let previewHtml = '';
    if (isReply) {
        const replyMatch = post.com.match(/>>(\d+)/);
        if (replyMatch) {
            const referencedPostNo = parseInt(replyMatch[1]);
            const referencedPost = postMap.get(referencedPostNo);
            if (referencedPost) {
                let previewText = sanitizeComment(referencedPost.com);
                previewText = previewText.replace(/<[^>]+>/g, '').substring(0, 47) + (previewText.length > 47 ? '...' : '');
                previewHtml = `<div class="reply-preview">`;
                if (referencedPost.tim && referencedPost.ext) {
                    const src = await loadImageWithProxy(boardCode, referencedPost.tim, referencedPost.ext);
                    const baseUrl = `${IMAGE_BASE}${boardCode}/${referencedPost.tim}${referencedPost.ext}`;
                    if (src) {
                        previewHtml += `<img src="${src}" data-fullsrc="${baseUrl}" onerror="this.style.display='none'">`;
                    }
                }
                previewHtml += `<span>${previewText}</span></div>`;
            }
        }
    }

    let html = `
        <div class="username">${post.name || 'Anonymous'} #${post.no}<span class="timestamp">${formatTimestamp(post.time)}</span></div>
    `;
    if (commentHtml && !(post.tim && post.ext && !post.com)) {
        html += `<div class="message-content">${commentHtml}</div>`;
    }
    if (post.tim && post.ext) {
        const src = await loadImageWithProxy(boardCode, post.tim, post.ext);
        const baseUrl = `${IMAGE_BASE}${boardCode}/${post.tim}${post.ext}`;
        if (src) {
            html += `
                <img src="${src}" data-fullsrc="${baseUrl}" onerror="this.style.display='none'" class="message-image">
            `;
        }
    }

    message.innerHTML = previewHtml + html;
    chatMessages.appendChild(message);

    const img = message.querySelector('img.message-image');
    if (img) {
        img.addEventListener('click', () => openImageModal(img.getAttribute('data-fullsrc') || img.src));
        if (settings.hoverZoom) {
            img.addEventListener('mouseenter', (e) => showZoomPreview(img, e));
            img.addEventListener('mouseleave', hideZoomPreview);
            img.addEventListener('mousemove', moveZoomPreview);
        }
    }
}

async function showReplyPreview(link, postMap, boardCode, e) {
    if (!replyPreviewPopup) return;
    const postNo = link.getAttribute('data-post-no');
    const post = postMap.get(postNo);
    if (!post) return;

    let html = `<div><strong>${post.name || 'Anonymous'} #${post.no}</strong> <span>${formatTimestamp(post.time)}</span></div>`;
    const commentText = sanitizeComment(post.com);
    if (commentText) {
        html += `<div>${commentText.replace(/<span class="reply-link"[^>]+>[^<]+<\/span>/g, '')}</div>`;
    }
    if (post.tim && post.ext) {
        const src = await loadImageWithProxy(boardCode, post.tim, post.ext);
        const baseUrl = `${IMAGE_BASE}${boardCode}/${post.tim}${post.ext}`;
        if (src) {
            html += `<img src="${src}" data-fullsrc="${baseUrl}" onerror="this.style.display='none'">`;
        }
    }

    replyPreviewPopup.innerHTML = html;
    replyPreviewPopup.classList.add('active');
    replyPreviewPopup.style.display = 'block';
    updateReplyPreviewPosition(e);
}

function updateReplyPreviewPosition(e) {
    if (!replyPreviewPopup) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const offset = 20;

    let left = e.pageX + offset;
    let top = e.pageY + offset;

    const popupRect = replyPreviewPopup.getBoundingClientRect();
    if (left + popupRect.width > viewportWidth - offset) {
        left = e.pageX - popupRect.width - offset;
    }
    if (top + popupRect.height > viewportHeight - offset) {
        top = e.pageY - popupRect.height - offset;
    }
    if (left < offset) left = offset;
    if (top < offset) top = offset;

    replyPreviewPopup.style.left = `${left}px`;
    replyPreviewPopup.style.top = `${top}px`;
}

function hideReplyPreview() {
    if (!replyPreviewPopup) return;
    replyPreviewPopup.classList.remove('active');
    replyPreviewPopup.style.display = 'none';
    replyPreviewPopup.innerHTML = '';
}

function showZoomPreview(img, e) {
    if (!settings.hoverZoom || !zoomImagePreview) return;
    const fullSrc = img.getAttribute('data-fullsrc') || img.src;
    zoomImagePreview.innerHTML = `<img src="${fullSrc}">`;
    zoomImagePreview.style.display = 'block';
    moveZoomPreview(e);
}

function hideZoomPreview() {
    if (!zoomImagePreview) return;
    zoomImagePreview.style.display = 'none';
    zoomImagePreview.innerHTML = '';
}

function moveZoomPreview(e) {
    if (!settings.hoverZoom || !zoomImagePreview) return;
    const preview = zoomImagePreview.querySelector('img');
    if (!preview) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const offset = 20;

    let left = e.pageX + offset;
    let top = e.pageY + offset;

    const previewRect = zoomImagePreview.getBoundingClientRect();
    if (left + previewRect.width > viewportWidth - offset) {
        left = e.pageX - previewRect.width - offset;
    }
    if (top + previewRect.height > viewportHeight - offset) {
        top = e.pageY - previewRect.height - offset;
    }
    if (left < offset) left = offset;
    if (top < offset) top = offset;

    zoomImagePreview.style.left = `${left}px`;
    zoomImagePreview.style.top = `${top}px`;
}

function scrollToPost(postNo) {
    const postElement = document.getElementById(`post-${postNo}`);
    if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postElement.style.backgroundColor = '#d0e7ff';
        setTimeout(() => {
            postElement.style.backgroundColor = '';
        }, 1000);
    }
}

function openImageModal(src) {
    if (!modalImage || !imageModal) return;
    modalImage.src = src;
    imageModal.classList.add('active');
}

function closeImageModal() {
    if (!modalImage || !imageModal) return;
    imageModal.classList.remove('active');
    modalImage.src = '';
}

function toggleSettingsPopup() {
    if (!settingsPopup) return;
    settingsPopup.classList.toggle('active');
    if (settingsPopup.classList.contains('active')) {
        loadAccentColorPicker();
    }
}

function loadAccentColorPicker() {
    const settingsContent = settingsPopup.querySelector('.settings-content');
    if (!settingsContent) return;
    const existingPicker = settingsContent.querySelector('#accent-color-picker');
    if (existingPicker) return;

    const colorItem = document.createElement('div');
    colorItem.classList.add('settings-item');
    colorItem.innerHTML = `
        <label for="accent-color-picker">Accent Color</label>
        <input type="color" id="accent-color-picker" value="${settings.accentColor}">
    `;
    settingsContent.appendChild(colorItem);

    const colorPicker = colorItem.querySelector('#accent-color-picker');
    colorPicker.addEventListener('change', () => {
        settings.accentColor = colorPicker.value;
        saveSettings();
        applySettings();
    });
}

function handleKeyboardNavigation(e) {
    if (e.key === 'Escape') {
        if (chatPage.classList.contains('active')) {
            backToThreadsBtn.click();
        } else if (threadsPage.classList.contains('active')) {
            backToBoardsBtn.click();
        } else if (settingsPopup.classList.contains('active')) {
            settingsClose.click();
        }
    } else if (threadsPage.classList.contains('active') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const threadItems = threadsList.querySelectorAll('.thread-item');
        let currentIndex = Array.from(threadItems).findIndex(item => item.classList.contains('focused'));
        if (currentIndex === -1) currentIndex = 0;

        threadItems.forEach(item => item.classList.remove('focused'));
        if (e.key === 'ArrowRight') {
            currentIndex = Math.min(currentIndex + 1, threadItems.length - 1);
        } else if (e.key === 'ArrowLeft') {
            currentIndex = Math.max(currentIndex - 1, 0);
        }
        threadItems[currentIndex].classList.add('focused');
        threadItems[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (e.key === 'Enter') {
            threadItems[currentIndex].click();
        }
    }
}

function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
    }
    return data;
}

function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

if (backToBoardsBtn) {
    backToBoardsBtn.addEventListener('click', () => {
        if (!threadsPage || !boardsPage) return;
        threadsPage.classList.remove('active');
        setTimeout(() => {
            boardsPage.classList.add('active');
            stopAutoRefresh();
        }, 300);
    });
}

if (backToThreadsBtn) {
    backToThreadsBtn.addEventListener('click', () => {
        if (!chatPage || !threadsPage) return;
        chatPage.classList.remove('active');
        setTimeout(() => {
            threadsPage.classList.add('active');
            if (settings.autoRefresh) startAutoRefresh();
            chatPage.querySelector('.quick-reply-form')?.remove();
            galleryToggle.remove();
        }, 300);
    });
}

if (imageModal) {
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            closeImageModal();
        }
    });
}

if (settingsToggleBoards) {
    settingsToggleBoards.addEventListener('click', toggleSettingsPopup);
}

if (settingsClose) {
    settingsClose.addEventListener('click', toggleSettingsPopup);
}

if (darkModeToggleSettings) {
    darkModeToggleSettings.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        saveSettings();
        applySettings();
    });
}

if (darkModeToggleThreads) {
    darkModeToggleThreads.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        saveSettings();
        applySettings();
    });
}

if (darkModeToggleChat) {
    darkModeToggleChat.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        saveSettings();
        applySettings();
    });
}

if (hoverZoomToggle) {
    hoverZoomToggle.addEventListener('click', () => {
        settings.hoverZoom = !settings.hoverZoom;
        saveSettings();
        applySettings();
    });
}

if (highContrastToggle) {
    highContrastToggle.addEventListener('click', () => {
        settings.highContrast = !settings.highContrast;
        saveSettings();
        applySettings();
    });
}

if (ipDisplayToggle) {
    ipDisplayToggle.addEventListener('click', () => {
        settings.showIP = !settings.showIP;
        saveSettings();
        applySettings();
        if (settings.showIP) displayIPAndFlag();
    });
}

if (autoRefreshToggle) {
    autoRefreshToggle.addEventListener('click', () => {
        settings.autoRefresh = !settings.autoRefresh;
        saveSettings();
        applySettings();
    });
}

if (threadTagInput) {
    threadTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addThreadTag();
        }
    });
}

if (threadFilter) {
    threadFilter.addEventListener('input', throttle(() => fetchThreads(currentBoardCode), 300));
}

if (threadSort) {
    threadSort.addEventListener('change', () => fetchThreads(currentBoardCode));
}

if (mediaFilter) {
    mediaFilter.addEventListener('change', () => fetchThreads(currentBoardCode));
}

document.addEventListener('keydown', handleKeyboardNavigation);

// Initialize
loadSettings();
loadBoards();
