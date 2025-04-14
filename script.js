const boardList = document.getElementById('board-list');
const boardView = document.getElementById('board-view');
const threadView = document.getElementById('thread-view');
const boardHeader = document.getElementById('board-header');
const threadHeader = document.getElementById('thread-header');
const boardTitle = document.getElementById('board-title');
const threadTitle = document.getElementById('thread-title');
const backToBoards = document.getElementById('back-to-boards');
const backToThreads = document.getElementById('back-to-threads');
const infoButton = document.getElementById('info-button');
const threadList = document.getElementById('thread-list');
const threadPosts = document.getElementById('thread-posts');
const loader = document.getElementById('loader');
const loadMoreButton = document.getElementById('load-more');
const themeToggle = document.getElementById('theme-toggle');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalClose = document.querySelector('.modal-close');
const boardInfoPopup = document.getElementById('board-info-popup');
const popupClose = document.getElementById('popup-close');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupUsersOnline = document.getElementById('popup-users-online');
const popupStats = document.getElementById('popup-stats');
const pullRefresh = document.getElementById('pull-refresh');
const boardSearch = document.getElementById('board-search');
const threadSearch = document.getElementById('thread-search');
const boardFilter = document.getElementById('board-filter');

let currentBoard = localStorage.getItem('lastBoard') || '';
let currentThread = null;
let currentPage = 0;
let isLoading = false;
let boardData = null;
let threadData = [];
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const CACHE_KEY = 'ichan_board_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Sanitize HTML
function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

// Simulate users online
function getUsersOnline() {
    return Math.floor(Math.random() * 400) + 100;
}

// Cache management
function getCachedBoards() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
    return data;
}

function cacheBoards(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

// Retry fetch with delay
async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(CORS_PROXY + url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Fetch boards and populate list
async function loadBoards(useCache = true) {
    if (isLoading) return;
    isLoading = true;
    try {
        loader.classList.add('active');
        let data = useCache ? getCachedBoards() : null;
        if (!data) {
            data = await fetchWithRetry('https://a.4cdn.org/boards.json');
            cacheBoards(data);
        }
        boardData = data;

        renderBoards(boardData.boards);
        if (currentBoard) {
            openBoard(currentBoard);
        }
    } catch (error) {
        console.error('Error loading boards:', error);
        let errorMessage = 'Failed to load boards. Please try again.';
        if (error.message.includes('HTTP')) {
            errorMessage = `Server error (${error.message}). Check CORS proxy.`;
        } else if (error.name === 'TypeError') {
            errorMessage = 'Network error or CORS proxy not activated. Visit https://cors-anywhere.herokuapp.com/ to enable.';
        }
        const cachedData = getCachedBoards();
        if (cachedData) {
            boardData = cachedData;
            renderBoards(boardData.boards);
            errorMessage += ' Using cached data.';
        }
        boardList.innerHTML = `<p>${errorMessage} <button onclick="loadBoards(false)">Retry</button></p>`;
    } finally {
        isLoading = false;
        loader.classList.remove('active');
    }
}

// Render boards with search and filter
function renderBoards(boards) {
    const searchQuery = boardSearch.value.toLowerCase();
    const filter = boardFilter.value;
    boardList.innerHTML = '<div class="search-bar"><input type="text" id="board-search" placeholder="Search boards..." aria-label="Search boards"><select id="board-filter" aria-label="Filter boards"><option value="all">All Boards</option><option value="sfw">SFW Boards</option><option value="nsfw">NSFW Boards</option></select></div>';

    const filteredBoards = boards.filter(board => {
        const matchesSearch = board.title.toLowerCase().includes(searchQuery) || board.board.toLowerCase().includes(searchQuery);
        const matchesFilter = filter === 'all' || (filter === 'sfw' && !board.ws_board) || (filter === 'nsfw' && board.ws_board);
        return matchesSearch && matchesFilter;
    });

    filteredBoards.forEach(board => {
        const boardItem = document.createElement('div');
        boardItem.classList.add('board-item');
        boardItem.tabIndex = 0;
        boardItem.innerHTML = `
            <div class="board-item-title">/${board.board}/ - ${board.title}</div>
            <div class="board-item-snippet">${sanitizeHTML(board.meta_description || board.title)}</div>
        `;
        boardItem.addEventListener('click', () => openBoard(board.board));
        boardItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') openBoard(board.board);
        });
        boardList.appendChild(boardItem);
    });

    if (filteredBoards.length === 0) {
        boardList.innerHTML += '<p>No boards found.</p>';
    }

    // Reattach event listeners
    document.getElementById('board-search').value = searchQuery;
    document.getElementById('board-search').addEventListener('input', () => renderBoards(boardData.boards));
    document.getElementById('board-filter').value = filter;
    document.getElementById('board-filter').addEventListener('change', () => renderBoards(boardData.boards));
}

