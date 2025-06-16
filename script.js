// DOM Elements
const boardsPage = document.getElementById('boards-page');
const threadsPage = document.getElementById('threads-page');
const chatPage = document.getElementById('chat-page');
const boardsList = document.getElementById('boards-list');
const favoriteBoardsList = document.getElementById('favorite-boards-list');
const favoriteBoardsSection = document.getElementById('favorite-boards');
const boardsNavList = document.getElementById('boards-nav-list');
const favoriteBoardsNavList = document.getElementById('favorite-boards-nav-list');
const boardTitle = document.getElementById('board-title');
const threadsList = document.getElementById('threads-list');
const threadTitle = document.getElementById('thread-title');
const chatMessages = document.getElementById('chat-messages');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const zoomImagePreview = document.getElementById('zoom-image-preview');
const replyPreviewPopup = document.getElementById('reply-preview-popup');
const settingsDialog = document.getElementById('settings-dialog');
const settingsClose = document.getElementById('settings-close');
const hoverZoomToggle = document.getElementById('hover-zoom-toggle');
const darkModeToggleSettings = document.getElementById('dark-mode-toggle-settings');
const darkModeToggleBoards = document.getElementById('dark-mode-toggle-boards');
const darkModeToggleThreads = document.getElementById('dark-mode-toggle-threads');
const darkModeToggleChat = document.getElementById('dark-mode-toggle-chat');
const highContrastToggle = document.getElementById('high-contrast-toggle');
const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
const favoriteBoardsSelector = document.getElementById('favorite-boards-selector');
const threadTagInput = document.getElementById('thread-tag-input');
const threadTagsList = document.getElementById('thread-tags-list');
const backToBoardsBtn = document.getElementById('back-to-boards-btn');
const backToThreadsBtn = document.getElementById('back-to-threads-btn');
const threadFilter = document.getElementById('thread-filter');
const threadSort = document.getElementById('thread-sort');
const mediaFilter = document.getElementById('media-filter');
const corsProxyPrompt = document.getElementById('cors-proxy-prompt');
const corsProxyBtn = document.getElementById('cors-proxy-btn');
const navDrawer = document.getElementById('nav-drawer');
const openNavBtn = document.getElementById('open-nav-btn');
const closeNavBtn = document.getElementById('close-nav-btn');
const settingsToggleBoards = document.getElementById('settings-toggle-boards');
const settingsToggleThreads = document.getElementById('settings-toggle-threads');
const settingsToggleChat = document.getElementById('settings-toggle-chat');
const closeImageModal = document.getElementById('close-image-modal');

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_BASE = 'https://a.4cdn.org/';

// Current date for comparison
const CURRENT_DATE = new Date('2025-06-16');

let settings = {
    hoverZoom: true,
    darkMode: false,
    highContrast: false,
    autoRefresh: false,
    favoriteBoards: [],
    pinnedThreads: [],
    threadTags: [],
    taggedThreads: {},
    hasRequestedCors: false
};

let autoRefreshInterval = null;
let currentBoardCode = '';
let threadCache = new Map();

function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            settings = {
                ...settings,
                ...parsedSettings,
                favoriteBoards: parsedSettings.favoriteBoards || [],
                pinnedThreads: parsedSettings.pinnedThreads || [],
                threadTags: parsedSettings.threadTags || [],
                taggedThreads: parsedSettings.taggedThreads || {}
            };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    applySettings();
    checkCorsProxyAccess();
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Apply settings
function applySettings() {
    document.body.classList.toggle('dark-mode', settings.darkMode);
    [darkModeToggleSettings, darkModeToggleBoards, darkModeToggleThreads, darkModeToggleChat].forEach(toggle => {
        if (toggle) {
            toggle.checked = settings.darkMode;
            const icon = toggle.querySelector('.icon');
            if (icon) {
                icon.src = settings.darkMode ? 'assets/symbols/contrast.svg' : 'assets/symbols/moon-stars.svg';
            }
        }
    });

    document.body.classList.toggle('high-contrast', settings.highContrast);
    if (highContrastToggle) highContrastToggle.checked = settings.highContrast;

    if (hoverZoomToggle) hoverZoomToggle.checked = settings.hoverZoom;

    if (settings.autoRefresh && currentBoardCode) {
        startAutoRefresh();
        if (autoRefreshToggle) autoRefreshToggle.checked = true;
    } else {
        stopAutoRefresh();
        if (autoRefreshToggle) autoRefreshToggle.checked = false;
    }
}

