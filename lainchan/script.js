const corsProxy = 'https://cors-anywhere.herokuapp.com/';
const baseUrl = 'https://lainchan.org';
const fallbackProxy = 'https://api.allorigins.win/raw?url='; // Fallback CORS proxy
const maxRetries = 3;

// Header Scroll Behavior
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > lastScrollTop && currentScroll > 100) {
        header.classList.add('hidden');
    } else {
        header.classList.remove('hidden');
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});

// Image Preview (Cursor-Following)
function setupImagePreviews() {
    const images = document.querySelectorAll('.messages .message img');
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    document.body.appendChild(preview);

    images.forEach(img => {
        img.addEventListener('mouseenter', () => {
            preview.innerHTML = `<img src="${img.src}" alt="Preview">`;
            preview.style.display = 'block';
        });
        img.addEventListener('mousemove', (e) => {
            preview.style.left = `${e.clientX + 10}px`;
            preview.style.top = `${e.clientY + 10}px`;
        });
        img.addEventListener('mouseleave', () => {
            preview.style.display = 'none';
        });
        img.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('imageModal'));
            document.getElementById('modalImage').src = img.src;
            modal.show();
        });
    });
}

async function fetchWithRetry(url, retries = maxRetries, useFallback = false) {
    const proxy = useFallback ? fallbackProxy : corsProxy;
    try {
        const response = await fetch(proxy + url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying... (${retries} attempts left)`);
            return fetchWithRetry(url, retries - 1, !useFallback);
        }
        throw error;
    }
}

async function loadThreads() {
    const board = document.getElementById('boardSelect').value;
    if (!board) return;
    const postsContainer = document.getElementById('postsContainer');
    const threadView = document.getElementById('threadView');
    postsContainer.classList.remove('d-none');
    threadView.classList.add('d-none');
    postsContainer.innerHTML = '<p>Loading...</p>';

    const retryButton = document.createElement('button');
    retryButton.className = 'btn-retry';
    retryButton.textContent = 'Retry';
    retryButton.onclick = () => {
        retryButton.classList.add('loading');
        loadThreads().finally(() => retryButton.classList.remove('loading'));
    };

    try {
        const data = await fetchWithRetry(`${baseUrl}/${board}/catalog.json`);
        postsContainer.innerHTML = '';
        data.forEach(page => {
            page.threads.forEach(thread => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card" onclick="loadThreadDetails('${board}', ${thread.no})">
                        ${thread.tim ? `
                            <img src="${baseUrl}/${board}/src/${thread.tim}${thread.ext}" class="card-img-top" alt="Thread image">
                        ` : ''}
                        <div class="card-body">
                            <h5 class="card-title">${thread.sub || 'No Subject'}</h5>
                            <p class="card-text">${truncateComment(thread.com || '', 100)}</p>
                            <p class="text-muted">Post #${thread.no} | Replies: ${thread.replies}</p>
                        </div>
                    </div>
                `;
                postsContainer.appendChild(card);
            });
        });
    } catch (error) {
        postsContainer.innerHTML = `
            <p class="error-message">Error: Failed to load threads. The CORS proxy may be down or require access. Visit <a href="https://cors-anywhere.herokuapp.com" target="_blank">cors-anywhere.herokuapp.com</a> to request temporary access, then try again.</p>
        `;
        postsContainer.appendChild(retryButton);
    }
}

async function loadThreadDetails(board, threadNo) {
    const postsContainer = document.getElementById('postsContainer');
    const threadView = document.getElementById('threadView');
    const threadMessages = document.getElementById('threadMessages');
    const threadTitle = document.getElementById('threadTitle');

    postsContainer.classList.add('d-none');
    threadView.classList.remove('d-none');
    threadMessages.innerHTML = '<p>Loading...</p>';

    const retryButton = document.createElement('button');
    retryButton.className = 'btn-retry';
    retryButton.textContent = 'Retry';
    retryButton.onclick = () => {
        retryButton.classList.add('loading');
        loadThreadDetails(board, threadNo).finally(() => retryButton.classList.remove('loading'));
    };

    try {
        const threadData = await fetchWithRetry(`${baseUrl}/${board}/res/${threadNo}.json`);
        const op = threadData.posts[0];
        threadTitle.textContent = op.sub || `Thread #${threadNo}`;
        threadMessages.innerHTML = '';

        threadData.posts.forEach((post, index) => {
            threadMessages.appendChild(createMessage(post, board, index === 0));
        });

        threadMessages.scrollTop = 0;
        setupImagePreviews();
    } catch (error) {
        threadMessages.innerHTML = `
            <p class="error-message">Error: Failed to load thread. The CORS proxy may be down or require access. Visit <a href="https://cors-anywhere.herokuapp.com" target="_blank">cors-anywhere.herokuapp.com</a> to request temporary access, then try again.</p>
        `;
        threadMessages.appendChild(retryButton);
    }
}

function createMessage(post, board, isOP) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${isOP ? 'yours' : 'mine'}`;
    messageContainer.id = `post-${post.no}`;

    const message = document.createElement('div');
    message.className = 'message';

    let comment = DOMPurify.sanitize(post.com || 'No comment');
    comment = comment.replace(/^>.*$/gm, match => `<span class="greentext">${match}</span>`);
    comment = comment.replace(/>>([0-9]+)/g, (match, postNo) => {
        return `<span class="reply-link" onclick="scrollToPost(${postNo})">>>${postNo}</span>`;
    });

    message.innerHTML = `
        ${post.tim ? `
            <img src="${baseUrl}/${board}/src/${post.tim}${post.ext}" alt="Post image" aria-label="Click to view full-size image">
        ` : ''}
        <p>${comment}</p>
        <p class="post-no">Post #${post.no}</p>
    `;

    messageContainer.appendChild(message);
    return messageContainer;
}

function scrollToPost(postNo) {
    const postElement = document.getElementById(`post-${postNo}`);
    if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postElement.classList.add('highlight');
        setTimeout(() => postElement.classList.remove('highlight'), 1000);
    }
}

function goBackToThreads() {
    const postsContainer = document.getElementById('postsContainer');
    const threadView = document.getElementById('threadView');
    postsContainer.classList.remove('d-none');
    threadView.classList.add('d-none');
}

function truncateComment(comment, maxLength) {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
}

// Load threads on page load if a board is pre-selected
if (document.getElementById('boardSelect').value) {
    loadThreads();
}