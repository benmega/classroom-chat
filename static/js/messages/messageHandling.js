/*
File: messageHandling.js
Type: js
Summary: Client-side messaging, conversation refresh, and uploads.
*/

const UPDATE_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export function setupMessagingAndConversation() {
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('message'); // Select the textarea
    if (!messageForm || !messageInput) return;

    // Handle Enter and Shift+Enter
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default newline
            messageForm.requestSubmit(); // Trigger the submit event
        }
    });

    messageForm.addEventListener('submit', e => {
        e.preventDefault();

        const fileInput = document.getElementById('file');
        if (fileInput?.files?.length) {
            uploadFile();
        } else {
            sendMessage();
        }

        updateConversation();
    });

    setInterval(updateConversation, UPDATE_INTERVAL_MS);
    startHeartbeat();
}

function startHeartbeat() {
    setInterval(() => {
        fetch('/session/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).catch(err => console.error('Heartbeat failed:', err));
    }, HEARTBEAT_INTERVAL_MS);
}

export function updateConversation() {
    fetchCurrentConversation()
        .then(data => updateChatUI(data.conversation))
        .catch(err => console.error('Failed to fetch conversation:', err));
}

export function sendMessage() {
    const message = getMessageInput();
    if (!message) {
        showAlert('Message is required.', 'warning');
        return;
    }

    const params = createRequestParams({ message });

    sendRequest('message/send_message', params)
        .then(handleResponse)
        .catch(handleError);

    autoscrollToBottom();
}

function fetchCurrentConversation() {
    return fetch('message/get_current_conversation').then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    });
}

function updateChatUI(conversationData) {
    const chatDiv = document.getElementById('chat');
    if (!chatDiv) return;

    const wasAtBottom =
        chatDiv.scrollHeight - chatDiv.clientHeight <= chatDiv.scrollTop + 1;

    chatDiv.innerHTML = '';

    conversationData.messages
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .forEach(msg => {
            chatDiv.innerHTML += formatMessage({
                nickname: msg.nickname,
                username: msg.username,
                profilePic: msg.user_profile_pic,
                content: msg.content,
            });
        });

    if (wasAtBottom) {
        autoscrollToBottom();
    }
}

function formatMessage({ nickname, username, profilePic, content }) {
    const formattedText = linkify(content.replace(/\n/g, '<br>'));

    const profilePicUrl = `/user/profile_pictures/${profilePic || 'Default_pfp.jpg'}`;
    const profileLink = username ? `/user/profile/${username}` : '#';
    const isSelf = username === getUsername();

    return `
        <div class="chat-message ${isSelf ? 'self' : ''}">
            <a href="${profileLink}">
                <img src="${profilePicUrl}" alt="${nickname}" class="user-profile-pic">
            </a>
            <div class="message-bubble">
                <strong class="username">${nickname}:</strong>
                <span class="message-text">${formattedText}</span>
            </div>
        </div>
    `;
}

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s<]+)|(\bwww\.[^\s<]+(?:\.[^\s<]+)+\b)/g;
    return text.replace(urlRegex, url => {
        const href = url.startsWith('http') ? url : `http://${url}`;
        return `<a href="${href}" target="_blank">${url}</a>`;
    });
}

function autoscrollToBottom() {
    const chatDiv = document.getElementById('chat');
    if (chatDiv) {
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}

function getMessageInput() {
    return document.getElementById('message')?.value.trim() || '';
}

function getUsername() {
    return document.getElementById('currentUsername')?.textContent.trim() || '';
}

function createRequestParams(data) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => params.append(k, v));
    return params;
}

function sendRequest(url, params) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    }).then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw err;
            });
        }
        return response.json();
    });
}

function handleResponse(data) {
    if (data.success) {
        clearMessageInput();
        if (data.system_message) {
            showAlert(data.system_message, 'success');
        }
        return;
    }
    showAlert(data.system_message || data.error || 'Something went wrong.', 'error');
}

function handleError(error) {
    console.error(error);
    showAlert(
        error?.message ? `Error: ${error.message}` : 'An unexpected error occurred.',
        'error'
    );
}

function clearMessageInput() {
    const input = document.getElementById('message');
    if (input) input.value = '';
}

export function uploadFile() {
    const file = document.getElementById('file')?.files?.[0];
    if (!file) return;

    convertFileToBase64(file)
        .then(dataURL =>
            sendJsonRequest('/upload/upload_file', createJSONRequestParams({ file: dataURL }))
        )
        .then(handleUploadResponse)
        .catch(handleError);
}

function createJSONRequestParams(data) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };
}

function sendJsonRequest(url, options) {
    return fetch(url, options).then(r => r.json());
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function handleUploadResponse(data) {
    if (!data.message) {
        showAlert(`Error: ${data.error}`, 'error');
        return;
    }

    showAlert('File uploaded successfully.', 'success');
    const fileInput = document.getElementById('file');
    if (fileInput) fileInput.value = '';f
}

function showAlert(message, icon = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Mr. Mega says',
            text: message,
            icon,
            confirmButtonText: 'OK',
        });
    } else {
        alert(message);
    }
}
