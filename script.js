const boardsPage = document.getElementById('boards-page');
const threadsPage = document.getElementById('threads-page');
const chatPage = document.getElementById('chat-page');
const boardsList = document.getElementById('boards-list');
const boardTitle = document.getElementById('board-title');
const threadsList = document.getElementById('threads-list');
const threadTitle = document.getElementById('thread-title');
const chatMessages = document.getElementById('chat-messages');
const backToBoardsBtn = document.getElementById('back-to-boards-btn');
const backToThreadsBtn = document.getElementById('back-to-threads-btn');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const darkModeToggleBoards = document.getElementById('dark-mode-toggle-boards');
const darkModeToggleThreads = document.getElementById('dark-mode-toggle-threads');
const darkModeToggleChat = document.getElementById('dark-mode-toggle-chat');

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Current date for comparison
const CURRENT_DATE = new Date('2025-04-28');

// Fetch all boards dynamically
async function fetchBoards() {
    try {
        const response = await fetch(`${CORS_PROXY}https://a.4cdn.org/boards.json`);
        const data = await response.json();
        return data.boards;
    } catch (error) {
        console.error('Error fetching boards:', error);
        return [];
    }
}

// Load boards on start page
async function loadBoards() {
    const boards = await fetchBoards();
    boardsList.innerHTML = '';
    boards.forEach(board => {
        const boardItem = document.createElement('div');
        boardItem.classList.add('board-item');
        boardItem.innerHTML = `
            <div>
                <span>${board.title}</span>
                <p>${board.meta_description || 'No description'}</p>
            </div>
        `;
        boardItem.addEventListener('click', () => openThreads(board));
        boardsList.appendChild(boardItem);
    });
}

// Switch to threads page
function openThreads(board) {
    boardsPage.classList.remove('active');
    threadsPage.classList.add('active');
    boardTitle.textContent = board.title;
    threadsList.innerHTML = '';
    fetchThreads(board.board);
}

// Fetch threads from 4chan board
async function fetchThreads(boardCode) {
    try {
        const response = await fetch(`${CORS_PROXY}https://a.4cdn.org/${boardCode}/catalog.json`);
        const data = await response.json();
        displayThreads(data, boardCode);
    } catch (error) {
        console.error('Error fetching threads:', error);
        const message = document.createElement('div');
        message.textContent = 'Error loading threads.';
        threadsList.appendChild(message);
    }
}

// Display threads
function displayThreads(data, boardCode) {
    data.forEach(page => {
        page.threads.forEach(thread => {
            const threadItem = document.createElement('div');
            threadItem.classList.add('thread-item');

            // Add thumbnail if OP has image
            if (thread.tim && thread.ext) {
                const img = document.createElement('img');
                img.src = `https://t.4cdn.org/${boardCode}/${thread.tim}s.jpg`;
                img.onerror = () => img.style.display = 'none';
                threadItem.appendChild(img);
            }

            // Thread title or subject
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

// Open thread detail page
async function openThread(boardCode, thread) {
    threadsPage.classList.remove('active');
    chatPage.classList.add('active');
    threadTitle.textContent = thread.sub || `Thread #${thread.no}`;
    chatMessages.innerHTML = '';

    try {
        const response = await fetch(`${CORS_PROXY}https://a.4cdn.org/${boardCode}/thread/${thread.no}.json`);
        const data = await response.json();
        displayMessages(boardCode, data.posts);
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        const message = document.createElement('div');
        message.textContent = 'Error loading messages.';
        chatMessages.appendChild(message);
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

// Display messages in thread
function displayMessages(boardCode, posts) {
    posts.forEach(post => {
        const message = document.createElement('div');
        message.id = `post-${post.no}`;
        message.classList.add('message', 'received');

        let isReply = false;
        let commentHtml = post.com ? post.com.replace(/<[^>]+>/g, '') : 'No comment';

        // Check for replies (>> followed by a number)
        if (commentHtml.includes('>>')) {
            const replyRegex = />>(\d+)/g;
            let match;
            while ((match = replyRegex.exec(commentHtml)) !== null) {
                const postNo = match[1];
                isReply = true;
                commentHtml = commentHtml.replace(
                    match[0],
                    `<span class="reply-link" data-post-no="${postNo}">${match[0]}</span>`
                );
            }
        }

        if (isReply) {
            message.classList.remove('received');
            message.classList.add('reply');
        }

        let html = `
            <div class="username">${post.name || 'Anonymous'}<span class="timestamp">${formatTimestamp(post.time)}</span></div>
            <div>${commentHtml}</div>
        `;
        if (post.tim && post.ext) {
            const imgUrl = `https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}`;
            html += `<img src="${imgUrl}" onerror="this.style.display='none'">`;
        }
        message.innerHTML = html;

        // Add click event to images for enlarging
        const img = message.querySelector('img');
        if (img) {
            img.addEventListener('click', () => openImageModal(imgUrl));
        }

        // Add click event to reply links
        const replyLinks = message.querySelectorAll('.reply-link');
        replyLinks.forEach(link => {
            link.addEventListener('click', () => {
                const postNo = link.getAttribute('data-post-no');
                scrollToPost(postNo);
            });
        });

        chatMessages.appendChild(message);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    modalImage.src = src;
    imageModal.classList.add('active');
}

function closeImageModal() {
    imageModal.classList.remove('active');
    modalImage.src = '';
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    const toggles = [darkModeToggleBoards, darkModeToggleThreads, darkModeToggleChat];
    toggles.forEach(toggle => {
        toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
}

// Event Listeners
backToBoardsBtn.addEventListener('click', () => {
    threadsPage.classList.remove('active');
    boardsPage.classList.add('active');
});

backToThreadsBtn.addEventListener('click', () => {
    chatPage.classList.remove('active');
    threadsPage.classList.add('active');
});

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        closeImageModal();
    }
});

darkModeToggleBoards.addEventListener('click', toggleDarkMode);
darkModeToggleThreads.addEventListener('click', toggleDarkMode);
darkModeToggleChat.addEventListener('click', toggleDarkMode);

// Initialize
loadBoards();