// Open a board
function openBoard(boardId) {
    currentBoard = boardId;
    currentThread = null;
    localStorage.setItem('lastBoard', currentBoard);
    const board = boardData.boards.find(b => b.board === boardId);
    if (board) {
        boardTitle.textContent = `/${board.board}/ - ${board.title}`;
        popupTitle.textContent = board.title;
        popupDescription.textContent = board.meta_description || 'No description available.';
        popupUsersOnline.textContent = `Users Online: ~${getUsersOnline()}`;
        popupStats.textContent = `Posts per Day: ${board.posts_total || 'Unknown'}`;
    }
    boardList.style.display = 'none';
    boardView.style.display = 'flex';
    threadView.style.display = 'none';
    loadThreads(boardId);
}

// Open a thread
function openThread(boardId, threadId, threadSubject) {
    currentThread = threadId;
    threadTitle.textContent = threadSubject || `Thread #${threadId}`;
    boardList.style.display = 'none';
    boardView.style.display = 'none';
    threadView.style.display = 'flex';
    loadThreadPosts(boardId, threadId);
}

// Return to board list
function returnToBoardList() {
    boardView.style.display = 'none';
    threadView.style.display = 'none';
    boardList.style.display = 'flex';
    currentBoard = '';
    currentThread = null;
    localStorage.removeItem('lastBoard');
}

// Return to thread list
function returnToThreadList() {
    threadView.style.display = 'none';
    boardView.style.display = 'flex';
    boardList.style.display = 'none';
    currentThread = null;
    loadThreads(currentBoard);
}

// Fetch threads
async function loadThreads(board, append = false) {
    if (isLoading) return;
    isLoading = true;
    try {
        loader.classList.add('active');
        if (!append) {
            currentPage = 0;
            threadData = [];
            threadList.innerHTML = '';
        }
        const data = await fetchWithRetry(`https://a.4cdn.org/${board}/catalog.json`);
        const threads = data.flatMap(page => page.threads);
        threadData = append ? threadData.concat(threads) : threads;

        renderThreads(board, threadData);
        loadMoreButton.style.display = threadData.length > (currentPage + 1) * 5 ? 'block' : 'none';
        currentPage++;
    } catch (error) {
        console.error('Error loading threads:', error);
        let errorMessage = 'Failed to load threads. Please try again.';
        if (error.message.includes('HTTP')) {
            errorMessage = `Server error (${error.message}). Check CORS proxy.`;
        } else if (error.name === 'TypeError') {
            errorMessage = 'Network error or CORS proxy not activated. Visit https://cors-anywhere.herokuapp.com/ to enable.';
        }
        threadList.innerHTML = `<p>${errorMessage} <button onclick="loadThreads('${board}')">Retry</button></p>`;
    } finally {
        isLoading = false;
        loader.classList.remove('active');
        pullRefresh.style.display = 'none';
    }
}

// Render threads with search
function renderThreads(board, threads) {
    const searchQuery = threadSearch.value.toLowerCase();
    threadList.innerHTML = '';

    const filteredThreads = threads.filter(thread => {
        const subject = thread.sub || '';
        const comment = thread.com || '';
        return subject.toLowerCase().includes(searchQuery) || comment.toLowerCase().includes(searchQuery);
    }).slice(currentPage * 5, (currentPage + 1) * 5);

    if (filteredThreads.length === 0 && !threadSearch.value) {
        threadList.innerHTML = '<p>No threads found.</p>';
        loadMoreButton.style.display = 'none';
        return;
    }

    filteredThreads.forEach(thread => {
        const threadDiv = document.createElement('div');
        threadDiv.classList.add('thread');
        threadDiv.tabIndex = 0;

        const threadTitle = document.createElement('div');
        threadTitle.classList.add('thread-title');
        threadTitle.textContent = thread.sub || `Thread #${thread.no}`;
        threadDiv.appendChild(threadTitle);

        const opPost = document.createElement('div');
        opPost.classList.add('post', 'op-post');
        opPost.innerHTML = sanitizeHTML(thread.com || 'No comment');
        if (thread.tim && thread.ext) {
            const img = document.createElement('img');
            img.src = `https://i.4cdn.org/${board}/${thread.tim}${thread.ext}`;
            img.loading = 'lazy';
            img.alt = 'Thread image';
            img.onerror = () => { img.src = 'https://via.placeholder.com/150?text=Image+Not+Found'; };
            img.addEventListener('click', () => openImageModal(img.src));
            opPost.appendChild(img);
        }
        const opTimestamp = document.createElement('div');
        opTimestamp.classList.add('post-timestamp');
        opTimestamp.textContent = formatTimestamp(thread.time);
        opPost.appendChild(opTimestamp);
        threadDiv.appendChild(opPost);

        threadDiv.addEventListener('click', () => openThread(board, thread.no, thread.sub));
        threadDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') openThread(board, thread.no, thread.sub);
        });

        threadList.appendChild(threadDiv);

        setTimeout(() => {
            threadDiv.classList.add('visible');
        }, 100);
    });

    // Reattach search event listener
    document.getElementById('thread-search').value = searchQuery;
    document.getElementById('thread-search').addEventListener('input', () => renderThreads(board, threadData));
}

