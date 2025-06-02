const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_BASE = 'https://a.4cdn.org/';
const IMG_BASE = 'https://i.4cdn.org/';

// Get board and thread from URL
const urlParams = new URLSearchParams(window.location.search);
const board = urlParams.get('board');
const threadNo = urlParams.get('thread');

// Load thread content
async function loadThread() {
    document.getElementById('thread-title').textContent = `/${board}/ Thread #${threadNo}`;
    const threadContent = document.getElementById('thread-content');
    threadContent.innerHTML = '<p>Loading thread...</p>';

    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${board}/thread/${threadNo}.json`);
        const data = await response.json();
        displayThread(data.posts, board);
    } catch (error) {
        console.error('Error fetching thread:', error);
        threadContent.innerHTML = '<p>Error loading thread</p>';
    }
}

// Display thread posts
function displayThread(posts, board) {
    const threadContent = document.getElementById('thread-content');
    threadContent.innerHTML = '';

    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'thread';

        // Post text
        const text = post.com || post.sub || 'No comment';
        const textP = document.createElement('p');
        textP.innerHTML = text.replace(/<[^>]+>/g, '');
        postDiv.appendChild(textP);

        // Post image
        if (post.tim && post.ext) {
            const img = document.createElement('img');
            img.src = `${CORS_PROXY}${IMG_BASE}${board}/${post.tim}${post.ext}`;
            img.alt = 'Post image';
            img.onerror = () => { img.style.display = 'none'; }; // Hide broken images
            postDiv.appendChild(img);
        }

        threadContent.appendChild(postDiv);
    });
}

// Initialize
loadThread();