// Check CORS proxy access
function checkCorsProxyAccess() {
    if (!settings.hasRequestedCors && corsProxyPrompt) {
        corsProxyPrompt.classList.add('active');
        if (corsProxyBtn) {
            corsProxyBtn.addEventListener('click', () => {
                window.open(CORS_PROXY, '_blank');
                settings.hasRequestedCors = true;
                saveSettings();
                corsProxyPrompt.classList.remove('active');
            });
        }
    }
}

// Throttle function
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

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Auto-Refresh Functions
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        if (currentBoardCode) fetchThreads(currentBoardCode);
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Fetch all boards
async function fetchBoards() {
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}boards.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return (await response.json()).boards || [];
    } catch (error) {
        console.error('Error fetching boards:', error);
        if (boardsList) boardsList.innerHTML = '<div class="error">Unable to load boards.</div>';
        return [];
    }
}

// Initialize search
let allBoards = [];

async function initializeSearch() {
    allBoards = await fetchBoards();
    const boardSearch = document.getElementById('board-search');
    const searchSuggestions = document.getElementById('search-suggestions');

    if (!boardSearch || !searchSuggestions) return;

    boardSearch.addEventListener('input', throttle(() => {
        const query = boardSearch.value.toLowerCase().trim();
        searchSuggestions.innerHTML = '';

        if (!query) {
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
}

// Load boards
async function loadBoards() {
    const boards = await fetchBoards();
    if (!boardsList || !favoriteBoardsList || !favoriteBoardsSection || !boardsNavList || !favoriteBoardsNavList) return;

    boardsList.innerHTML = '';
    favoriteBoardsList.innerHTML = '';
    boardsNavList.innerHTML = '';
    favoriteBoardsNavList.innerHTML = '';

    const favoriteBoards = boards.filter(board => settings.favoriteBoards.includes(board.board));
    if (favoriteBoards.length > 0) {
        favoriteBoardsSection.classList.add('active');
        favoriteBoards.forEach(board => {
            favoriteBoardsList.appendChild(createBoardItem(board));
            favoriteBoardsNavList.appendChild(createNavItem(board));
        });
    } else {
        favoriteBoardsSection.classList.remove('active');
    }

    boards.forEach(board => {
        boardsList.appendChild(createBoardItem(board));
        boardsNavList.appendChild(createNavItem(board));
    });

    if (favoriteBoardsSelector) {
        favoriteBoardsSelector.innerHTML = '';
        boards.forEach(board => {
            const item = document.createElement('div');
            item.classList.add('favorite-board-item');
            item.innerHTML = `
                <span>${board.title}</span>
                <label class="switch">
                    <input type="checkbox" data-board="${board.board}" ${settings.favoriteBoards.includes(board.board) ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            favoriteBoardsSelector.appendChild(item);
        });

        favoriteBoardsSelector.querySelectorAll('input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const boardCode = checkbox.getAttribute('data-board');
                settings.favoriteBoards = checkbox.checked
                    ? [...settings.favoriteBoards, boardCode]
                    : settings.favoriteBoards.filter(code => code !== boardCode);
                saveSettings();
                loadBoards();
            });
        });
    }

    loadThreadTags();
    initializeSearch();
}

// Create board item
function createBoardItem(board) {
    const boardItem = document.createElement('div');
    boardItem.classList.add('board-item');
    boardItem.innerHTML = `
        <span>${board.title}</span>
        <p>${board.meta_description || 'No description'}</p>
    `;
    boardItem.addEventListener('click', () => openThreads(board));
    return boardItem;
}

// Create nav item
function createNavItem(board) {
    const navItem = document.createElement('div');
    navItem.classList.add('nav-item');
    navItem.innerHTML = `<span>${board.title}</span>`;
    navItem.addEventListener('click', () => {
        openThreads(board);
        toggleNavDrawer();
    });
    return navItem;
}

// Open threads page
function openThreads(board) {
    if (!boardsPage || !threadsPage || !boardTitle) return;
    currentBoardCode = board.board;
    boardsPage.classList.remove('active');
    threadsPage.classList.add('active');
    boardTitle.textContent = board.title;
    if (threadsList) threadsList.innerHTML = '';
    fetchThreads(board.board);
    if (settings.autoRefresh) startAutoRefresh();
}

// Fetch threads
async function fetchThreads(boardCode) {
    if (!threadsList) return;
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${boardCode}/catalog.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        await fetchRepliesForThreads(boardCode, data);
        filterAndSortThreads(data, boardCode);
    } catch (error) {
        console.error('Error fetching threads:', error);
        threadsList.innerHTML = '<div class="error">Unable to load threads.</div>';
    }
}

// Fetch replies for threads
async function fetchRepliesForThreads(boardCode, catalogData) {
    threadCache.clear();
    const threads = catalogData.flatMap(page => page.threads);
    for (const thread of threads.slice(0, 10)) {
        try {
            const response = await fetch(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${thread.no}.json`);
            if (response.ok) threadCache.set(thread.no, (await response.json()).posts);
        } catch (error) {
            console.error(`Error fetching replies for thread ${thread.no}:`, error);
        }
    }
}

// Filter and sort threads
function filterAndSortThreads(data, boardCode) {
    const filterQuery = threadFilter?.value.toLowerCase() || '';
    const sortOption = threadSort?.value || 'bump';
    const mediaOption = mediaFilter?.value || 'all';
    let threads = data.flatMap(page => page.threads);

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

    if (settings.pinnedThreads.length > 0) {
        threads.sort((a, b) => {
            const aPinned = settings.pinnedThreads.includes(`${boardCode}:${a.no}`) ? 1 : 0;
            const bPinned = settings.pinnedThreads.includes(`${boardCode}:${b.no}`) ? 1 : 0;
            return bPinned - aPinned;
        });
    }

    displayThreads(threads, boardCode);
}

// Toggle thread pinning
function togglePinThread(boardCode, threadNo) {
    const threadId = `${boardCode}:${threadNo}`;
    settings.pinnedThreads = settings.pinnedThreads.includes(threadId)
        ? settings.pinnedThreads.filter(id => id !== threadId)
        : [...settings.pinnedThreads, threadId];
    saveSettings();
    fetchThreads(boardCode);
}

// Toggle thread tag
function toggleThreadTag(boardCode, threadNo, tag) {
    const threadId = `${boardCode}:${threadNo}`;
    if (!settings.taggedThreads[threadId]) settings.taggedThreads[threadId] = [];
    settings.taggedThreads[threadId] = settings.taggedThreads[threadId].includes(tag)
        ? settings.taggedThreads[threadId].filter(t => t !== tag)
        : [...settings.taggedThreads[threadId], tag];
    if (settings.taggedThreads[threadId].length === 0) delete settings.taggedThreads[threadId];
    saveSettings();
    fetchThreads(boardCode);
}

// Load thread tags
function loadThreadTags() {
    if (!threadTagsList) return;
    threadTagsList.innerHTML = '';
    settings.threadTags.forEach(tag => {
        const item = document.createElement('div');
        item.classList.add('thread-tag-item');
        item.innerHTML = `
            <span>${tag}</span>
            <button data-tag="${tag}"><img src="assets/symbols/circle-xmark.svg" alt="Delete" class="icon"></button>
        `;
        threadTagsList.appendChild(item);
    });

    threadTagsList.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const tag = button.getAttribute('data-tag');
            settings.threadTags = settings.threadTags.filter(t => t !== tag);
            Object.keys(settings.taggedThreads).forEach(threadId => {
                settings.taggedThreads[threadId] = settings.taggedThreads[threadId].filter(t => t !== tag);
                if (settings.taggedThreads[threadId].length === 0) delete settings.taggedThreads[threadId];
            });
            saveSettings();
            loadThreadTags();
        });
    });
}