// Fetch thread posts
async function loadThreadPosts(board, threadId) {
    if (isLoading) return;
    isLoading = true;
    try {
        loader.classList.add('active');
        threadPosts.innerHTML = '';
        const data = await fetchWithRetry(`https://a.4cdn.org/${board}/thread/${threadId}.json`);

        data.posts.forEach((post, index) => {
            const postDiv = document.createElement('div');
            postDiv.classList.add('post', index === 0 ? 'op-post' : 'reply-post');
            postDiv.innerHTML = sanitizeHTML(post.com || 'No comment');
            if (post.tim && post.ext) {
                const img = document.createElement('img');
                img.src = `https://i.4cdn.org/${board}/${post.tim}${post.ext}`;
                img.loading = 'lazy';
                img.alt = index === 0 ? 'Thread image' : 'Reply image';
                img.onerror = () => { img.src = 'https://via.placeholder.com/150?text=Image+Not+Found'; };
                img.addEventListener('click', () => openImageModal(img.src));
                postDiv.appendChild(img);
            }
            const timestamp = document.createElement('div');
            timestamp.classList.add('post-timestamp');
            timestamp.textContent = formatTimestamp(post.time);
            postDiv.appendChild(timestamp);
            threadPosts.appendChild(postDiv);

            setTimeout(() => {
                postDiv.classList.add('visible');
            }, 100);
        });
    } catch (error) {
        console.error('Error loading thread:', error);
        let errorMessage = 'Failed to load thread. Please try again.';
        if (error.message.includes('HTTP')) {
            errorMessage = `Server error (${error.message}). Check CORS proxy.`;
        } else if (error.name === 'TypeError') {
            errorMessage = 'Network error or CORS proxy not activated. Visit https://cors-anywhere.herokuapp.com/ to enable.';
        }
        threadPosts.innerHTML = `<p>${errorMessage} <button onclick="loadThreadPosts('${board}', ${threadId})">Retry</button></p>`;
    } finally {
        isLoading = false;
        loader.classList.remove('active');
        pullRefresh.style.display = 'none';
    }
}

// Image modal
function openImageModal(src) {
    modalImage.src = src;
    imageModal.style.display = 'flex';
    gsap.fromTo(imageModal, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
}

modalClose.addEventListener('click', () => {
    imageModal.style.display = 'none';
    modalImage.src = '';
});

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = 'none';
        modalImage.src = '';
    }
});

// Board info popup
infoButton.addEventListener('click', () => {
    boardInfoPopup.style.display = 'block';
    gsap.fromTo(boardInfoPopup, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
});

popupClose.addEventListener('click', () => {
    boardInfoPopup.style.display = 'none';
});

boardInfoPopup.addEventListener('click', (e) => {
    if (e.target === boardInfoPopup) {
        boardInfoPopup.style.display = 'none';
    }
});

// Navigation
backToBoards.addEventListener('click', returnToBoardList);
backToThreads.addEventListener('click', returnToThreadList);
loadMoreButton.addEventListener('click', () => loadThreads(currentBoard, true));

// Dark mode toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

// Pull-to-refresh
let touchStartY = 0;
let isPulling = false;
document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    if (window.scrollY === 0 && (boardView.style.display === 'flex' || threadView.style.display === 'flex')) {
        isPulling = true;
    }
});

document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const touchY = e.touches[0].clientY;
    const pullDistance = touchY - touchStartY;
    if (pullDistance > 50) {
        pullRefresh.style.display = 'block';
        pullRefresh.style.transform = `translateY(${Math.min(pullDistance - 50, 50)}px)`;
    }
});

document.addEventListener('touchend', (e) => {
    if (isPulling && e.changedTouches[0].clientY - touchStartY > 100 && !isLoading) {
        if (boardView.style.display === 'flex') {
            loadThreads(currentBoard);
        } else if (threadView.style.display === 'flex') {
            loadThreadPosts(currentBoard, currentThread);
        }
    }
    isPulling = false;
    pullRefresh.style.display = 'none';
    pullRefresh.style.transform = 'translateY(0)';
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (boardList.style.display !== 'none') {
        const boards = document.querySelectorAll('.board-item');
        if (e.key === 'ArrowDown') {
            const focused = document.activeElement;
            const next = focused.nextElementSibling || boards[0];
            if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
            const focused = document.activeElement;
            const prev = focused.previousElementSibling || boards[boards.length - 1];
            if (prev) prev.focus();
        }
    } else if (boardView.style.display === 'flex') {
        const threads = document.querySelectorAll('.thread');
        if (e.key === 'ArrowDown') {
            const focused = document.activeElement;
            const next = focused.nextElementSibling || threads[0];
            if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
            const focused = document.activeElement;
            const prev = focused.previousElementSibling || threads[threads.length - 1];
            if (prev) prev.focus();
        } else if (e.key === 'Backspace') {
            returnToBoardList();
        }
    } else if (threadView.style.display === 'flex') {
        if (e.key === 'Backspace') {
            returnToThreadList();
        }
    }
    if (e.key === 'Escape') {
        boardInfoPopup.style.display = 'none';
        imageModal.style.display = 'none';
    }
});

// Initialize
loadBoards();
