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
const settingsToggleBoards = document.getElementById('settings-toggle-boards');
const darkModeToggleThreads = document.getElementById('dark-mode-toggle-threads');
const darkModeToggleChat = document.getElementById('dark-mode-toggle-chat');
const settingsPopup = document.getElementById('settings-popup');
const settingsClose = document.getElementById('settings-close');
const hoverZoomToggle = document.getElementById('hover-zoom-toggle');
const darkModeToggleSettings = document.getElementById('dark-mode-toggle-settings');
const favoriteBoardsSelector = document.getElementById('favorite-boards-selector');
const backToBoardsBtn = document.getElementById('back-to-boards-btn');
const backToThreadsBtn = document.getElementById('back-to-threads-btn');

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_BASE = 'https://a.4cdn.org/';

// Current date for comparison
const CURRENT_DATE = new Date('2025-05-01');

let settings = {
    hoverZoom: true,
    darkMode: false,
    favoriteBoards: []
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
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
            if (toggle) toggle.innerHTML = '<i class="fas fa-moon"></i>';
        });
    } else {
        document.body.classList.remove('dark-mode');
        [darkModeToggleSettings, darkModeToggleThreads, darkModeToggleChat].forEach(toggle => {
            if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
        });
    }
    if (hoverZoomToggle) hoverZoomToggle.checked = settings.hoverZoom;
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

// Attach scroll listener to each page
[boardsPage, threadsPage, chatPage].forEach(page => {
    if (page) {
        page.addEventListener('scroll', throttle(handleScroll, 100));
    }
});

// Fetch all boards dynamically
async function fetchBoards() {
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}boards.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Boards fetched successfully:', data.boards);
        return data.boards || [];
    } catch (error) {
        console.error('Error fetching boards:', error);
        if (boardsList) {
            boardsList.innerHTML = `<div>Error loading boards: ${error.message}. Please try again later or ensure CORS proxy is active.</div>`;
        }
        return [];
    }
}

// Search Functionality
let allBoards = [];

async function initializeSearch() {
    allBoards = await fetchBoards();
    console.log('Search initialized with boards:', allBoards);
    const boardSearch = document.getElementById('board-search');
    const searchSuggestions = document.getElementById('search-suggestions');

    if (!boardSearch || !searchSuggestions) {
        console.error('Search elements not found');
        return;
    }

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
            const firstSuggestion = searchSuggestions.children[0];
            firstSuggestion.click();
        }
    });
}

// Load boards on start page
async function loadBoards() {
    if (!boardsList || !favoriteBoardsList || !favoriteBoardsSection) {
        console.error('Board list elements not found');
        return;
    }
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

    initializeSearch();
}

// Create board item
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

// Switch to threads page with fade
function openThreads(board) {
    if (!boardsPage || !threadsPage || !boardTitle) return;
    boardsPage.classList.remove('active');
    setTimeout(() => {
        threadsPage.classList.add('active');
        boardTitle.textContent = board.title;
        if (threadsList) threadsList.innerHTML = '';
        fetchThreads(board.board);
    }, 300);
}

// Fetch threads from 4chan board
async function fetchThreads(boardCode) {
    if (!threadsList) return;
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${boardCode}/catalog.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        displayThreads(data, boardCode);
    } catch (error) {
        console.error('Error fetching threads:', error);
        threadsList.innerHTML = `<div>Error loading threads: ${error.message}</div>`;
    }
}

// Display threads
function displayThreads(data, boardCode) {
    if (!threadsList) return;
    data.forEach(page => {
        page.threads.forEach(thread => {
            const threadItem = document.createElement('div');
            threadItem.classList.add('thread-item');

            if (thread.tim && thread.ext) {
                const img = document.createElement('img');
                img.src = `https://t.4cdn.org/${boardCode}/${thread.tim}s.jpg`;
                img.onerror = () => img.style.display = 'none';
                threadItem.appendChild(img);
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

            contentDiv.appendChild(titleDiv);
            contentDiv.appendChild(usernameDiv);
            threadItem.appendChild(contentDiv);

            threadItem.addEventListener('click', () => openThread(boardCode, thread));
            threadsList.appendChild(threadItem);
        });
    });
}

// Open thread detail page with fade
async function openThread(boardCode, thread) {
    if (!threadsPage || !chatPage || !threadTitle || !chatMessages) return;
    threadsPage.classList.remove('active');
    setTimeout(() => {
        chatPage.classList.add('active');
        threadTitle.textContent = thread.sub || `Thread #${thread.no}`;
        chatMessages.innerHTML = '';
        fetchThreadMessages(boardCode, thread.no);
    }, 300);
}

// Fetch thread messages
async function fetchThreadMessages(boardCode, threadNo) {
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${boardCode}/thread/${threadNo}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        displayMessages(boardCode, data.posts);
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        chatMessages.innerHTML = `<div>Error loading messages: ${error.message}</div>`;
    }
}

// Format timestamp
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

// Sanitize HTML content
function sanitizeComment(comment) {
    if (!comment) return '';
    // Remove HTML tags and decode entities
    const div = document.createElement('div');
    div.innerHTML = comment;
    let text = div.textContent || div.innerText || '';
    // Preserve line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
}