// Add thread tag
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

function sanitizeComment(comment) {
    if (!comment) return '<p>No content</p>'; // Fallback for empty comments
    const div = document.createElement('div');
    div.innerHTML = comment.replace(/<br>/g, '\n');
    let text = div.textContent || div.innerText || '';
    if (!text.trim()) return '<p>>>Reply</p>'; // Fallback for reply-only comments
    return text.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('>') && !line.startsWith('>>')) {
            return `<span class="greentext">${line}</span>`;
        } else if (line.startsWith('>>')) {
            const match = line.match(/>>(\d+)/);
            if (match) {
                return `<span class="reply-link" data-post-no="${match[1]}">${line}</span>`;
            }
            return `<p>${line}</p>`;
        }
        return `<p>${line}</p>`;
    }).join('');
}

// Display threads
function displayThreads(threads, boardCode) {
    if (!threadsList) return;
    threadsList.innerHTML = '';
    for (const thread of threads) {
        const threadItem = document.createElement('div');
        threadItem.classList.add('thread-item');
        const threadId = `${boardCode}:${thread.no}`;
        if (settings.pinnedThreads.includes(threadId)) threadItem.classList.add('pinned');

        const content = document.createElement('div');
        content.classList.add('content');

        if (thread.tim && thread.ext) {
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('image-container');
            const img = document.createElement('img');
            img.src = `https://i.4cdn.org/${boardCode}/${thread.tim}${thread.ext}`;
            img.onerror = () => img.style.display = 'none';
            imageContainer.appendChild(img);
            content.appendChild(imageContainer);
        }

        const threadInfo = document.createElement('div');
        threadInfo.classList.add('thread-info');

        const title = document.createElement('div');
        title.classList.add('thread-title');
        title.textContent = thread.sub || `Thread #${thread.no}`;

        const username = document.createElement('div');
        username.classList.add('username');
        username.textContent = `${thread.name || 'Anonymous'} #${thread.no}`;

        const preview = document.createElement('div');
        preview.classList.add('thread-preview');
        let previewText = thread.com ? thread.com.replace(/<[^>]+>/g, '').substring(0, 100) : '';
        if (previewText.length >= 100) previewText += '...';
        preview.textContent = previewText || 'No preview available';

        const stats = document.createElement('div');
        stats.classList.add('thread-stats');
        stats.textContent = `Replies: ${thread.replies || 0} | Images: ${thread.images || 0}`;

        const tags = settings.taggedThreads[threadId] || [];
        if (tags.length > 0) {
            const tagsDiv = document.createElement('div');
            tagsDiv.classList.add('thread-tags');
            tagsDiv.textContent = `Tags: ${tags.join(', ')}`;
            threadInfo.appendChild(tagsDiv);
        }

        const pinButton = document.createElement('button');
        pinButton.classList.add('pin-button', 'icon-btn');
        pinButton.innerHTML = `<img src="assets/symbols/${settings.pinnedThreads.includes(threadId) ? 'circle-xmark' : 'settings'}.svg" alt="Pin" class="icon">`;
        pinButton.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinThread(boardCode, thread.no);
        });

        const tagButton = document.createElement('button');
        tagButton.classList.add('tag-button', 'icon-btn');
        tagButton.innerHTML = '<img src="assets/symbols/settings.svg" alt="Tag" class="icon">';
        tagButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = prompt('Enter tag:', tags[0] || '');
            if (tag && settings.threadTags.includes(tag)) {
                toggleThreadTag(boardCode, thread.no, tag);
            } else if (tag) {
                alert('Add the tag in Settings first.');
            }
        });

        threadInfo.appendChild(title);
        threadInfo.appendChild(username);
        threadInfo.appendChild(preview);
        threadInfo.appendChild(stats);
        content.appendChild(threadInfo);
        threadItem.appendChild(pinButton);
        threadItem.appendChild(tagButton);
        threadItem.appendChild(content);

        const repliesPreview = document.createElement('div');
        repliesPreview.classList.add('replies-preview');
        const posts = threadCache.get(thread.no) || [];
        posts.slice(-2).forEach(post => {
            if (post.no !== thread.no) {
                const reply = document.createElement('div');
                reply.classList.add('reply-preview-item');
                let html = `<div class="username">${post.name || 'Anonymous'} #${post.no} <span class="timestamp">${formatTimestamp(post.time)}</span></div>`;
                const comment = sanitizeComment(post.com);
                if (comment) html += `<div>${comment.replace(/<span class="reply-link"[^>]+>[^<]+<\/span>/g, '').substring(0, 50)}${comment.length > 50 ? '...' : ''}</div>`;
                if (post.tim && post.ext) {
                    html += `<img src="https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}" onerror="this.style.display='none'">`;
                }
                reply.innerHTML = html;
                repliesPreview.appendChild(reply);
            }
        });
        if (posts.length > 1) threadItem.appendChild(repliesPreview);

        threadItem.addEventListener('click', () => openThread(boardCode, thread));
        threadsList.appendChild(threadItem);
    }
}

