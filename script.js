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
const galleryView = document.getElementById('gallery-view');
const galleryImages = document.getElementById('gallery-images');
const galleryPrev = document.getElementById('gallery-prev');
const galleryNext = document.getElementById('gallery-next');
const galleryClose = document.getElementById('gallery-close');
const backToBoardsBtn = document.getElementById('back-to-boards-btn');
const backToThreadsBtn = document.getElementById('back-to-threads-btn');
const galleryModeToggle = document.getElementById('gallery-mode-toggle');
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

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Current date for comparison
const CURRENT_DATE = new Date('2025-04-28');

let currentImages = [];
let currentImageIndex = 0;
let isGalleryMode = false;
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
        const toggles = [darkModeToggleSettings, darkModeToggleThreads, darkModeToggleChat];
        toggles.forEach(toggle => {
            if (toggle) toggle.innerHTML = '<i class="fas fa-moon"></i>';
        });
    } else {
        document.body.classList.remove('dark-mode');
        const toggles = [darkModeToggleSettings, darkModeToggleThreads, darkModeToggleChat];
        toggles.forEach(toggle => {
            if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
        });
    }
    hoverZoomToggle.checked = settings.hoverZoom;
}

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
    favoriteBoardsList.innerHTML = '';
    
    // Display favorite boards
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

    // Display all boards
    boards.forEach(board => {
        const boardItem = createBoardItem(board);
        boardsList.appendChild(boardItem);
    });

    // Populate favorite boards selector
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

    // Add event listeners to checkboxes
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
    galleryImages.innerHTML = '';
    currentImages = [];
    currentImageIndex = 0;
    isGalleryMode = false;
    galleryView.classList.remove('active');
    chatMessages.style.display = 'block';

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
    const postMap = new Map();
    const repliesMap = new Map();

    // Initialize replies map
    posts.forEach(post => {
        postMap.set(post.no, post);
        repliesMap.set(post.no, []);
    });

    // Collect replies
    posts.forEach(post => {
        if (post.com && post.com.includes('>>')) {
            const replyRegex = />>(\d+)/g;
            let match;
            while ((match = replyRegex.exec(post.com)) !== null) {
                const postNo = parseInt(match[1]);
                if (repliesMap.has(postNo)) {
                    repliesMap.get(postNo).push(post);
                }
            }
        }
    });

    posts.forEach(post => {
        if (!post.com || !post.com.includes('>>')) {
            appendMessageWithReplies(boardCode, post, repliesMap, postMap);
        }
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Populate gallery images
    showGalleryImage(currentImageIndex);
}

// Append message and its replies
function appendMessageWithReplies(boardCode, post, repliesMap, postMap) {
    const message = document.createElement('div');
    message.id = `post-${post.no}`;
    message.classList.add('message', 'received');

    let commentHtml = post.com ? post.com.replace(/<[^>]+>/g, '') : 'No comment';

    // Process reply links
    if (commentHtml.includes('>>')) {
        const replyRegex = />>(\d+)/g;
        let match;
        while ((match = replyRegex.exec(commentHtml)) !== null) {
            const postNo = match[1];
            commentHtml = commentHtml.replace(
                match[0],
                `<span class="reply-link" data-post-no="${postNo}">${match[0]}</span>`
            );
        }
    }

    let html = `
        <div class="username">${post.name || 'Anonymous'}<span class="timestamp">${formatTimestamp(post.time)}</span></div>
        <div>${commentHtml}</div>
    `;
    if (post.tim && post.ext) {
        const imgUrl = `https://i.4cdn.org/${boardCode}/${post.tim}${post.ext}`;
        html += `<img src="${imgUrl}" data-fullsrc="${imgUrl}" onerror="this.style.display='none'">`;
        currentImages.push(imgUrl);
    }
    message.innerHTML = html;

    // Add click event to images for enlarging
    const img = message.querySelector('img');
    if (img) {
        img.addEventListener('click', () => openImageModal(imgUrl));
        if (settings.hoverZoom) {
            img.addEventListener('mouseenter', () => showZoomPreview(img));
            img.addEventListener('mouseleave', hideZoomPreview);
            img.addEventListener('mousemove', moveZoomPreview);
        }
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

    // Append replies
    const replies = repliesMap.get(post.no);
    if (replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.classList.add('replies-container');
        replies.forEach(reply => {
            const replyMessage = document.createElement('div');
            replyMessage.id = `post-${reply.no}`;
            replyMessage.classList.add('message', 'reply');

            let replyCommentHtml = reply.com ? reply.com.replace(/<[^>]+>/g, '') : 'No comment';
            if (replyCommentHtml.includes('>>')) {
                const replyRegex = />>(\d+)/g;
                let match;
                while ((match = replyRegex.exec(replyCommentHtml)) !== null) {
                    const postNo = match[1];
                    replyCommentHtml = replyCommentHtml.replace(
                        match[0],
                        `<span class="reply-link" data-post-no="${postNo}">${match[0]}</span>`
                    );
                }
            }

            let replyHtml = `
                <div class="username">${reply.name || 'Anonymous'}<span class="timestamp">${formatTimestamp(reply.time)}</span></div>
                <div>${replyCommentHtml}</div>
            `;
            if (reply.tim && reply.ext) {
                const imgUrl = `https://i.4cdn.org/${boardCode}/${reply.tim}${reply.ext}`;
                replyHtml += `<img src="${imgUrl}" data-fullsrc="${imgUrl}" onerror="this.style.display='none'">`;
                currentImages.push(imgUrl);
            }
            replyMessage.innerHTML = replyHtml;

            const replyImg = replyMessage.querySelector('img');
            if (replyImg) {
                replyImg.addEventListener('click', () => openImageModal(imgUrl));
                if (settings.hoverZoom) {
                    replyImg.addEventListener('mouseenter', () => showZoomPreview(replyImg));
                    replyImg.addEventListener('mouseleave', hideZoomPreview);
                    replyImg.addEventListener('mousemove', moveZoomPreview);
                }
            }

            const replyLinks = replyMessage.querySelectorAll('.reply-link');
            replyLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const postNo = link.getAttribute('data-post-no');
                    scrollToPost(postNo);
                });
            });

            repliesContainer.appendChild(replyMessage);
        });
        chatMessages.appendChild(repliesContainer);
    }
}

