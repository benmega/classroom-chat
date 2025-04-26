// messageHandling.js
const updateInterval = 2000; // Update conversation every 2 seconds

export function setupMessagingAndConversation() {
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
        uploadImage();
        updateConversation();
    });
    setInterval(updateConversation, updateInterval);
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
}

// --- Update conversation helpers ---

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
    console.log(conversationData);

    const chatDiv = document.getElementById('chat');
    if (!chatDiv) {
        console.error('Chat div not found');
        return;
    }

    chatDiv.innerHTML = '';

    conversationData.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    conversationData.messages.forEach(msg => {
        const messageHTML = formatMessage(msg.user_name, msg.content);
        chatDiv.innerHTML += messageHTML;
    });
}

function formatMessage(username, message) {
    message = message.replace(/\n/g, '<br>');

    const urlRegex = /(https?:\/\/[^\s<]+)|(\bwww\.[^\s<]+(?:\.[^\s<]+)+\b)/g;

    const formattedMessage = message.replace(urlRegex, url => {
        const href = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${href}" target="_blank">${url}</a>`;
    });

    return `<p><strong>${username}:</strong> ${formattedMessage}</p>`;
}

function getMessageInput() {
    return document.getElementById('message').value.trim();
}

function getUsername() {
    return document.getElementById('currentUsername').textContent.trim();
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
        if (data.system_message) {
            showAlert(data.system_message, 'success');
            if (data.play_sound) {
                playQuackSound();
            }
        } else {
            clearMessageInput();
        }
    } else {
        showAlert('Error: ' + (data.error || "Something went wrong."), 'error');
    }
}

function playQuackSound() {
    let quack = new Audio("/static/sounds/quack.mp3");
    quack.play().catch(error => console.error("Error playing sound:", error));
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
    document.getElementById('message').value = '';
}

// --- Image upload helpers ---

export function uploadImage() {
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
        showAlert('Image uploaded successfully.', 'success');
        document.getElementById('file').value = '';
    } else {
        showAlert('Error: ' + data.error, 'error');
    }
}

// --- SweetAlert2 wrapper ---
function showAlert(message, icon = 'info') {
    Swal.fire({
        title: 'Mr. Mega says',
        text: message,
        icon: icon,
        confirmButtonText: 'OK'
    });
}