// Open thread
function openThread(boardCode, thread) {
    if (!threadsPage || !chatPage || !threadTitle || !chatMessages) return;
    threadsPage.classList.remove('active');
    chatPage.classList.add('active');
    threadTitle.textContent = thread.sub || `Thread #${thread.no}`;
    chatMessages.innerHTML = '';
    fetchThreadMessages(boardCode, thread.no);
    stopAutoRefresh();
}

// Fetch thread messages
async function fetchThreadMessages(boardCode, threadNo) {
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${threadNo}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        threadCache.set(threadNo, data.posts);
        displayMessages(boardCode, data.posts, threadNo);
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        chatMessages.innerHTML = '<div class="error">Unable to load messages.</div>';
    }
}

// Format timestamp
function formatTimestamp(unixTime) {
    const date = new Date(unixTime * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    return `${hours}:${minutes} - ${day} ${month}`;
}

// Around line 600
function displayMessages(boardCode, posts, threadNo) {
    if (!chatMessages) return;
    const postMap = new Map(posts.map(post => [post.no, post]));
    const opPostNo = posts[0]?.no; // First post is the OP

    posts.forEach(post => {
        const message = document.createElement('div');
        message.id = `post-${post.no}`;
        const commentText = sanitizeComment(post.com);
        const startsWithReplyLink = commentText.match(/^<span class="reply-link"/);
        const isReply = startsWithReplyLink || (post.com && post.com.match(/>>(\d+)/));

        message.classList.add('message', isReply ? 'reply' : 'received');
        if (startsWithReplyLink) message.classList.add('reply-link-start');
        if (post.no === opPostNo) message.classList.add('op');

        let commentHtml = commentText.replace(/>>(\d+)/g, `<span class="reply-link" data-post-no="$1">>>$1</span>`);
        if (!commentHtml.trim()) commentHtml = '<p>>>Reply</p>'; // Ensure reply-only messages are visible

        let previewHtml = '';
        if (isReply) {
            const replyMatch = post.com?.match(/>>(\d+)/);
            if (replyMatch) {
                const refPost = postMap.get(parseInt(replyMatch[1]));
                if (refPost) {
                    let previewText = sanitizeComment(refPost.com).replace(/<[^>]+>/g, '').substring(0, 47) + '...';
                    previewHtml = `<div class="reply-preview">`;
                    if (refPost.tim && refPost.ext) {
                        previewHtml += `<img src="https://i.4cdn.org/${boardCode}/${refPost.tim}${refPost.ext}" onerror="this.style.display='none'">`;
                    }
                    previewHtml += `<span>${previewText}</span></div>`;
                }
            }
        }

        let html = `
            <div class="username">
                ${post.name || 'Anonymous'} #${post.no}
                ${post.no === opPostNo ? '<span class="op-tag">OP</span>' : ''}
                <span class="timestamp">${formatTimestamp(post.time)}</span>
            </div>
            <div class="message-content">${commentHtml}</div> <!-- Always include message-content -->
        `;
        if (post.tim && post.ext) {
            html += `<img src="https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}" data-fullsrc="https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}" onerror="this.style.display='none'" class="message-image">`;
        }

        message.innerHTML = previewHtml + html;

        const img = message.querySelector('.message-image');
        if (img) {
            img.addEventListener('click', () => openImageModal(img.getAttribute('data-fullsrc')));
            if (settings.hoverZoom) {
                img.addEventListener('mouseenter', (e) => showZoomPreview(img, e));
                img.addEventListener('mouseleave', hideZoomPreview);
                img.addEventListener('mousemove', moveZoomPreview);
            }
        }

        chatMessages.appendChild(message);
    });

    chatMessages.scrollTop = 0; // Scroll to top (as previously fixed)

    chatMessages.querySelectorAll('.reply-link').forEach(link => {
        link.addEventListener('mouseenter', (e) => showReplyPreview(link, postMap, boardCode, e));
        link.addEventListener('mouseleave', hideReplyPreview);
        link.addEventListener('click', () => scrollToPost(link.getAttribute('data-post-no')));
    });
}

// Reply preview
function showReplyPreview(link, postMap, boardCode, e) {
    if (!replyPreviewPopup) return;
    const postNo = link.getAttribute('data-post-no');
    const post = postMap.get(parseInt(postNo));
    if (!post) return;

    let html = `<div><strong>${post.name || 'Anonymous'} #${post.no}</strong> <span>${formatTimestamp(post.time)}</span></div>`;
    const comment = sanitizeComment(post.com);
    if (comment) html += `<div>${comment.replace(/<span class="reply-link"[^>]+>[^<]+<\/span>/g, '')}</div>`;
    if (post.tim && post.ext) {
        html += `<img src="https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}" onerror="this.style.display='none'">`;
    }

    replyPreviewPopup.innerHTML = html;
    replyPreviewPopup.style.display = 'block';
    const rect = replyPreviewPopup.getBoundingClientRect();
    let left = e.clientX + 10;
    let top = e.clientY + 10;
    if (left + rect.width > window.innerWidth - 10) left = e.clientX - rect.width - 10;
    if (top + rect.height > window.innerHeight - 10) top = e.clientY - rect.height - 10;
    replyPreviewPopup.style.left = `${left}px`;
    replyPreviewPopup.style.top = `${top}px`;
}

function hideReplyPreview() {
    if (replyPreviewPopup) replyPreviewPopup.style.display = 'none';
}

// Zoom preview
function showZoomPreview(img, e) {
    if (!settings.hoverZoom || !zoomImagePreview) return;
    const fullSrc = img.getAttribute('data-fullsrc') || img.src;
    zoomImagePreview.innerHTML = `<img src="${fullSrc}">`;
    zoomImagePreview.style.display = 'block';
    moveZoomPreview(e);
}

function hideZoomPreview() {
    if (zoomImagePreview) {
        zoomImagePreview.style.display = 'none';
        zoomImagePreview.innerHTML = '';
    }
}

function moveZoomPreview(e) {
    if (!zoomImagePreview) return;
    const rect = zoomImagePreview.getBoundingClientRect();
    let left = e.clientX + 20;
    let top = e.clientY + 20;
    if (left + rect.width > window.innerWidth - 20) left = e.clientX - rect.width - 20;
    if (top + rect.height > window.innerHeight - 20) top = e.clientY - rect.height - 20;
    zoomImagePreview.style.left = `${left}px`;
    zoomImagePreview.style.top = `${top}px`;
}

// Scroll to post
function scrollToPost(postNo) {
    const post = document.getElementById(`post-${postNo}`);
    if (post) {
        post.scrollIntoView({ behavior: 'smooth' });
        post.style.background = 'rgba(0, 122, 255, 0.1)';
        setTimeout(() => post.style.background = '', 1000);
    }
}

// Image modal
function openImageModal(src) {
    if (!modalImage || !imageModal) return;
    modalImage.src = src;
    imageModal.classList.add('active');
}

function closeImageModalHandler() {
    if (!imageModal) return;
    imageModal.classList.remove('active');
    modalImage.src = '';
}

// Toggle settings dialog
function toggleSettingsDialog() {
    if (settingsDialog) settingsDialog.classList.toggle('active');
}

// Toggle navigation drawer
function toggleNavDrawer() {
    if (navDrawer) navDrawer.classList.toggle('active');
}

// Event Listeners
if (backToBoardsBtn) {
    backToBoardsBtn.addEventListener('click', () => {
        threadsPage.classList.remove('active');
        boardsPage.classList.add('active');
        stopAutoRefresh();
    });
}

if (backToThreadsBtn) {
    backToThreadsBtn.addEventListener('click', () => {
        chatPage.classList.remove('active');
        threadsPage.classList.add('active');
        if (settings.autoRefresh) startAutoRefresh();
    });
}

if (imageModal) imageModal.addEventListener('click', (e) => { if (e.target === imageModal) closeImageModalHandler(); });
if (closeImageModal) closeImageModal.addEventListener('click', closeImageModalHandler);

[settingsToggleBoards, settingsToggleThreads, settingsToggleChat].forEach(toggle => {
    if (toggle) toggle.addEventListener('click', toggleSettingsDialog);
});

if (settingsClose) settingsClose.addEventListener('click', toggleSettingsDialog);

if (darkModeToggleSettings) darkModeToggleSettings.addEventListener('change', () => {
    settings.darkMode = darkModeToggleSettings.checked;
    saveSettings();
    applySettings();
});

[darkModeToggleBoards, darkModeToggleThreads, darkModeToggleChat].forEach(toggle => {
    if (toggle) toggle.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        saveSettings();
        applySettings();
    });
});

if (hoverZoomToggle) {
    hoverZoomToggle.addEventListener('change', () => {
        settings.hoverZoom = hoverZoomToggle.checked;
        saveSettings();
    });
}

if (highContrastToggle) {
    highContrastToggle.addEventListener('change', () => {
        settings.highContrast = highContrastToggle.checked;
        saveSettings();
        applySettings();
    });
}

if (autoRefreshToggle) {
    autoRefreshToggle.addEventListener('change', () => {
        settings.autoRefresh = autoRefreshToggle.checked;
        saveSettings();
        applySettings();
    });
}

if (threadTagInput) {
    threadTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addThreadTag();
    });
}

if (threadFilter) threadFilter.addEventListener('input', debounce(() => fetchThreads(currentBoardCode), 300));
if (threadSort) threadSort.addEventListener('change', () => fetchThreads(currentBoardCode));
if (mediaFilter) mediaFilter.addEventListener('change', () => fetchThreads(currentBoardCode));

if (openNavBtn) openNavBtn.addEventListener('click', toggleNavDrawer);
if (closeNavBtn) closeNavBtn.addEventListener('click', toggleNavDrawer);

// Initialize
loadBoards();