// Display messages in thread
function displayMessages(boardCode, posts) {
    if (!chatMessages) return;
    const postMap = new Map();

    posts.forEach(post => {
        postMap.set(post.no, post);
    });

    posts.forEach(post => {
        appendMessageWithReplies(boardCode, post, postMap);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Append message and its replies
function appendMessageWithReplies(boardCode, post, postMap) {
    if (!chatMessages) return;
    const message = document.createElement('div');
    message.id = `post-${post.no}`;
    
    // Determine if the post is a reply
    const commentText = sanitizeComment(post.com);
    const startsWithReplyLink = commentText.match(/^>>\d+/);
    const isReply = startsWithReplyLink || (post.com && post.com.match(/>>(\d+)/));

    // Apply appropriate classes
    message.classList.add('message');
    if (isReply) {
        message.classList.add('reply');
        if (startsWithReplyLink) {
            message.classList.add('reply-link-start');
            console.log(`Post ${post.no} styled as reply-link-start: ${commentText}`);
        }
    } else {
        message.classList.add('received');
    }

    // Process comment and reply links
    let commentHtml = commentText;
    if (commentHtml) {
        const replyRegex = />>(\d+)/g;
        commentHtml = commentHtml.replace(replyRegex, (match, postNo) => {
            return `<span class="reply-link" data-post-no="${postNo}">${match}</span>`;
        });
    }

    // Generate reply preview if applicable
    let previewHtml = '';
    if (isReply) {
        const replyMatch = post.com.match(/>>(\d+)/);
        if (replyMatch) {
            const referencedPostNo = parseInt(replyMatch[1]);
            const referencedPost = postMap.get(referencedPostNo);
            if (referencedPost) {
                let previewText = sanitizeComment(referencedPost.com);
                previewText = previewText.length > 50 ? previewText.substring(0, 47) + '...' : previewText;
                previewHtml = `<div class="reply-preview">`;
                if (referencedPost.tim && referencedPost.ext) {
                    const previewImgUrl = `https://i.4cdn.org/${boardCode}/${referencedPost.tim}${referencedPost.ext}`;
                    previewHtml += `<img src="${previewImgUrl}" onerror="this.style.display='none'">`;
                }
                previewHtml += `<span>${previewText}</span></div>`;
            }
        }
    }

    // Build message HTML
    let html = `
        <div class="username">${post.name || 'Anonymous'} #${post.no}<span class="timestamp">${formatTimestamp(post.time)}</span></div>
    `;
    if (commentHtml && !(post.tim && post.ext && !post.com)) {
        html += `<div class="message-content">${commentHtml}</div>`;
    }
    if (post.tim && post.ext) {
        const imgUrl = `https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}`;
        html += `<img src="${imgUrl}" data-fullsrc="${imgUrl}" onerror="this.style.display='none'" class="message-image">`;
    }
    message.innerHTML = previewHtml + html;

    // Add event listeners for images
    const img = message.querySelector('img.message-image');
    if (img) {
        img.addEventListener('click', () => openImageModal(img.getAttribute('data-fullsrc') || img.src));
        if (settings.hoverZoom) {
            img.addEventListener('mouseenter', (e) => showZoomPreview(img, e));
            img.addEventListener('mouseleave', hideZoomPreview);
            img.addEventListener('mousemove', moveZoomPreview);
        }
    }

    // Add event listeners for reply links
    const replyLinks = message.querySelectorAll('.reply-link');
    replyLinks.forEach(link => {
        link.addEventListener('click', () => {
            const postNo = link.getAttribute('data-post-no');
            scrollToPost(postNo);
        });
    });

    chatMessages.appendChild(message);
}

// Zoom preview functions
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

// Scroll to a specific post
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

// Image Modal Functions
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

// Dark Mode Toggle
function toggleDarkMode() {
    settings.darkMode = !settings.darkMode;
    saveSettings();
    applySettings();
}

// Toggle Settings Popup
function toggleSettingsPopup() {
    if (!settingsPopup) return;
    settingsPopup.classList.toggle('active');
}

// Event Listeners
if (backToBoardsBtn) {
    backToBoardsBtn.addEventListener('click', () => {
        if (!threadsPage || !boardsPage) return;
        threadsPage.classList.remove('active');
        setTimeout(() => {
            boardsPage.classList.add('active');
        }, 300);
    });
}

if (backToThreadsBtn) {
    backToThreadsBtn.addEventListener('click', () => {
        if (!chatPage || !threadsPage) return;
        chatPage.classList.remove('active');
        setTimeout(() => {
            threadsPage.classList.add('active');
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

if (darkModeToggleThreads) {
    darkModeToggleThreads.addEventListener('click', toggleDarkMode);
}

if (darkModeToggleChat) {
    darkModeToggleChat.addEventListener('click', toggleDarkMode);
}

if (darkModeToggleSettings) {
    darkModeToggleSettings.addEventListener('click', toggleDarkMode);
}

if (settingsToggleBoards) {
    settingsToggleBoards.addEventListener('click', toggleSettingsPopup);
}

if (settingsClose) {
    settingsClose.addEventListener('click', toggleSettingsPopup);
}

if (hoverZoomToggle) {
    hoverZoomToggle.addEventListener('change', () => {
        settings.hoverZoom = hoverZoomToggle.checked;
        saveSettings();
    });
}

// Initialize
loadSettings();
loadBoards();