// Toggle gallery mode
function toggleGalleryMode() {
    isGalleryMode = !isGalleryMode;
    galleryView.classList.toggle('active', isGalleryMode);
    chatMessages.style.display = isGalleryMode ? 'none' : 'block';
    galleryModeToggle.innerHTML = isGalleryMode ? '<i class="fas fa-comments"></i>' : '<i class="fas fa-images"></i>';
    if (isGalleryMode) {
        currentImageIndex = 0;
        showGalleryImage(currentImageIndex);
    }
}

// Show specific gallery image
function showGalleryImage(index) {
    if (currentImages.length === 0) {
        galleryImages.innerHTML = '<div>No images in this thread.</div>';
        return;
    }
    currentImageIndex = (index + currentImages.length) % currentImages.length;
    galleryImages.innerHTML = '';
    const img = document.createElement('img');
    img.src = currentImages[currentImageIndex];
    img.classList.add('gallery-image');
    img.addEventListener('click', () => openImageModal(currentImages[currentImageIndex]));
    galleryImages.appendChild(img);
}

// Zoom preview functions
function showZoomPreview(img) {
    if (!settings.hoverZoom) return;
    const fullSrc = img.getAttribute('data-fullsrc') || img.src;
    zoomImagePreview.innerHTML = `<img src="${fullSrc}">`;
    zoomImagePreview.style.display = 'block';
}

function hideZoomPreview() {
    zoomImagePreview.style.display = 'none';
    zoomImagePreview.innerHTML = '';
}

function moveZoomPreview(e) {
    if (!settings.hoverZoom) return;
    const preview = zoomImagePreview.querySelector('img');
    if (!preview) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const previewRect = preview.getBoundingClientRect();
    const offset = 10; // Small offset from cursor

    // Center the image around the cursor
    let left = e.pageX - previewRect.width / 2;
    let top = e.pageY - previewRect.height / 2;

    // Ensure preview stays within viewport
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    if (left + previewRect.width > viewportWidth - 10) {
        left = viewportWidth - previewRect.width - 10;
    }
    if (top + previewRect.height > viewportHeight - 10) {
        top = viewportHeight - previewRect.height - 10;
    }

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
    modalImage.src = src;
    imageModal.classList.add('active');
}

function closeImageModal() {
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
    settingsPopup.classList.toggle('active');
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

galleryView.addEventListener('click', (e) => {
    if (e.target === galleryView) {
        toggleGalleryMode();
    }
});

galleryClose.addEventListener('click', toggleGalleryMode);

darkModeToggleThreads.addEventListener('click', toggleDarkMode);
darkModeToggleChat.addEventListener('click', toggleDarkMode);
darkModeToggleSettings.addEventListener('click', toggleDarkMode);
settingsToggleBoards.addEventListener('click', toggleSettingsPopup);
settingsClose.addEventListener('click', toggleSettingsPopup);

hoverZoomToggle.addEventListener('change', () => {
    settings.hoverZoom = hoverZoomToggle.checked;
    saveSettings();
});

galleryPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    showGalleryImage(currentImageIndex - 1);
});

galleryNext.addEventListener('click', (e) => {
    e.stopPropagation();
    showGalleryImage(currentImageIndex + 1);
});

// Initialize
loadSettings();
loadBoards();
