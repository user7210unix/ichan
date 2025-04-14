const boardList = document.getElementById('board-list');
const boardView = document.getElementById('board-view');
const boardHeader = document.getElementById('board-header');
const boardTitle = document.getElementById('board-title');
const backButton = document.getElementById('back-button');
const infoButton = document.getElementById('info-button');
const threadList = document.getElementById('thread-list');
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

let currentBoard = localStorage.getItem('lastBoard') || '';
let currentPage = 0;
let isLoading = false;
let boardData = null;
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

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
async function loadBoards() {
    if (isLoading) return;
    isLoading = true;
    try {
        loader.classList.add('active');
        boardData = await fetchWithRetry('https://a.4cdn.org/boards.json');

        boardList.innerHTML = '';
        boardData.boards.forEach(board => {
            const boardItem = document.createElement('div');
            boardItem.classList.add('board-item');
            boardItem.tabIndex = 0;
            boardItem.innerHTML = `
                <div class="board-item-title">/${board.board}/ - ${board.title}</div>
                <div class="board-item-snippet">${sanitizeHTML(board.meta_description || board.title)}</div>
            `;
            boardItem.addEventListener('click', () => openBoard(board.board));
            boardItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    openBoard(board.board);
                }
            });
            boardList.appendChild(boardItem);
        });

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
        boardList.innerHTML = `<p>${errorMessage} <button onclick="loadBoards()">Retry</button></p>`;
    } finally {
        isLoading = false;
        loader.classList.remove('active');
    }
}

// Open a board
function openBoard(boardId) {
    currentBoard = boardId;
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
    loadThreads(boardId);
}

// Return to board list
function returnToBoardList() {
    boardView.style.display = 'none';
    boardList.style.display = 'flex';
    currentBoard = '';
    localStorage.removeItem('lastBoard');
}

// Fetch threads
async function loadThreads(board, append = false) {
    if (isLoading) return;
    isLoading = true;
    try {
        loader.classList.add('active');
        if (!append) {
            currentPage = 0;
            threadList.innerHTML = '';
        }
        const data = await fetchWithRetry(`https://a.4cdn.org/${board}/catalog.json`);

        const threads = data.flatMap(page => page.threads).slice(currentPage * 5, (currentPage + 1) * 5);
        if (threads.length === 0 && !append) {
            threadList.innerHTML = '<p>No threads found.</p>';
            loadMoreButton.style.display = 'none';
            return;
        }

        threads.forEach(thread => {
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

            fetchWithRetry(`https://a.4cdn.org/${board}/thread/${thread.no}.json`)
                .then(threadData => {
                    threadData.posts.slice(1, 4).forEach(reply => {
                        const replyPost = document.createElement('div');
                        replyPost.classList.add('post', 'reply-post');
                        replyPost.innerHTML = sanitizeHTML(reply.com || 'No comment');
                        if (reply.tim && reply.ext) {
                            const img = document.createElement('img');
                            img.src = `https://i.4cdn.org/${board}/${reply.tim}${reply.ext}`;
                            img.loading = 'lazy';
                            img.alt = 'Reply image';
                            img.onerror = () => { img.src = 'https://via.placeholder.com/150?text=Image+Not+Found'; };
                            img.addEventListener('click', () => openImageModal(img.src));
                            replyPost.appendChild(img);
                        }
                        const replyTimestamp = document.createElement('div');
                        replyTimestamp.classList.add('post-timestamp');
                        replyTimestamp.textContent = formatTimestamp(reply.time);
                        replyPost.appendChild(replyTimestamp);
                        threadDiv.appendChild(replyPost);
                    });
                })
                .catch(error => console.error('Error loading replies:', error));

            threadList.appendChild(threadDiv);

            setTimeout(() => {
                threadDiv.classList.add('visible');
            }, 100);
        });

        loadMoreButton.style.display = data.flatMap(page => page.threads).length > (currentPage + 1) * 5 ? 'block' : 'none';
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

// Back button
backButton.addEventListener('click', returnToBoardList);

// Load more
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
    if (window.scrollY === 0 && boardView.style.display === 'flex') {
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
        loadThreads(currentBoard);
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
    } else {
        const threads = document.querySelectorAll('.thread');
        if (e.key === 'ArrowDown') {
            const focused = document.activeElement;
            const next = focused.nextElementSibling || threads[0];
            if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
            const focused = document.activeElement;
            const prev = focused.previousElementSibling || threads[threads.length - 1];
            if (prev) prev.focus();
        } else if (e.key === 'Escape') {
            boardInfoPopup.style.display = 'none';
            imageModal.style.display = 'none';
        } else if (e.key === 'Backspace') {
            returnToBoardList();
        }
    }
});

// Initialize
loadBoards();
