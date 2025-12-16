/*
File: messageHandling.js
Type: js
Summary: Client-side messaging logic, conversation refresh, and file uploads.
*/

const updateInterval = 2000;

export function setupMessagingAndConversation() {
    const messageForm = document.getElementById('messageForm'); // Ensure this ID matches your HTML form
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Only try to upload if there's a file selected
            const fileInput = document.getElementById('file');

            if (fileInput && fileInput.files.length > 0) {
                uploadFile();
            } else {
                sendMessage();
            }

            // updateConversation will now call autoscrollToBottom
            updateConversation();
        });
    }

    setInterval(updateConversation, updateInterval);
    startHeartbeat();
}

function startHeartbeat() {
    setInterval(() => {
        fetch('/session/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).catch(err => console.error('Heartbeat failed:', err));
    }, 15000);
}


export function updateConversation() {
    fetchCurrentConversation()
        .then(data => {
            updateChatUI(data.conversation);
        })
        .catch(error => {
            console.error('Failed to fetch conversation:', error);
        });
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
    // Add autoscroll after sending a message to see the new message immediately
    autoscrollToBottom();
}

function fetchCurrentConversation() {
    return fetch('message/get_current_conversation')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

function updateChatUI(conversationData) {
    const chatDiv = document.getElementById('chat');
    if (!chatDiv) {
        console.error('Chat div not found');
        return;
    }

    // Check if the user is already near the bottom before updating
    const isScrolledToBottom = chatDiv.scrollHeight - chatDiv.clientHeight <= chatDiv.scrollTop + 1;

    chatDiv.innerHTML = '';

    conversationData.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    conversationData.messages.forEach(msg => {
        // Pass msg.username (handle) to the format function
        const messageHTML = formatMessage(msg.user_name, msg.user_profile_pic, msg.content, msg.username);
        chatDiv.innerHTML += messageHTML;
    });

    if (isScrolledToBottom) {
        autoscrollToBottom();
    }
}

function formatMessage(displayName, profilePicFilename, message, handle) {
    // Replace newlines with break tags
    message = message.replace(/\n/g, '<br>');

    // Regex to auto-link URLs
    const urlRegex = /(https?:\/\/[^\s<]+)|(\bwww\.[^\s<]+(?:\.[^\s<]+)+\b)/g;
    const formattedMessage = message.replace(urlRegex, url => {
        const href = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${href}" target="_blank">${url}</a>`;
    });

    const profilePicUrl = `/user/profile_pictures/${profilePicFilename || 'Default_pfp.jpg'}`;
    // Construct link using the handle (username)
    const profileLink = handle ? `/user/profile/${handle}` : '#';

    const isSelf = displayName === getUsername();

    return `
        <div class="chat-message ${isSelf ? 'self' : ''}">
            <a href="${profileLink}">
                <img src="${profilePicUrl}" alt="${displayName}" class="user-profile-pic">
            </a>
            <div class="message-bubble">
                <strong class="username">${displayName}:</strong>
                <span class="message-text">${formattedMessage}</span>
            </div>
        </div>
    `;
}

/**
 * Scrolls the chat container to the bottom.
 */
function autoscrollToBottom() {
    const chatDiv = document.getElementById('chat');
    if (chatDiv) {
        // Scroll the element's content to the maximum possible position
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}

function getMessageInput() {
    return document.getElementById('message').value.trim();
}

function getUsername() {
    // Ensure this element exists in your HTML
    const el = document.getElementById('currentUsername');
    return el ? el.textContent.trim() : '';
}

function createRequestParams(data) {
    const params = new URLSearchParams();
    Object.keys(data).forEach(key => params.append(key, data[key]));
    return params;
}

function sendRequest(url, params) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    }).then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw errorData;
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
    } else {
        showAlert((data.system_message || data.error || "Something went wrong."), 'error');
    }
}

function handleError(error) {
    console.error('Error:', error);
    if (error && error.message) {
        showAlert('Error: ' + error.message, 'error');
    } else {
        showAlert('An unexpected error occurred.', 'error');
    }
}

function clearMessageInput() {
    const msgInput = document.getElementById('message');
    if(msgInput) msgInput.value = '';
}

export function uploadFile() {
    const file = getImageFile();

    if (!file) return;

    convertFileToBase64(file)
        .then(dataURL => {
            const params = createJSONRequestParams({ file: dataURL });
            return sendJsonRequest('/upload/upload_file', params);
        })
        .then(handleUploadResponse)
        .catch(handleError);
}

function createJSONRequestParams(data) {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
}

function sendJsonRequest(url, data) {
    return fetch(url, data).then(response => response.json());
}

function getImageFile() {
    return document.getElementById('file').files[0];
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
    if (data.message) {
        console.log(data.message);
        showAlert('File uploaded successfully.', 'success');
        const fileInput = document.getElementById('file');
        if(fileInput) fileInput.value = '';
    } else {
        showAlert('Error: ' + data.error, 'error');
    }
}

function showAlert(message, icon = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Mr. Mega says',
            text: message,
            icon: icon,
            confirmButtonText: 'OK'
        });
    } else {
        alert(message);
    }
}