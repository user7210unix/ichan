const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_BASE = 'https://a.4cdn.org/';
const IMG_BASE = 'https://i.4cdn.org/';


// Fetch boards list
async function fetchBoards() {
    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}boards.json`);
        const data = await response.json();
        displayBoards(data.boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        document.getElementById('board-list').innerHTML = '<li>Error loading boards</li>';
    }
}

// Display boards in sidebar
function displayBoards(boards) {
    const boardList = document.getElementById('board-list');
    boardList.innerHTML = '';
    boards.forEach(board => {
        const li = document.createElement('li');
        li.textContent = `/${board.board}/ - ${board.title}`;
        li.dataset.board = board.board;
        li.addEventListener('click', () => loadThreads(board.board));
        boardList.appendChild(li);
    });
}

// Load threads for a selected board
async function loadThreads(board) {
    document.querySelectorAll('#board-list li').forEach(li => li.classList.remove('active'));
    document.querySelector(`#board-list li[data-board="${board}"]`).classList.add('active');
    document.getElementById('thread-title').textContent = `/${board}/ Threads`;
    document.getElementById('thread-list').innerHTML = '<p>Loading threads...</p>';

    try {
        const response = await fetch(`${CORS_PROXY}${API_BASE}${board}/catalog.json`);
        const data = await response.json();
        displayThreads(data, board);
    } catch (error) {
        console.error('Error fetching threads:', error);
        document.getElementById('thread-list').innerHTML = '<p>Error loading threads</p>';
    }
}

// Display threads with comment previews
async function displayThreads(pages, board) {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = '';

    for (const page of pages) {
        for (const thread of page.threads) {
            const threadDiv = document.createElement('div');
            threadDiv.className = 'thread';
            threadDiv.addEventListener('click', () => {
                window.location.href = `thread.html?board=${board}&thread=${thread.no}`;
            });

            // Thread text
            const text = thread.com || thread.sub || 'No comment';
            const textP = document.createElement('p');
            textP.innerHTML = text.replace(/<[^>]+>/g, '');
            threadDiv.appendChild(textP);

            // Thread image
            if (thread.tim && thread.ext) {
                const img = document.createElement('img');
                img.src = `${CORS_PROXY}${IMG_BASE}${board}/${thread.tim}${thread.ext}`;
                img.alt = 'Thread image';
                img.onerror = () => { img.style.display = 'none'; }; // Hide broken images
                threadDiv.appendChild(img);
            }

            // Fetch thread for comment previews
            try {
                const threadResponse = await fetch(`${CORS_PROXY}${API_BASE}${board}/thread/${thread.no}.json`);
                const threadData = await threadResponse.json();
                const comments = threadData.posts.slice(1, 4); // Get up to 3 replies
                comments.forEach(comment => {
                    if (comment.com) {
                        const commentP = document.createElement('p');
                        commentP.className = 'comment-preview';
                        commentP.innerHTML = comment.com.replace(/<[^>]+>/g, '');
                        threadDiv.appendChild(commentP);
                    }
                });
            } catch (error) {
                console.error('Error fetching comment previews:', error);
            }

            threadList.appendChild(threadDiv);
        }
    }
}

// Initialize
fetchBoards();
